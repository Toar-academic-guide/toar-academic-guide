import { describe, expect, it } from 'vitest';
import { evaluateRuppinComputerScience } from './ruppinComputerScienceEvaluation';
import type {
  AdmissionsEvaluationInput,
  AdmissionsExtraInputs,
} from '@/types/admissionsEvaluation';
const evaluate = (
  scores: Partial<AdmissionsEvaluationInput>,
  extraInputs: AdmissionsExtraInputs = {},
) =>
  evaluateRuppinComputerScience({
    institution: { id: 'ruppin', name: 'רופין', region: 'center' },
    input: { degreeId: 'ruppin_cs', ...scores, extraInputs },
  });

describe('Ruppin CS', () => {
  it('rejects weak scores before requiring subjects', () =>
    expect(evaluate({ psychometric: 420, bagrut: 70 }).decision).toBe('below'));
  it.each([
    [
      { bagrut: 100, psychometric: 420 },
      { mathUnits: 5, mathGrade: 70 },
    ],
    [{ bagrut: 100 }, { mathUnits: 4, mathGrade: 85 }],
    [
      { bagrut: 98, psychometric: 420 },
      { mathUnits: 5, mathGrade: 80 },
    ],
    [
      { bagrut: 98, psychometric: 420 },
      { mathUnits: 4, mathGrade: 95 },
    ],
    [
      { psychometric: 600, bagrut: 70 },
      { mathUnits: 5, mathGrade: 70 },
    ],
    [
      { psychometric: 590, bagrut: 70 },
      { mathUnits: 4, mathGrade: 85, psychometricMath: 120 },
    ],
  ])('matches inclusive route %o %o', (scores, extra) =>
    expect(evaluate(scores, extra)).toMatchObject({
      decision: 'pending',
      scoreAssessment: 'meets_threshold',
    }),
  );
  it.each([
    [
      { bagrut: 99, psychometric: 420 },
      { mathUnits: 5, mathGrade: 79 },
    ],
    [
      { bagrut: 100, psychometric: 420 },
      { mathUnits: 5, mathGrade: 69 },
    ],
    [
      { psychometric: 589, bagrut: 70 },
      { mathUnits: 5, mathGrade: 100, psychometricMath: 150 },
    ],
    [
      { psychometric: 590, bagrut: 70 },
      { mathUnits: 5, mathGrade: 100, psychometricMath: 119 },
    ],
  ])('rejects below-route profile %o %o', (scores, extra) =>
    expect(evaluate(scores, extra).decision).toBe('below'),
  );
  it('requests math for otherwise passing scores', () =>
    expect(evaluate({ psychometric: 600, bagrut: 70 })).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['math_units', 'math_grade'],
    }));
  it('requests the ordinary quantitative score at 590', () =>
    expect(
      evaluate({ psychometric: 590, bagrut: 70 }, { mathUnits: 5, mathGrade: 70 }),
    ).toMatchObject({ kind: 'needs_input', requiredInputs: ['psychometric_math'] }));
  it('does not request combined 106 even when that route might apply', () => {
    const result = evaluate({ psychometric: 550, bagrut: 97 }, { mathUnits: 5, mathGrade: 70 });
    expect(result.decision).toBe('below');
    expect(result.explanation).toContain('מסלול נוסף');
    expect(result.requiredInputs).toBeUndefined();
  });
});
