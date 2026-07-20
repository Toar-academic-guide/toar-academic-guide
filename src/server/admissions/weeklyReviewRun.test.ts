import { describe, expect, it } from 'vitest';

import {
  buildAdmissionsReviewRun,
  buildAdmissionsReviewSlackMessage,
  type PublishedAdmissionRule,
} from './weeklyReviewRun';

const baseline: PublishedAdmissionRule[] = [
  {
    target: { institutionId: 'tau', programId: 'tau_digital_sciences', cycle: '2027' },
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
      programId: 'tau_digital_sciences',
      programName: 'Digital Sciences',
      acceptanceThreshold: 695,
    },
    limitations: [],
    nextAction: 'Review changed threshold before publication',
    ...overrides,
  };
}

describe('weekly admissions review run', () => {
  it('turns a safe changed proof into one deterministic manifest change and human handoff', () => {
    const run = buildAdmissionsReviewRun({
      runKey: '2026-W30',
      checkedAt: new Date('2026-07-19T03:00:00.000Z'),
      cycle: '2027',
      baseline,
      proofs: [decisionProof()],
    });

    expect(run.manifest).toMatchObject({
      version: 1,
      changes: [
        {
          target: { institutionId: 'tau', programId: 'tau_digital_sciences', cycle: '2027' },
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

  it('uses one stable Slack summary for a reviewable run and one no-change summary without a PR', () => {
    const reviewable = buildAdmissionsReviewRun({
      runKey: '2026-W30',
      checkedAt: new Date('2026-07-19T03:00:00.000Z'),
      cycle: '2027',
      baseline,
      proofs: [decisionProof()],
    });
    const noChange = buildAdmissionsReviewRun({
      runKey: '2026-W31',
      checkedAt: new Date('2026-07-26T03:00:00.000Z'),
      cycle: '2027',
      baseline,
      proofs: [
        decisionProof({
          normalizedPayload: { programId: 'tau_digital_sciences', acceptanceThreshold: 700 },
        }),
      ],
    });

    expect(
      buildAdmissionsReviewSlackMessage(reviewable, {
        pullRequestUrl: 'https://github.com/Toar-academic-guide/toar-academic-guide/pull/95',
      }).text,
    ).toContain('pull/95');
    expect(buildAdmissionsReviewSlackMessage(noChange).text).toContain('No review PR was created');
  });
});
