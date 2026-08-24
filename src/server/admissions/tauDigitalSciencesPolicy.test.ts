import { describe, expect, it } from 'vitest';

import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';
import { evaluateTauDigitalSciencesGates } from './tauDigitalSciencesPolicy';

function input(overrides: Partial<AdmissionsEvaluationInput> = {}): AdmissionsEvaluationInput {
  return {
    degreeId: 'tau_datascience',
    psychometric: 680,
    bagrut: 105,
    extraInputs: {
      psychometricEnglish: 110,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 80 },
          { subjectId: 'physics', units: 5, grade: 70 },
          { subjectId: 'history', units: 2, grade: 90 },
          { subjectId: 'bible', units: 2, grade: 88 },
        ],
      },
    },
    ...overrides,
  };
}

describe('TAU Digital Sciences policy', () => {
  it('accepts the 5-unit mathematics route and derives the exact-sciences bonus', () => {
    expect(evaluateTauDigitalSciencesGates(input())).toEqual({
      state: 'pass',
      exactSciencesBonusEligible: true,
    });
  });

  it('accepts the official 4-unit mathematics alternative without the bonus', () => {
    const candidate = input();
    candidate.extraInputs!.bagrutSubjectRecord!.subjects = [
      { subjectId: 'mathematics', units: 4, grade: 85 },
      { subjectId: 'history', units: 2, grade: 90 },
      { subjectId: 'bible', units: 2, grade: 88 },
    ];

    expect(evaluateTauDigitalSciencesGates(candidate)).toEqual({
      state: 'pass',
      exactSciencesBonusEligible: false,
    });
  });

  it('fails the cumulative psychometric, English, and mathematics gates explicitly', () => {
    const candidate = input({ psychometric: 619 });
    candidate.extraInputs!.psychometricEnglish = 99;
    candidate.extraInputs!.bagrutSubjectRecord!.subjects = [
      { subjectId: 'mathematics', units: 4, grade: 84 },
    ];

    expect(evaluateTauDigitalSciencesGates(candidate)).toMatchObject({
      state: 'below',
      unmetRequirements: [
        'ציון פסיכומטרי כללי 620 ומעלה',
        'רמת מתקדמים א׳ באנגלית (100 ומעלה)',
        'מתמטיקה: 5 יח״ל בציון 75 ומעלה או 4 יח״ל בציון 85 ומעלה',
      ],
      exactSciencesBonusEligible: false,
    });
  });

  it('requests the full subject record and English score when either is missing', () => {
    expect(
      evaluateTauDigitalSciencesGates({
        degreeId: 'tau_datascience',
        psychometric: 680,
        bagrut: 105,
      }),
    ).toEqual({
      state: 'needs_input',
      requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
      exactSciencesBonusEligible: false,
    });
  });

  it('does not award the bonus when either exact-sciences grade is below 55', () => {
    const candidate = input();
    candidate.extraInputs!.bagrutSubjectRecord!.subjects = [
      { subjectId: 'mathematics', units: 5, grade: 80 },
      { subjectId: 'physics', units: 5, grade: 54 },
    ];

    expect(evaluateTauDigitalSciencesGates(candidate)).toEqual({
      state: 'pass',
      exactSciencesBonusEligible: false,
    });
  });
});
