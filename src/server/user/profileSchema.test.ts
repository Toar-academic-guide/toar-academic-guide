import { describe, expect, it } from 'vitest';

import {
  profileRequestBodySchema,
  savedProgramRequestBodySchema,
  userProfileSchema,
} from '@/server/user/profileSchema';

describe('userProfileSchema', () => {
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
