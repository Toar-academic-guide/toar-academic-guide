import { describe, expect, it } from 'vitest';
import { evaluateRuppinMarineScience } from '@/server/admissions/ruppinMarineScienceEvaluation';
import type {
  AdmissionsEvaluationInput,
  AdmissionsExtraInputs,
} from '@/types/admissionsEvaluation';
const evaluate = (
  scores: Partial<AdmissionsEvaluationInput>,
  extraInputs: AdmissionsExtraInputs = { mathUnits: 4, mathGrade: 70 },
) =>
  evaluateRuppinMarineScience({
    institution: { id: 'ruppin', name: 'רופין', region: 'center' },
    input: { degreeId: 'ruppin_marine_bio', ...scores, extraInputs },
  });
describe('marine science function (dispatch fenced)', () => {
  it('rejects the old 500/75 profile', () =>
    expect(evaluate({ psychometric: 500, bagrut: 75 }).decision).toBe('below'));
  it.each([{ bagrut: 100 }, { psychometric: 620 }])(
    'matches the inclusive standalone boundary %o',
    (scores) =>
      expect(evaluate(scores)).toMatchObject({
        decision: 'pending',
        scoreAssessment: 'meets_threshold',
      }),
  );
  it('rejects scores just under both routes', () =>
    expect(evaluate({ bagrut: 99.9, psychometric: 619 }).decision).toBe('below'));
  it.each([
    [4, 70, 'pending'],
    [4, 69, 'below'],
    [5, 55, 'pending'],
    [5, 54, 'below'],
  ])('checks math %s units at %s', (mathUnits, mathGrade, decision) =>
    expect(
      evaluate({ bagrut: 100 }, { mathUnits: Number(mathUnits), mathGrade: Number(mathGrade) })
        .decision,
    ).toBe(decision),
  );
  it('requests missing mathematics', () =>
    expect(evaluate({ bagrut: 100 }, {})).toMatchObject({
      kind: 'needs_input',
      requiredInputs: expect.arrayContaining(['math_units', 'math_grade']),
    }));
  it('explains uncomputed routes without requesting a composite', () => {
    const result = evaluate({ bagrut: 90, psychometric: 550 });
    expect(result.explanation).toContain('106');
    expect(result.explanation).toContain('קורס קדם');
    expect(result.requiredInputs).toBeUndefined();
  });
});
