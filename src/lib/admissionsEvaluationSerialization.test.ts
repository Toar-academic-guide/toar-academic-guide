import { describe, expect, it } from 'vitest';
import { serializeAdmissionsReport } from './admissionsEvaluationSerialization';
import type {
  AdmissionsEvaluationReport,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';

function report(
  score: number | undefined,
  overrides: Partial<AdmissionsEvaluationResult> = {},
  programId = 'huji_economics',
): AdmissionsEvaluationReport {
  return {
    generatedAt: '2026-10-28T10:00:00.000Z',
    evaluatorVersion: 'test',
    inputDigest: 'input-digest',
    input: { degreeId: programId, psychometric: 700, bagrut: 90 },
    program: { id: programId, name: 'כלכלה' },
    results: [
      {
        institution: { id: 'huji', name: 'האוניברסיטה העברית בירושלים', region: 'center' },
        linkedInstitutionId: 'huji',
        capability: 'exact',
        kind: 'exact',
        decision: 'accepted',
        confidence: 'high',
        sourceLabel: 'מקור רשמי',
        explanation: 'תוצאה',
        nextAction: 'הרשמה',
        ...(score === undefined ? {} : { score }),
        threshold: 20.75,
        scoreAssessment: 'meets_threshold',
        requiredInputs: [],
        snapshot: {
          evaluatorVersion: 'test',
          ruleVersion: 'rule',
          ruleFingerprint: 'rule-fingerprint',
          inputDigest: 'input-digest',
          evaluationDigest: 'raw-evaluation-digest',
        },
        ...overrides,
      },
    ],
  };
}

describe('admissions wire score precision', () => {
  it.each([
    [21.116181701499997, 21.12],
    [19.620647354, 19.62],
    [0, 0],
    [725, 725],
    [undefined, undefined],
  ])('serializes ordinary HUJI score %s as %s', (raw, expected) => {
    expect(serializeAdmissionsReport(report(raw)).results[0].score).toBe(expected);
  });

  it.each(['medicine', 'huji_medicine'])('keeps three decimals for %s', (id) => {
    expect(serializeAdmissionsReport(report(27.921, {}, id)).results[0].score).toBe(27.921);
    expect(serializeAdmissionsReport(report(27.92149, {}, id)).results[0].score).toBe(27.921);
  });

  it('leaves other institutions and every non-score field unchanged', () => {
    const source = report(639.165234, { linkedInstitutionId: 'reichman' });
    expect(serializeAdmissionsReport(source)).toEqual(source);
  });

  it.each([
    [21.119, 21.12, 'below', 'below_threshold'],
    [21.124, 21.123, 'accepted', 'meets_threshold'],
  ] as const)(
    'preserves raw verdict at score %s against threshold %s',
    (score, threshold, decision, scoreAssessment) => {
      const source = report(score, { threshold, decision, scoreAssessment });
      expect(serializeAdmissionsReport(source).results[0]).toEqual({
        ...source.results[0],
        score: 21.12,
      });
    },
  );

  it('does not mutate frozen reports or recalculate raw snapshots and gaps', () => {
    const source = report(21.116181701499997, {
      deltaNeeded: { psychometric: 4, bagrut: 2 },
      requiredInputs: ['psychometric_english'],
    });
    const before = structuredClone(source);
    freeze(source);
    const wire = serializeAdmissionsReport(source);
    expect(source).toEqual(before);
    expect(wire).toEqual({ ...before, results: [{ ...before.results[0], score: 21.12 }] });
  });
});

function freeze(value: object) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freeze(child);
  Object.freeze(value);
}
