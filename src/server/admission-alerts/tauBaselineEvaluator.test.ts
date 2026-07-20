import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { evaluateTauComputerScienceAlertBaseline } from './tauBaselineEvaluator';

const profile = {
  profileVersionId: 'profile-v1',
  profileHash: 'sha256:profile',
  psychometric: 680,
  bagrutAverage: 108,
  hasStructuredBagrut: true,
  subjects: [
    { subjectId: 'mathematics', units: 5, grade: 90 },
    { subjectId: 'physics', units: 5, grade: 80 },
  ],
};

describe('TAU computer-science alert baseline evaluator', () => {
  it('uses the official finalist verifier and records the current cutoff in the rule version', async () => {
    const verifyFinalists = vi.fn().mockResolvedValue([
      {
        id: 'alert-baseline',
        status: 'verified',
        eligible: false,
        score: 695,
        cutoff: 700,
        scoreField: 'hatama_meduyakim',
        sourceUrl: 'https://go.tau.ac.il/he/exact/ba/computer',
      },
    ]);

    await expect(
      evaluateTauComputerScienceAlertBaseline({
        institutionId: 'tau',
        programId: 'tau_cs',
        profile,
        verifyFinalists,
      }),
    ).resolves.toEqual({
      decision: 'below',
      ruleVersion: 'tau-engineering-exact-sciences-2026-06-11:tau_cs_cutoff:700',
    });
    expect(verifyFinalists).toHaveBeenCalledWith([
      {
        id: 'alert-baseline',
        psychometric: 680,
        bagrutAverage: 108,
        hasQualifiedMathAndPhysics: true,
      },
    ]);
  });

  it('refuses to create a baseline when the official verifier is unavailable', async () => {
    await expect(
      evaluateTauComputerScienceAlertBaseline({
        institutionId: 'tau',
        programId: 'tau_cs',
        profile,
        verifyFinalists: async () => [
          {
            id: 'alert-baseline',
            status: 'unavailable',
            reason: 'official_score_unavailable',
            sourceUrl: 'https://go.tau.ac.il/he/exact/ba/computer',
          },
        ],
      }),
    ).resolves.toEqual({
      decision: 'unavailable',
      ruleVersion: 'tau-engineering-exact-sciences-2026-06-11:tau_cs_unavailable',
    });
  });
});
