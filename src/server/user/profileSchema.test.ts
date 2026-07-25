import { describe, expect, it } from 'vitest';

import {
  profileRequestBodySchema,
  savedProgramRequestBodySchema,
  userProfileSchema,
} from '@/server/user/profileSchema';

describe('userProfileSchema', () => {
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
