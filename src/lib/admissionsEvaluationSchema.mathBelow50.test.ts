import { describe, expect, it } from 'vitest';
import { admissionsEvaluationSchema } from './admissionsEvaluationSchema';

describe('bagrut mathematics grade range', () => {
  it.each([0, 45, 49, 50, 100])('accepts integer math grade %i', (mathGrade) => {
    expect(
      admissionsEvaluationSchema.safeParse({
        degreeId: 'tau_business',
        extraInputs: { mathUnits: 4, mathGrade },
      }).success,
    ).toBe(true);
  });

  it.each([-1, 101, 45.5])('rejects invalid math grade %s', (mathGrade) => {
    expect(
      admissionsEvaluationSchema.safeParse({
        degreeId: 'tau_business',
        extraInputs: { mathUnits: 4, mathGrade },
      }).success,
    ).toBe(false);
  });
});
