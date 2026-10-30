import { describe, expect, it } from 'vitest';
import { admissionsEvaluationSchema } from './admissionsEvaluationSchema';

describe.each(['englishGrade', 'physicsGrade', 'csGrade'] as const)('bagrut %s range', (field) => {
  it.each([0, 45, 49, 50, 100])('accepts integer grade %i', (grade) => {
    expect(
      admissionsEvaluationSchema.safeParse({
        degreeId: 'open_university_cs',
        extraInputs: { [field]: grade },
      }).success,
    ).toBe(true);
  });

  it.each([-1, 101, 45.5])('rejects invalid grade %s', (grade) => {
    expect(
      admissionsEvaluationSchema.safeParse({
        degreeId: 'open_university_cs',
        extraInputs: { [field]: grade },
      }).success,
    ).toBe(false);
  });
});
