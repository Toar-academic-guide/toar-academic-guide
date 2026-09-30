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
      }),
    ).toBe(true);

    expect(
      hasMeaningfulProfileData({
        geographicPreference: 'any',
        academicScores: {
          psychometric: {
            overall: 680,
          },
        },
      }),
    ).toBe(true);

    expect(
      hasMeaningfulProfileData({
        firstName: 'Dana',
        geographicPreference: 'any',
      }),
    ).toBe(true);
  });

  it('detects institution-specific admissions inputs as meaningful draft data', () => {
    expect(
      hasMeaningfulProfileData({
        geographicPreference: 'any',
        academicScores: { admissions: { tauApplicationRequirementsConfirmed: false } },
      }),
    ).toBe(true);
  });

  it('prefers existing scalar values while unioning saved programs during merge', () => {
    const merged = mergeUserProfileDraft(
      {
        firstName: 'Server',
        lastName: 'Name',
        geographicPreference: 'north',
        academicScores: {
          psychometric: {
            overall: 710,
          },
        },
        savedProgramIds: ['tau_cs'],
      },
      {
        firstName: 'Draft',
        lastName: 'User',
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
      },
    );

    expect(merged.firstName).toBe('Server');
    expect(merged.lastName).toBe('Name');
    expect(merged.geographicPreference).toBe('north');
    expect(merged.academicScores?.psychometric?.overall).toBe(710);
    expect(merged.academicScores?.psychometric?.verbal).toBe(130);
    expect(merged.academicScores?.bagrut?.weightedAverage).toBe(109);
    expect(merged.savedProgramIds).toEqual(['tau_cs', 'huji_law']);
  });

  it('merges each institution-specific input deliberately and preserves false and zero', () => {
    const merged = mergeUserProfileDraft(
      {
        geographicPreference: 'any',
        savedProgramIds: [],
        academicScores: {
          admissions: {
            tauBagrutAverage: 110.5,
            tauApplicationRequirementsConfirmed: false,
            tauMathPlacementScore: 0,
            technionArchitectureBagrutAverage: 101.9,
            technionArchitectureExamScore: 0,
            technionArchitectureExamPassed: false,
          },
        },
      },
      {
        geographicPreference: 'any',
        academicScores: {
          admissions: {
            tauBagrutAverage: 115,
            bguBagrutAverage: 108.25,
            tauApplicationRequirementsConfirmed: true,
            bguLanguageRequirementsConfirmed: false,
            tauMathPlacementScore: 75,
            technionArchitectureExamScore: 110,
            technionArchitectureExamPassed: true,
            technionArchitectureRequirementsConfirmed: true,
          },
        },
      },
    );

    expect(merged.academicScores?.admissions).toEqual({
      tauBagrutAverage: 110.5,
      bguBagrutAverage: 108.25,
      tauApplicationRequirementsConfirmed: false,
      bguLanguageRequirementsConfirmed: false,
      tauMathPlacementScore: 0,
      technionArchitectureBagrutAverage: 101.9,
      technionArchitectureExamScore: 0,
      technionArchitectureExamPassed: false,
      technionArchitectureRequirementsConfirmed: true,
    });
  });
});
