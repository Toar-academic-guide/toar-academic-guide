import { HUJI_MEDICINE_ELIGIBLE_INPUTS } from '@/data/admissions/hujiMedicineVerification';
import { describe, expect, it } from 'vitest';

import {
  profileRequestBodySchema,
  savedProgramRequestBodySchema,
  userProfileSchema,
} from '@/server/user/profileSchema';

describe('userProfileSchema', () => {
  it('preserves Colman average and certificate confirmation in a saved profile', () => {
    const admissions = { colmanBagrutAverage: 85.25, colmanBagrutCertificateConfirmed: false };
    expect(
      userProfileSchema.parse({ geographicPreference: 'any', academicScores: { admissions } })
        .academicScores?.admissions,
    ).toEqual(admissions);
    expect(
      userProfileSchema.safeParse({
        geographicPreference: 'any',
        academicScores: { admissions: { colmanBagrutAverage: 130.01 } },
      }).success,
    ).toBe(false);
  });
  it('preserves all Medicine route facts, decimals, date and false/zero', () => {
    const admissions = {
      ...HUJI_MEDICINE_ELIGIBLE_INPUTS,
      hujiBagrutAverage: 120.25,
      hujiMedicineQualificationConfirmed: false,
      hujiMedicinePreparatoryAverage: 110.25,
      hujiMedicinePreparatoryYear: 2021,
      hujiMedicinePreparatoryEligible: false,
      hujiMedicinePreparatoryConversionConfirmed: false,
      hujiMedicineCognitiveScore: 27.921,
      hujiMedicineHebrewScore: 0,
    };
    expect(
      userProfileSchema.parse({ geographicPreference: 'any', academicScores: { admissions } })
        .academicScores?.admissions,
    ).toEqual(admissions);
    for (const invalid of [
      { hujiMedicinePsychometricDate: '2026-02-30' },
      { hujiMedicineAssessmentScore: 251 },
      { hujiBagrutAverage: 128 },
      { hujiMedicinePreparatoryConversionConfirmed: 'yes' },
    ]) {
      expect(
        userProfileSchema.safeParse({
          geographicPreference: 'any',
          academicScores: { admissions: invalid },
        }).success,
      ).toBe(false);
    }
  });
  it('preserves the complete social science input record and rejects invalid age or averages', () => {
    const admissions = {
      bguSocialScienceRoute: 'education_conditional',
      bguSocialScienceRequirementsConfirmed: false,
      bguSocialScienceLanguageConfirmed: false,
      bguReturningFromStudyBreak: false,
      bguSocialWorkAcademicBackground: 'social_work',
      bguSocialWorkAcademicAverage: 85.25,
      bguSocialWorkTranscriptProvided: false,
      bguApplicantAge: 45,
      bguEducationSecondDepartment: 'art',
      bguEnglishClassificationMissing: true,
      bguHebrewRequirementsConfirmed: true,
      bguEducationEnglishConditionAcknowledged: false,
    };
    expect(
      userProfileSchema.parse({ geographicPreference: 'any', academicScores: { admissions } })
        .academicScores?.admissions,
    ).toEqual(admissions);
    for (const extra of [
      { bguApplicantAge: 44.5 },
      { bguApplicantAge: 121 },
      { bguSocialWorkAcademicAverage: 100.01 },
      { bguSocialScienceRoute: 'expired' },
    ])
      expect(
        userProfileSchema.safeParse({
          geographicPreference: 'any',
          academicScores: { admissions: { ...admissions, ...extra } },
        }).success,
      ).toBe(false);
  });
  it('preserves quantitative route inputs, false, zero and decimal preparatory averages', () => {
    const admissions = {
      bguQuantitativeRoute: 'bagrut',
      bguCertificateRequirementsConfirmed: true,
      bguPriorAcademicStudies: false,
      bguReturningOrChangingTrack: false,
      bguApplicationPriority: 3,
      bguSecondTrackRequirementsConfirmed: true,
      bguPreparatoryTrack: 'natural_life_sciences',
      bguPreparatoryAverage: 87.25,
      bguPreparatoryCompleted: true,
    };
    expect(
      userProfileSchema.parse({ geographicPreference: 'any', academicScores: { admissions } })
        .academicScores?.admissions,
    ).toEqual(admissions);
    expect(
      userProfileSchema.safeParse({
        geographicPreference: 'any',
        academicScores: { admissions: { ...admissions, bguPreparatoryAverage: 101 } },
      }).success,
    ).toBe(false);
    expect(
      userProfileSchema.safeParse({
        geographicPreference: 'any',
        academicScores: { admissions: { ...admissions, bguApplicationPriority: 1.5 } },
      }).success,
    ).toBe(false);
  });
  it('preserves optional Architecture scores, false and zero', () => {
    const admissions = {
      technionArchitectureBagrutAverage: 101.9,
      technionArchitectureExamScore: 0,
      technionArchitectureExamPassed: false,
      technionArchitectureRequirementsConfirmed: true,
    };
    expect(
      userProfileSchema.parse({ geographicPreference: 'any', academicScores: { admissions } })
        .academicScores?.admissions,
    ).toEqual(admissions);
  });
  it('accepts a normalized subject-level Bagrut record without trusting a client hash', () => {
    const parsed = userProfileSchema.parse({
      geographicPreference: 'center',
      academicScores: {
        bagrut: {
          weightedAverage: 106,
          subjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [
              { subjectId: 'mathematics', units: 5, grade: 92 },
              { subjectId: 'history', units: 2, grade: 88 },
            ],
          },
        },
      },
    });

    expect(parsed.academicScores?.bagrut?.subjectRecord).toEqual({
      schemaVersion: 1,
      sector: 'jewish',
      subjects: [
        { subjectId: 'mathematics', units: 5, grade: 92 },
        { subjectId: 'history', units: 2, grade: 88 },
      ],
    });
  });

  it('accepts a complete schema-v2 Bagrut record with distinct exam and final-project entries', () => {
    const subjectRecord = {
      schemaVersion: 2 as const,
      sector: 'jewish' as const,
      certificateType: 'external_1977_or_later' as const,
      complete: true,
      subjects: [
        { subjectId: 'physics', units: 5, grade: 90, assessmentKind: 'exam' as const },
        {
          subjectId: 'physics',
          units: 5,
          grade: 95,
          assessmentKind: 'final_project' as const,
        },
      ],
    };

    const parsed = userProfileSchema.parse({
      geographicPreference: 'center',
      academicScores: { bagrut: { subjectRecord } },
    });

    expect(parsed.academicScores?.bagrut?.subjectRecord).toEqual(subjectRecord);
  });

  it('rejects duplicate schema-v2 entries with the same subject and assessment kind', () => {
    expect(() =>
      userProfileSchema.parse({
        geographicPreference: 'center',
        academicScores: {
          bagrut: {
            subjectRecord: {
              schemaVersion: 2,
              sector: 'jewish',
              certificateType: 'internal',
              complete: true,
              subjects: [
                { subjectId: 'physics', units: 5, grade: 90, assessmentKind: 'exam' },
                { subjectId: 'physics', units: 5, grade: 95, assessmentKind: 'exam' },
              ],
            },
          },
        },
      }),
    ).toThrow();
  });

  it('rejects duplicate Bagrut subjects and invalid subject-level ranges', () => {
    const profile = {
      geographicPreference: 'any',
      academicScores: {
        bagrut: {
          subjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [
              { subjectId: 'mathematics', units: 5, grade: 92 },
              { subjectId: 'mathematics', units: 2, grade: 88 },
            ],
          },
        },
      },
    };

    expect(() => userProfileSchema.parse(profile)).toThrow();
    expect(() =>
      userProfileSchema.parse({
        ...profile,
        academicScores: {
          bagrut: {
            subjectRecord: {
              schemaVersion: 1,
              sector: 'jewish',
              subjects: [{ subjectId: 'mathematics', units: 6, grade: 101 }],
            },
          },
        },
      }),
    ).toThrow();
  });

  it('accepts a sparse profile snapshot', () => {
    const parsed = userProfileSchema.parse({
      geographicPreference: 'any',
    });

    expect(parsed).toEqual({
      geographicPreference: 'any',
    });
  });

  it('preserves Haifa official average and real certificate and exam years', () => {
    const admissions = {
      haifaBagrutAverage: 102.25,
      haifaBagrutYear: 2015,
      haifaPsychometricYear: 2026,
      haifaAdmissionQualification: 'full_bagrut',
      haifaEnglishLevel: 'advanced_a',
      haifaHebrewQualification: 'exam',
      haifaHebrewScore: 120,
      haifaHebrewExamDate: '2026-04-01',
      haifaPsychometricMonth: 4,
      haifaScienceUnits: 8,
      haifaOtFailedSelectionAttempts: 0,
      haifaOtUnjustifiedAbsence: false,
    };
    expect(
      userProfileSchema.parse({ geographicPreference: 'any', academicScores: { admissions } })
        .academicScores?.admissions,
    ).toEqual(admissions);
  });

  it('accepts optional institution-specific admissions inputs, including false and zero', () => {
    const parsed = userProfileSchema.parse({
      geographicPreference: 'any',
      academicScores: {
        admissions: {
          tauBagrutAverage: 112.5,
          bguBagrutAverage: 108.25,
          tauApplicationRequirementsConfirmed: false,
          bguLanguageRequirementsConfirmed: true,
          tauMathPlacementScore: 0,
        },
      },
    });

    expect(parsed.academicScores?.admissions).toEqual({
      tauBagrutAverage: 112.5,
      bguBagrutAverage: 108.25,
      tauApplicationRequirementsConfirmed: false,
      bguLanguageRequirementsConfirmed: true,
      tauMathPlacementScore: 0,
    });
  });

  it('preserves structured engineering inputs across profile parsing', () => {
    const bguEngineering = {
      detailsConfirmed: true,
      route: 'direct',
      physicsCoursePassed: false,
      preparatoryInstitution: 'bgu',
      preparatoryCompletionYear: 2026,
      preparatoryMathUnits: 5,
      preparatoryMathGrade: 95,
      preparatoryPhysicsUnits: 5,
      preparatoryPhysicsGrade: 90,
      industrialPreparatoryAverage: 91.25,
      diplomaRecognized: false,
      diplomaMathHours: 90,
      diplomaMathGrade: 95,
      diplomaPhysicsHours: 90,
      diplomaPhysicsGrade: 80,
    };
    expect(
      userProfileSchema.parse({
        geographicPreference: 'any',
        academicScores: { admissions: { bguEngineering } },
      }).academicScores?.admissions?.bguEngineering,
    ).toEqual(bguEngineering);
  });

  it('rejects invalid ranges and types for institution-specific admissions inputs', () => {
    for (const admissions of [
      { tauBagrutAverage: 49 },
      { tauBagrutAverage: 130.1 },
      { tauBagrutAverage: '112' },
      { bguBagrutAverage: 131 },
      { tauApplicationRequirementsConfirmed: 'yes' },
      { bguLanguageRequirementsConfirmed: 1 },
      { tauMathPlacementScore: -1 },
      { tauMathPlacementScore: 101 },
      { technionArchitectureBagrutAverage: 119.1 },
      { technionArchitectureExamScore: 140.1 },
      { technionArchitectureExamPassed: 'yes' },
      { technionArchitectureRequirementsConfirmed: 1 },
      { tauMathPlacementScore: false },
      { bguEngineering: { detailsConfirmed: true, preparatoryMathUnits: 3 } },
      { bguEngineering: { detailsConfirmed: true, diplomaMathHours: 89.5 } },
      { bguEngineering: { detailsConfirmed: true, diplomaRecognized: 'yes' } },
    ]) {
      expect(() =>
        userProfileSchema.parse({
          geographicPreference: 'any',
          academicScores: { admissions },
        }),
      ).toThrow();
    }
  });

  it('accepts a full browser snapshot payload', () => {
    const parsed = userProfileSchema.parse({
      firstName: ' Dana ',
      lastName: ' Levi ',
      geographicPreference: 'north',
      academicScores: {
        psychometric: {
          overall: 700,
          quantitative: 140,
          verbal: 130,
          english: 120,
        },
        bagrut: {
          weightedAverage: 105,
        },
      },
      savedProgramIds: [' tau_cs ', 'huji_law'],
      uploadedDocuments: [
        {
          id: ' doc-1 ',
          kind: 'psychometric',
          displayName: ' תדפיס פסיכומטרי ',
          sizeBytes: 1200,
        },
      ],
    });

    expect(parsed).toEqual({
      firstName: 'Dana',
      lastName: 'Levi',
      geographicPreference: 'north',
      academicScores: {
        psychometric: {
          overall: 700,
          quantitative: 140,
          verbal: 130,
          english: 120,
        },
        bagrut: {
          weightedAverage: 105,
        },
      },
      savedProgramIds: ['tau_cs', 'huji_law'],
      uploadedDocuments: [
        {
          id: 'doc-1',
          kind: 'psychometric',
          displayName: 'תדפיס פסיכומטרי',
          sizeBytes: 1200,
        },
      ],
    });
  });

  it('accepts versioned questionnaire progress and completed recommendation inputs', () => {
    const draft = userProfileSchema.parse({
      geographicPreference: 'any',
      assessmentProgress: {
        schemaVersion: 1,
        stage: 'quick-filters',
        careerDraft: {
          screenIndex: 5,
          multiSelectAnswers: { Q1: ['Q1-A'] },
          quickPickAnswers: { I1: 'yes' },
          sliderAnswers: { V1: -1 },
          skippedScreens: [2],
        },
        scores: { AN: 5, TE: 1, CR: 2, SO: 1, LE: 0, OR: 0, DI: 1, ER: 2 },
        values: {
          incomeVsImpact: -1,
          independenceVsTeam: 0,
          growthVsStability: 1,
          prestigeVsMeaning: 2,
        },
        filterDraft: {
          currentStep: 1,
          answers: { avoidances: ['מתמטיקה מתקדמת'] },
        },
      },
    });

    expect(draft.assessmentProgress?.stage).toBe('quick-filters');

    const completed = userProfileSchema.parse({
      geographicPreference: 'north',
      assessmentProgress: {
        schemaVersion: 1,
        stage: 'completed',
        scores: { AN: 5, TE: 1, CR: 2, SO: 1, LE: 0, OR: 0, DI: 1, ER: 2 },
        values: {
          incomeVsImpact: -1,
          independenceVsTeam: 0,
          growthVsStability: 1,
          prestigeVsMeaning: 2,
        },
        geographicPreference: 'north',
        avoidances: ['heavy-math'],
      },
    });

    expect(completed.assessmentProgress?.stage).toBe('completed');
  });

  it('rejects incompatible questionnaire progress versions', () => {
    expect(() =>
      userProfileSchema.parse({
        geographicPreference: 'any',
        assessmentProgress: {
          schemaVersion: 2,
          stage: 'career-assessment',
          careerDraft: {
            screenIndex: 0,
            multiSelectAnswers: {},
            quickPickAnswers: {},
            sliderAnswers: {},
            skippedScreens: [],
          },
        },
      }),
    ).toThrow();
  });

  it('rejects unsupported document kinds in the public profile snapshot', () => {
    expect(() =>
      userProfileSchema.parse({
        geographicPreference: 'any',
        uploadedDocuments: [
          {
            id: 'doc-1',
            kind: 'other',
            displayName: 'מסמך אחר',
            sizeBytes: 12,
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects out-of-range academic scores', () => {
    expect(() =>
      userProfileSchema.parse({
        geographicPreference: 'south',
        academicScores: {
          psychometric: {
            overall: 199,
          },
        },
      }),
    ).toThrow();

    expect(() =>
      userProfileSchema.parse({
        geographicPreference: 'south',
        academicScores: {
          psychometric: {
            quantitative: 151,
          },
        },
      }),
    ).toThrow();

    expect(() =>
      userProfileSchema.parse({
        geographicPreference: 'south',
        academicScores: {
          bagrut: {
            weightedAverage: 59,
          },
        },
      }),
    ).toThrow();
  });

  it('rejects invalid region and unknown keys', () => {
    expect(() =>
      userProfileSchema.parse({
        geographicPreference: 'jerusalem',
      }),
    ).toThrow();

    expect(() =>
      userProfileSchema.parse({
        geographicPreference: 'any',
        unknown: true,
      }),
    ).toThrow();
  });
});

describe('profileRequestBodySchema', () => {
  it('accepts the merge-local-draft body shape used by the hook', () => {
    const parsed = profileRequestBodySchema.parse({
      profile: {
        geographicPreference: 'any',
        firstName: 'מלי',
        lastName: 'כהן',
      },
      mode: 'merge_local_draft',
    });

    expect(parsed.mode).toBe('merge_local_draft');
    expect(parsed.profile.firstName).toBe('מלי');
  });
});

describe('savedProgramRequestBodySchema', () => {
  it('accepts a trimmed non-empty program id', () => {
    const parsed = savedProgramRequestBodySchema.parse({
      programId: ' tau_cs ',
    });

    expect(parsed).toEqual({ programId: 'tau_cs' });
  });

  it('rejects empty or malformed values', () => {
    expect(() =>
      savedProgramRequestBodySchema.parse({
        programId: '   ',
      }),
    ).toThrow();

    expect(() =>
      savedProgramRequestBodySchema.parse({
        programId: 123,
      }),
    ).toThrow();
  });
});

it('preserves Psychology recognized prep decimals and false in profile JSONB input', () => {
  const admissions = {
    bguPsychologyRoute: 'bagrut',
    bguPsychologyRequirementsConfirmed: false,
    bguPreparatoryTrack: 'natural_life_sciences',
    bguPreparatoryAverage: 94.25,
    bguPreparatoryCompleted: false,
  };
  expect(
    userProfileSchema.parse({ geographicPreference: 'any', academicScores: { admissions } })
      .academicScores?.admissions,
  ).toEqual(admissions);
  expect(
    userProfileSchema.safeParse({
      geographicPreference: 'any',
      academicScores: { admissions: { ...admissions, bguPreparatoryAverage: 100.01 } },
    }).success,
  ).toBe(false);
});

it('validates health profile averages and preserves false, zero and omitted scores', () => {
  const admissions = {
    bguOccupationalTherapyRoute: 'academic',
    bguOccupationalTherapyRequirementsConfirmed: true,
    bguBachelorsDegreeCompleted: false,
    bguBachelorsDegreeAverage: 85.25,
    bguPhysiotherapyRequirementsConfirmed: false,
  };
  expect(
    userProfileSchema.parse({ geographicPreference: 'any', academicScores: { admissions } })
      .academicScores?.admissions,
  ).toEqual(admissions);
  expect(
    userProfileSchema.parse({
      geographicPreference: 'any',
      academicScores: { admissions: { bguBachelorsDegreeAverage: 0 } },
    }).academicScores?.admissions?.bguBachelorsDegreeAverage,
  ).toBe(0);
  for (const values of [
    { bguBachelorsDegreeAverage: 100.1 },
    { bguBachelorsDegreeAverage: -1 },
    { bguBachelorsDegreeCompleted: 'true' },
    { bguOccupationalTherapyExamSession: 'unknown' },
  ])
    expect(
      userProfileSchema.safeParse({
        geographicPreference: 'any',
        academicScores: { admissions: values },
      }).success,
    ).toBe(false);
});
