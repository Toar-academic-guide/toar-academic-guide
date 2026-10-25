import { describe, expect, it } from 'vitest';

import {
  buildAdmissionsReviewRun,
  buildAdmissionsReviewSlackMessage,
  type PublishedAdmissionRule,
} from './weeklyReviewRun';
import { FORMULA_BACKED_VERIFICATION_LEDGER } from '@/data/admissions/formulaBackedVerificationLedger';
import technionWinterManifest from './__fixtures__/technionWinterManifest.json';
import type { ReviewedAdmissionsManifest } from './reviewedManifest';

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

  it('carries forward every reviewed winter change and alias when adding a new change', () => {
    const reviewedManifest = structuredClone(technionWinterManifest) as ReviewedAdmissionsManifest;
    const original = structuredClone(reviewedManifest);
    const run = buildAdmissionsReviewRun({
      runKey: '2026-W43',
      checkedAt: new Date('2026-10-25T03:00:00.000Z'),
      cycle: '2027',
      baseline,
      proofs: [decisionProof()],
      verificationLedger: exactTauLedger,
      reviewedManifest,
    });

    expect(run.manifest.changes).toHaveLength(5);
    expect(run.manifest.changes.slice(0, 4)).toEqual(original.changes);
    expect(run.manifest.changes[4]).toMatchObject({
      target: baseline[0].target,
      before: 700,
      after: 695,
    });
    expect(reviewedManifest).toEqual(original);
    expect(run.summary).toMatchObject({ status: 'reviewable', candidateCount: 1 });
  });

  it('replaces an existing target and rule without duplicating it or changing aliases', () => {
    const existingChange = {
      ...technionWinterManifest.changes[0],
      target: baseline[0].target,
      before: 710,
      after: 700,
    };
    const reviewedManifest = {
      ...technionWinterManifest,
      changes: [...technionWinterManifest.changes, existingChange],
    } as ReviewedAdmissionsManifest;
    const run = buildAdmissionsReviewRun({
      runKey: '2026-W43',
      checkedAt: new Date('2026-10-25T03:00:00.000Z'),
      cycle: '2027',
      baseline,
      proofs: [decisionProof(), decisionProof()],
      verificationLedger: exactTauLedger,
      reviewedManifest,
    });

    expect(run.manifest.changes).toHaveLength(5);
    expect(run.manifest.changes.slice(0, 4)).toEqual(technionWinterManifest.changes);
    expect(run.manifest.changes[4]).toMatchObject({
      target: baseline[0].target,
      before: 700,
      after: 695,
      effectiveFrom: '2026-10-25',
    });
    expect(run.manifest.changes[4].sourceProofs[0].sourceId).toBe('tau-digital-sciences-live');
  });

  it.each(['unchanged', 'reviewer_excluded', 'absent'])(
    'retains reviewed entries when a new proof is %s',
    (scenario) => {
      const reviewedManifest = {
        ...technionWinterManifest,
        changes: [
          ...technionWinterManifest.changes,
          {
            ...technionWinterManifest.changes[0],
            target: baseline[0].target,
            before: 710,
            after: 700,
          },
        ],
      } as ReviewedAdmissionsManifest;
      const run = buildAdmissionsReviewRun({
        runKey: '2026-W43',
        checkedAt: new Date('2026-10-25T03:00:00.000Z'),
        cycle: '2027',
        baseline,
        proofs:
          scenario === 'absent'
            ? []
            : [
                decisionProof({
                  normalizedPayload: {
                    programId: 'tau_datascience',
                    acceptanceThreshold: scenario === 'unchanged' ? 700 : 695,
                  },
                }),
              ],
        excludedCandidateIds: ['tau-digital-sciences-live:admission_cutoff'],
        verificationLedger: exactTauLedger,
        reviewedManifest,
      });

      expect(run.manifest.changes).toEqual(reviewedManifest.changes);
      expect(run.summary).toMatchObject({ status: 'no_changes', candidateCount: 0 });
    },
  );

  it('preserves other rule kinds and opaque future entries verbatim', () => {
    const otherRule = {
      ...technionWinterManifest.changes[0],
      target: baseline[0].target,
      ruleKind: 'minimum_gate',
      before: 80,
      after: 85,
    };
    const futureEntry = { kind: 'canonical_change', payload: { retained: ['verbatim'] } };
    const reviewedManifest = {
      ...technionWinterManifest,
      changes: [...technionWinterManifest.changes, otherRule, futureEntry],
    } as unknown as ReviewedAdmissionsManifest;
    const run = buildAdmissionsReviewRun({
      runKey: '2026-W43',
      checkedAt: new Date('2026-10-25T03:00:00.000Z'),
      cycle: '2027',
      baseline,
      proofs: [decisionProof()],
      verificationLedger: exactTauLedger,
      reviewedManifest,
    });

    expect(run.manifest.changes).toHaveLength(7);
    expect(run.manifest.changes.slice(0, 6)).toEqual(reviewedManifest.changes);
  });

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

  it('keeps HUJI formula-score thresholds out of the integer cutoff manifest', () => {
    const run = buildAdmissionsReviewRun({
      runKey: '2026-W30',
      checkedAt: new Date('2026-07-19T03:00:00.000Z'),
      cycle: '2027',
      baseline,
      proofs: [
        decisionProof({
          id: 'huji-cs-live',
          institutionId: 'huji',
          institutionName: 'Hebrew University of Jerusalem',
          normalizedPayload: {
            pairId: 'cs__huji',
            programId: 'cs',
            acceptanceThreshold: 23.75,
            publicationMetric: 'formula_score',
          },
        }),
      ],
      verificationLedger: exactTauLedger,
    });

    expect(run.manifest.changes).toEqual([]);
    expect(run.excluded).toMatchObject([
      { sourceProofId: 'huji-cs-live', reason: 'cutoff_metric_incompatible' },
    ]);
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
