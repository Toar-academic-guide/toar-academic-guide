import { describe, expect, it } from 'vitest';

import { hasMeaningfulProfileData, mergeUserProfileDraft } from '@/server/user/migration';

describe('user profile migration helpers', () => {
  it('detects empty drafts as non-meaningful', () => {
    expect(hasMeaningfulProfileData({ geographicPreference: 'any' })).toBe(false);
  });

  it('detects saved programs and scores as meaningful draft data', () => {
    expect(
      hasMeaningfulProfileData({
        geographicPreference: 'any',
        savedProgramIds: ['tau_cs'],
      })
    ).toBe(true);

    expect(
      hasMeaningfulProfileData({
        geographicPreference: 'any',
        academicScores: {
          psychometric: {
            overall: 680,
          },
        },
      })
    ).toBe(true);
  });

  it('prefers existing scalar values while unioning saved programs during merge', () => {
    const merged = mergeUserProfileDraft(
      {
        geographicPreference: 'north',
        academicScores: {
          psychometric: {
            overall: 710,
          },
        },
        savedProgramIds: ['tau_cs'],
      },
      {
        geographicPreference: 'south',
        academicScores: {
          psychometric: {
            overall: 690,
            verbal: 130,
          },
          bagrut: {
            weightedAverage: 109,
          },
        },
        savedProgramIds: ['tau_cs', 'huji_law'],
      }
    );

    expect(merged.geographicPreference).toBe('north');
    expect(merged.academicScores?.psychometric?.overall).toBe(710);
    expect(merged.academicScores?.psychometric?.verbal).toBe(130);
    expect(merged.academicScores?.bagrut?.weightedAverage).toBe(109);
    expect(merged.savedProgramIds).toEqual(['tau_cs', 'huji_law']);
  });
});

