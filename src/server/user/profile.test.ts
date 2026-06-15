import { describe, expect, it } from 'vitest';

import { buildUserProfileRow, serializeUserProfileSnapshot } from '@/server/user/serializers';

describe('user profile serializers', () => {
  it('serializes a sparse row into the frontend profile shape', () => {
    const snapshot = serializeUserProfileSnapshot(
      {
        userId: '00000000-0000-0000-0000-000000000001',
        firstName: 'מלי',
        lastName: 'כהן',
        geographicPreference: 'south',
        psychometricOverall: 701,
        psychometricQuantitative: null,
        psychometricVerbal: 132,
        psychometricEnglish: null,
        bagrutWeightedAverage: 108,
        riasecR: null,
        riasecI: null,
        riasecA: null,
        riasecS: null,
        riasecE: null,
        riasecC: null,
        avoidanceTags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      [{ programId: 'tau_cs' }]
    );

    expect(snapshot).toEqual({
      firstName: 'מלי',
      lastName: 'כהן',
      geographicPreference: 'south',
      academicScores: {
        psychometric: {
          overall: 701,
          verbal: 132,
        },
        bagrut: {
          weightedAverage: 108,
        },
      },
      savedProgramIds: ['tau_cs'],
    });
  });

  it('builds a DB row with nulls for missing score fields', () => {
    const row = buildUserProfileRow('00000000-0000-0000-0000-000000000002', {
      firstName: 'Dana',
      lastName: 'Levi',
      geographicPreference: 'any',
      academicScores: {
        psychometric: {
          overall: 650,
        },
      },
    });

    expect(row).toMatchObject({
      userId: '00000000-0000-0000-0000-000000000002',
      firstName: 'Dana',
      lastName: 'Levi',
      geographicPreference: 'any',
      psychometricOverall: 650,
      psychometricQuantitative: null,
      psychometricVerbal: null,
      psychometricEnglish: null,
      bagrutWeightedAverage: null,
    });
  });

  it('keeps legacy rows without names backward-compatible', () => {
    const snapshot = serializeUserProfileSnapshot(
      {
        userId: '00000000-0000-0000-0000-000000000003',
        firstName: null,
        lastName: null,
        geographicPreference: 'any',
        psychometricOverall: null,
        psychometricQuantitative: null,
        psychometricVerbal: null,
        psychometricEnglish: null,
        bagrutWeightedAverage: null,
        riasecR: null,
        riasecI: null,
        riasecA: null,
        riasecS: null,
        riasecE: null,
        riasecC: null,
        avoidanceTags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      []
    );

    expect(snapshot).toEqual({
      geographicPreference: 'any',
      savedProgramIds: [],
    });
  });
});
