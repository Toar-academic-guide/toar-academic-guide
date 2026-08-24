import { describe, expect, it, vi } from 'vitest';

import { createAdmissionsEvaluationSnapshot } from './evaluationSnapshot';

vi.mock('server-only', () => ({}));

const input = {
  degreeId: 'tau_cs',
  psychometric: 690,
  bagrut: 108,
  extraInputs: { mathUnits: 5, mathGrade: 90 },
} as const;

describe('createAdmissionsEvaluationSnapshot', () => {
  it('is deterministic for the same normalized input and reviewed rule state', () => {
    const first = createAdmissionsEvaluationSnapshot({
      input,
      result: resultFixture(),
    });
    const second = createAdmissionsEvaluationSnapshot({
      input: { ...input, extraInputs: { mathGrade: 90, mathUnits: 5 } },
      result: resultFixture(),
    });

    expect(first).toEqual(second);
    expect(first.ruleFingerprint).not.toContain('690');
    expect(first.inputDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('shares a TAU rule fingerprint across applicants while keeping evaluations distinct', () => {
    const first = createAdmissionsEvaluationSnapshot({ input, result: resultFixture() });
    const second = createAdmissionsEvaluationSnapshot({
      input: { ...input, psychometric: 700 },
      result: { ...resultFixture(), score: 712, decision: 'accepted' },
    });

    expect(first.ruleFingerprint).toBe(second.ruleFingerprint);
    expect(first.evaluationDigest).not.toBe(second.evaluationDigest);
  });

  it('changes the rule fingerprint when a reviewed cutoff changes', () => {
    const before = createAdmissionsEvaluationSnapshot({ input, result: resultFixture() });
    const after = createAdmissionsEvaluationSnapshot({
      input,
      result: { ...resultFixture(), threshold: 707 },
    });

    expect(before.ruleFingerprint).not.toBe(after.ruleFingerprint);
  });
});

function resultFixture() {
  return {
    linkedInstitutionId: 'tau',
    capability: 'exact' as const,
    kind: 'exact' as const,
    decision: 'below' as const,
    confidence: 'high' as const,
    sourceLabel: 'אימות רשמי',
    explanation: 'ignored applicant-facing copy',
    nextAction: 'ignored applicant-facing action',
    score: 702,
    scoreLabel: 'ציון התאמה',
    threshold: 706,
    evidenceItemId: 'tau-digital-sciences-live',
    officialUrls: ['https://go.tau.ac.il/graphql'],
  };
}
