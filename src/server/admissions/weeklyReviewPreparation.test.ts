import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

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
});
