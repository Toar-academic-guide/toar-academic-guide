import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import { getFormulaPairVerificationEntry } from '@/data/admissions/formulaBackedVerificationLedger';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import { findAdmissionsEvaluationProgram } from '@/lib/admissionsEvaluationProgram';
import { evaluateAdmissionsForProgram } from './evaluator';
import {
  buildAdmissionsCapabilityMatrix,
  loadFreshnessStatesBySourceIds,
} from './capabilityMatrix';
import { evaluateProgramVerification } from './verification/programVerification';

const offline = vi.hoisted(() => ({
  getDb: vi.fn(() => {
    throw new Error('Offline authority regression: database access denied');
  }),
  fetch: vi.fn<typeof fetch>(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/db/client', () => ({ getDb: offline.getDb }));
// Select the CI catalogue mode without changing any environment variable.
vi.mock('@/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/env')>()),
  getCatalogueSourceMode: () => 'static',
}));

beforeEach(() => {
  offline.getDb.mockClear();
  offline.fetch.mockReset().mockRejectedValue(new Error('Network access denied'));
  vi.stubGlobal('fetch', offline.fetch);
});

afterEach(() => vi.unstubAllGlobals());

const csInput = {
  degreeId: 'haifa_cs',
  psychometric: 800,
  extraInputs: {
    haifaBagrutAverage: 120,
    haifaBagrutYear: 2026,
    haifaPsychometricYear: 2026,
    haifaHebrewQualification: 'hebrew_school' as const,
    mathUnits: 5,
    mathGrade: 75,
    psychometricMath: 150,
    psychometricVerbal: 150,
    psychometricEnglish: 150,
  },
};

it('withholds the real Haifa CS vector when database authority is unavailable despite valid shipped verification', async () => {
  const [programs, institutions] = await Promise.all([
    listCataloguePrograms(),
    listCatalogueInstitutions(),
  ]);
  expect(programs.meta.catalogueSourceMode).toBe('static');
  const program = findAdmissionsEvaluationProgram(programs.data, csInput.degreeId)!;
  expect(program).toBeDefined();
  const artifact = getProgramVerificationArtifact('haifa_cs__haifa')!;
  expect(
    evaluateProgramVerification({
      contract: artifact.contract,
      fixtures: artifact.fixtures,
      currentAdmissionCycle: artifact.contract.admissionCycle,
      currentSourceFingerprint: artifact.contract.sourceFingerprint,
    }),
  ).toMatchObject({ capability: 'exact', state: 'exact' });
  expect(getFormulaPairVerificationEntry('haifa_cs__haifa')?.state).toBe('exact');

  // This is the real DB loader; its I/O boundary denies access, never supplies exact rows.
  const freshness = await loadFreshnessStatesBySourceIds([artifact.contract.source.targetId]);
  expect(freshness.status).toBe('unavailable');
  expect(freshness.states.size).toBe(0);
  const [entry] = buildAdmissionsCapabilityMatrix({
    program,
    institutions: institutions.data,
    input: csInput.extraInputs,
    freshnessStatesBySourceId: freshness.states,
    freshnessAuthorityUnavailable: freshness.status === 'unavailable',
  });
  expect(entry).toMatchObject({
    formulaPairScope: 'in_scope',
    pairVerification: { state: 'exact' },
    capability: 'authority_unavailable',
    freshnessState: undefined,
  });

  // DB-gated at capabilityMatrix.ts:859, not stale checked-in fixtures. Cutoff
  // publication alone does not refresh source_freshness_states authority.
  const report = await evaluateAdmissionsForProgram({
    program,
    institutions: institutions.data,
    input: csInput,
    now: new Date('2026-10-29T12:00:00Z'),
  });
  expect(report.results).toHaveLength(1);
  // Approved test update, Jorje 2026-10-31: missing subject rows prevent scoring independently of database authority.
  expect(report.results[0]).toMatchObject({
    linkedInstitutionId: 'haifa',
    capability: 'tracked_missing_rule',
    kind: 'tracked_missing_rule',
    decision: 'unknown',
  });
  // Approved test update, Jorje 2026-10-31: ignoring the legacy average reports missing calculation inputs rather than an authority degradation.
  expect(report.results[0].degradationReason).toBeUndefined();
  expect(report.results[0].score).toBeUndefined();
  expect(offline.getDb).toHaveBeenCalled();
  expect(offline.fetch).not.toHaveBeenCalled();
});
