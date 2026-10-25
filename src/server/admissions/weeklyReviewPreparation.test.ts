import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/data/admissions/reviewedManifest.json', async () => ({
  default: (await import('./__fixtures__/technionWinterManifest.json')).default,
}));

import {
  createAdmissionsWeeklyReviewPreparer,
  type PublishedAdmissionRuleRepository,
} from './weeklyReviewPreparation';
import type { PublishedAdmissionRule } from './weeklyReviewRun';
import type { AdmissionsLiveProofReport } from '@/server/ingestion/admissionsLiveProofRunner';
import type {
  AdmissionsSourceFreshnessRunResult,
  AdmissionsSourceFreshnessRunnerOptions,
} from '@/server/ingestion/admissionsSourceFreshnessRunner';
import { FORMULA_BACKED_VERIFICATION_LEDGER } from '@/data/admissions/formulaBackedVerificationLedger';
import technionWinterManifest from './__fixtures__/technionWinterManifest.json';

const proof = {
  id: 'tau-digital-sciences-live',
  institutionId: 'tau',
  institutionName: 'Tel Aviv University',
  officialUrl: 'https://go.tau.ac.il/graphql',
  adapterId: 'tau' as const,
  capability: 'decision_capable' as const,
  proofLevel: 'exact_official' as const,
  status: 'succeeded' as const,
  sourceClass: 'api_static_json' as const,
  reproducedFields: ['acceptanceThreshold'],
  normalizedPayload: { programId: 'tau_datascience', acceptanceThreshold: 695 },
  limitations: [],
  nextAction: 'Review changed threshold before publication',
};

function report(): AdmissionsLiveProofReport {
  return {
    summary: { total: 1, exactReproduced: 1, partial: 0, blocked: 0, failed: 0 },
    results: [{ proof, freshness: null }],
  };
}

describe('admissions weekly review preparation', () => {
  const exactTauLedger = FORMULA_BACKED_VERIFICATION_LEDGER.map((entry) =>
    entry.pairId === 'tau_datascience__tau' ? { ...entry, state: 'exact' as const } : entry,
  );

  it('loads the existing reviewed manifest into the weekly run output before the workflow overwrites it', async () => {
    const civilProof = {
      ...proof,
      id: 'technion-technion_civil-live',
      institutionId: 'technion',
      institutionName: 'Technion',
      officialUrl: 'https://admissions.technion.ac.il/sechem-for-admission/',
      adapterId: 'technion' as const,
      normalizedPayload: { programId: 'technion_civil', acceptanceThreshold: 87 },
    };
    const result = await createAdmissionsWeeklyReviewPreparer({
      sourceRunner: async () => ({
        report: { ...report(), results: [{ proof: civilProof, freshness: null }] },
        persistence: null,
      }),
      baselineRepository: {
        listPublishedRules: async () => [
          {
            target: { institutionId: 'technion', programId: 'technion_civil', cycle: '2027' },
            ruleKind: 'admission_cutoff',
            value: 88,
          },
        ],
      },
      verificationLedger: FORMULA_BACKED_VERIFICATION_LEDGER.map((entry) =>
        entry.pairId === 'technion_civil__technion' ? { ...entry, state: 'exact' as const } : entry,
      ),
    }).prepare({
      runKey: '2026-W43',
      cycle: '2027',
      checkedAt: new Date('2026-10-25T03:00:00.000Z'),
    });

    expect(result.run.manifest.changes).toHaveLength(5);
    expect(result.run.manifest.changes.slice(0, 4)).toEqual(technionWinterManifest.changes);
    expect(result.run.manifest.changes[4]).toMatchObject({
      target: { institutionId: 'technion', programId: 'technion_civil', cycle: '2027' },
      before: 88,
      after: 87,
    });
    expect(result.run.summary).toMatchObject({ status: 'reviewable', candidateCount: 1 });
  });

  it('persists source freshness first, then compares only against published reviewed rules', async () => {
    const sourceRunner = vi.fn<
      (
        options: AdmissionsSourceFreshnessRunnerOptions,
      ) => Promise<AdmissionsSourceFreshnessRunResult>
    >(async () => ({ report: report(), persistence: null }));
    const baselineRepository: PublishedAdmissionRuleRepository = {
      listPublishedRules: vi.fn(
        async () =>
          [
            {
              target: { institutionId: 'tau', programId: 'tau_datascience', cycle: '2027' },
              ruleKind: 'admission_cutoff' as const,
              value: 700,
            },
          ] satisfies PublishedAdmissionRule[],
      ),
    };
    const preparer = createAdmissionsWeeklyReviewPreparer({
      sourceRunner,
      baselineRepository,
      verificationLedger: exactTauLedger,
      reviewedManifest: { version: 2, releaseKind: 'canonical_change', changes: [] },
    });

    const result = await preparer.prepare({
      runKey: '2026-W30',
      cycle: '2027',
      checkedAt: new Date('2026-07-19T03:00:00.000Z'),
    });

    expect(sourceRunner).toHaveBeenCalledWith(
      expect.objectContaining({ checkedAt: new Date('2026-07-19T03:00:00.000Z') }),
    );
    expect(baselineRepository.listPublishedRules).toHaveBeenCalledWith({ cycle: '2027' });
    expect(result.run.manifest.changes).toMatchObject([{ before: 700, after: 695 }]);
    expect(result.persistence).toBeNull();
  });

  it('uses the currently applied canonical threshold as the bootstrap baseline', async () => {
    const sourceRunner = vi.fn<
      (
        options: AdmissionsSourceFreshnessRunnerOptions,
      ) => Promise<AdmissionsSourceFreshnessRunResult>
    >(async () => ({ report: report(), persistence: null }));
    const baselineRepository: PublishedAdmissionRuleRepository = {
      listPublishedRules: vi.fn(async () => []),
      listCurrentCanonicalRules: vi.fn(
        async () =>
          [
            {
              target: { institutionId: 'tau', programId: 'tau_datascience', cycle: '2027' },
              ruleKind: 'admission_cutoff' as const,
              value: 695,
            },
          ] satisfies PublishedAdmissionRule[],
      ),
    };

    const result = await createAdmissionsWeeklyReviewPreparer({
      sourceRunner,
      baselineRepository,
      verificationLedger: exactTauLedger,
      reviewedManifest: { version: 2, releaseKind: 'canonical_bootstrap', changes: [] },
    }).prepare({
      runKey: 'bootstrap-2027',
      cycle: '2027',
      releaseKind: 'canonical_bootstrap',
      checkedAt: new Date('2026-07-19T03:00:00.000Z'),
    });

    expect(baselineRepository.listCurrentCanonicalRules).toHaveBeenCalledWith({ cycle: '2027' });
    expect(result.run.manifest).toMatchObject({
      releaseKind: 'canonical_bootstrap',
      changes: [{ before: 695, after: 695 }],
    });
  });
});
