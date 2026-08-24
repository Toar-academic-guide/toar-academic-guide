import { describe, expect, it } from 'vitest';

import { admissionsExtraInputsFromAcademicScores } from './admissionsEvaluationProfile';

describe('admissionsExtraInputsFromAcademicScores', () => {
  it('maps saved psychometric subscores and Bagrut subjects into the admissions evaluator contract', () => {
    expect(
      admissionsExtraInputsFromAcademicScores({
        psychometric: { overall: 700, quantitative: 125, verbal: 120, english: 118 },
        bagrut: {
          weightedAverage: 108,
          subjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [
              { subjectId: 'mathematics', units: 5, grade: 93 },
              { subjectId: 'english', units: 5, grade: 90 },
              { subjectId: 'physics', units: 5, grade: 88 },
              { subjectId: 'computer_science', units: 5, grade: 95 },
            ],
          },
        },
      }),
    ).toEqual({
      psychometricMath: 125,
      psychometricVerbal: 120,
      psychometricEnglish: 118,
      bagrutProfileSchemaVersion: 1,
      bagrutSector: 'jewish',
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 93 },
          { subjectId: 'english', units: 5, grade: 90 },
          { subjectId: 'physics', units: 5, grade: 88 },
          { subjectId: 'computer_science', units: 5, grade: 95 },
        ],
      },
      mathUnits: 5,
      mathGrade: 93,
      englishUnits: 5,
      englishGrade: 90,
      physicsUnits: 5,
      physicsGrade: 88,
      csUnits: 5,
      csGrade: 95,
    });
  });

  it('does not attach an empty extra-input payload when no saved structured values exist', () => {
    expect(admissionsExtraInputsFromAcademicScores({})).toBeUndefined();
  });
});
