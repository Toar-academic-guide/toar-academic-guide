import { beforeEach, describe, expect, it, vi } from 'vitest';
import feed from '@/test/fixtures/hujiPsychology2027.json';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';
import type { SourceFreshnessStateRow } from '@/db/types';
import type { AdmissionsEvaluationReport } from '@/types/admissionsEvaluation';

const captured = vi.hoisted(() => ({ reports: [] as AdmissionsEvaluationReport[] }));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms() }),
  listCatalogueInstitutions: async () => ({
    data: getStaticCatalogueInstitutions().filter((row) => row.id === 'huji'),
  }),
}));
// Keep the evaluator and HUJI adapter real; replace only official transport and freshness reads.
vi.mock('@/server/admissions/evaluator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/admissions/evaluator')>();
  return {
    ...actual,
    evaluateAdmissionsForProgram: async (
      args: Parameters<typeof actual.evaluateAdmissionsForProgram>[0],
    ) => {
      const artifact = getProgramVerificationArtifact(`${args.program.id}__huji`)!;
      const sourceId = artifact.contract.source.targetId;
      const now = new Date();
      const state: SourceFreshnessStateRow = {
        sourceId,
        sourceClass: 'api_static_json',
        capability: 'decision_capable',
        status: 'fresh',
        proofLevel: 'exact_official',
        decisionProvenance: 'verified_derivation',
        reviewedSourceFingerprint: artifact.contract.sourceFingerprint,
        normalizedFingerprint: artifact.contract.sourceFingerprint,
        lastCheckedAt: now,
        lastSuccessfulCheckAt: now,
        lastExactCheckAt: now,
        lastChangedAt: null,
        latestFailureReason: null,
        blockedReason: null,
        rawFingerprint: null,
        normalizedDecisionPayload: {},
        latestReviewItemId: null,
        nextAction: null,
        createdAt: now,
        updatedAt: now,
      };
      const report = await actual.evaluateAdmissionsForProgram({
        ...args,
        freshnessStatesBySourceId: new Map([[sourceId, state]]),
        fetcher: async () => new Response(JSON.stringify(feed)),
      });
      captured.reports.push(report);
      return report;
    },
  };
});

import { POST } from './route';

async function request(body: unknown) {
  const response = await POST(
    new Request('http://localhost/api/admissions/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  expect(response.status).toBe(200);
  return (await response.json()).data;
}

describe('HUJI score serialization through the real evaluate route', () => {
  beforeEach(() => {
    resetAdmissionsEvaluationRateLimitForTests();
    captured.reports = [];
  });

  it.each(['single', 'batch'])(
    'rounds only the %s wire score after real evaluation',
    async (mode) => {
      const body = { psychometric: 660, bagrut: 90 };
      const data = await request(
        mode === 'single'
          ? { ...body, degreeId: 'huji_psychology' }
          : { ...body, degreeIds: ['huji_psychology'] },
      );
      const report: AdmissionsEvaluationReport =
        mode === 'single' ? data : data.reports.huji_psychology;
      const raw = captured.reports[0];
      expect(raw.results[0].score).toBeCloseTo(19.71195484, 8);
      expect(raw.results[0].score).not.toBe(19.71);
      expect(report).toEqual(
        JSON.parse(JSON.stringify({ ...raw, results: [{ ...raw.results[0], score: 19.71 }] })),
      );
      expect(report.results[0]).toMatchObject({ decision: 'below', threshold: 22.5 });
      expect(report.results[0].snapshot).toEqual(raw.results[0].snapshot);
    },
  );

  it('preserves direct psychometric scores and the intentionally numberless Kidum route', async () => {
    const direct = await request({ degreeId: 'huji_psychology', psychometric: 730, bagrut: 80 });
    expect(direct.results[0]).toMatchObject({ score: 730, threshold: 725, decision: 'accepted' });
    const kidum = await request({ degreeId: 'huji_psychology', psychometric: 700, bagrut: 90 });
    expect(kidum.results[0]).toMatchObject({ kind: 'manual_gate', decision: 'unknown' });
    expect(kidum.results[0].score).toBeUndefined();
    expect(kidum.results[0].threshold).toBeUndefined();
    expect(kidum.results[0].deltaNeeded).toBeUndefined();
  });
});
