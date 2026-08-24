import { describe, expect, it } from 'vitest';

import {
  buildAdmissionsReviewRun,
  buildAdmissionsReviewSlackMessage,
  type PublishedAdmissionRule,
} from './weeklyReviewRun';
import { FORMULA_BACKED_VERIFICATION_LEDGER } from '@/data/admissions/formulaBackedVerificationLedger';

const baseline: PublishedAdmissionRule[] = [
  {
    target: { institutionId: 'tau', programId: 'tau_datascience', cycle: '2027' },
    ruleKind: 'admission_cutoff',
    value: 700,
  },
];

function decisionProof(overrides: Record<string, unknown> = {}) {
  return {
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
    normalizedPayload: {
      programId: 'tau_datascience',
      programName: 'Digital Sciences',
      acceptanceThreshold: 695,
    },
    limitations: [],
    nextAction: 'Review changed threshold before publication',
    ...overrides,
  };
}

describe('weekly admissions review run', () => {
  const exactTauLedger = FORMULA_BACKED_VERIFICATION_LEDGER.map((entry) =>
    entry.pairId === 'tau_datascience__tau' ? { ...entry, state: 'exact' as const } : entry,
  );

  it('turns a safe changed proof into one deterministic manifest change and human handoff', () => {
    const run = buildAdmissionsReviewRun({
      runKey: '2026-W30',
      checkedAt: new Date('2026-07-19T03:00:00.000Z'),
      cycle: '2027',
      baseline,
      proofs: [decisionProof()],
      verificationLedger: exactTauLedger,
    });

    expect(run.manifest).toMatchObject({
      version: 2,
      releaseKind: 'canonical_change',
      changes: [
        {
          target: { institutionId: 'tau', programId: 'tau_datascience', cycle: '2027' },
          ruleKind: 'admission_cutoff',
          before: 700,
          after: 695,
        },
      ],
    });
    expect(run.summary).toMatchObject({
      candidateCount: 1,
      excludedCount: 0,
      status: 'reviewable',
    });
    expect(run.markdown).toContain('Tel Aviv University');
    expect(run.markdown).toContain('700 → 695');
    expect(run.markdown).toContain('tau-digital-sciences-live:admission_cutoff');
    expect(run.markdown).not.toContain('selectedScore');
  });

  it('keeps partial, failed, and baselineless proofs out of the manifest while making them review-visible', () => {
    const run = buildAdmissionsReviewRun({
      runKey: '2026-W30',
      checkedAt: new Date('2026-07-19T03:00:00.000Z'),
      cycle: '2027',
      baseline: [],
      proofs: [
        decisionProof({ id: 'tau-no-baseline' }),
        decisionProof({ id: 'bgu-score-only', capability: 'score_only', status: 'partial' }),
        decisionProof({ id: 'tau-failed', status: 'failed', errorReason: 'endpoint timeout' }),
      ],
      verificationLedger: exactTauLedger,
    });

    expect(run.manifest.changes).toEqual([]);
    expect(run.summary).toMatchObject({
      candidateCount: 0,
      excludedCount: 3,
      status: 'no_changes',
    });
    expect(run.excluded.map((item) => item.reason)).toEqual([
      'proof_not_decision_capable',
      'proof_not_decision_capable',
      'no_reviewed_baseline',
    ]);
    expect(run.markdown).toContain('endpoint timeout');
  });

  it('keeps an explicitly reviewer-excluded safe candidate out of the generated manifest', () => {
    const run = buildAdmissionsReviewRun({
      runKey: '2026-W30',
      checkedAt: new Date('2026-07-19T03:00:00.000Z'),
      cycle: '2027',
      baseline,
      proofs: [decisionProof()],
      excludedCandidateIds: ['tau-digital-sciences-live:admission_cutoff'],
      verificationLedger: exactTauLedger,
    });

    expect(run.manifest.changes).toEqual([]);
    expect(run.summary).toMatchObject({
      candidateCount: 0,
      excludedCount: 1,
      status: 'no_changes',
    });
    expect(run.excluded).toMatchObject([
      {
        sourceProofId: 'tau-digital-sciences-live',
        reason: 'reviewer_excluded',
      },
    ]);
    expect(run.reviewMetadata).toEqual({
      version: 1,
      runKey: '2026-W30',
      excludedCandidateIds: ['tau-digital-sciences-live:admission_cutoff'],
    });
    expect(run.markdown).toContain('reviewer_excluded');
    expect(run.markdown).toContain('tau-digital-sciences-live:admission_cutoff');
  });

  it('uses one stable Slack summary for a reviewable run and one no-change summary without a PR', () => {
    const reviewable = buildAdmissionsReviewRun({
      runKey: '2026-W30',
      checkedAt: new Date('2026-07-19T03:00:00.000Z'),
      cycle: '2027',
      baseline,
      proofs: [decisionProof()],
      verificationLedger: exactTauLedger,
    });
    const noChange = buildAdmissionsReviewRun({
      runKey: '2026-W31',
      checkedAt: new Date('2026-07-26T03:00:00.000Z'),
      cycle: '2027',
      baseline,
      proofs: [
        decisionProof({
          normalizedPayload: { programId: 'tau_datascience', acceptanceThreshold: 700 },
        }),
      ],
      verificationLedger: exactTauLedger,
    });

    expect(
      buildAdmissionsReviewSlackMessage(reviewable, {
        pullRequestUrl: 'https://github.com/Toar-academic-guide/toar-academic-guide/pull/95',
      }).text,
    ).toContain('pull/95');
    expect(buildAdmissionsReviewSlackMessage(noChange).text).toContain('No review PR was created');
  });

  it('creates a bootstrap manifest for unchanged current official values', () => {
    const run = buildAdmissionsReviewRun({
      runKey: 'bootstrap-2027',
      checkedAt: new Date('2026-07-19T03:00:00.000Z'),
      cycle: '2027',
      releaseKind: 'canonical_bootstrap',
      baseline,
      proofs: [
        decisionProof({
          normalizedPayload: { programId: 'tau_datascience', acceptanceThreshold: 700 },
        }),
      ],
      verificationLedger: exactTauLedger,
    });

    expect(run.manifest).toMatchObject({
      version: 2,
      releaseKind: 'canonical_bootstrap',
      changes: [{ before: 700, after: 700 }],
    });
    expect(run.summary.status).toBe('reviewable');
  });
});
