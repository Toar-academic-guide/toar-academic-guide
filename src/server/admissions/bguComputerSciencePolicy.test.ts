import { describe, expect, it } from 'vitest';

import {
  BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY,
  evaluateBguComputerScienceGates,
} from './bguComputerSciencePolicy';

const qualifiedMath = { subjectId: 'mathematics', units: 5, grade: 80 } as const;

describe('BGU Computer Science quantitative policy', () => {
  it('retains the route capability as disabled until the score model can be reproduced', () => {
    expect(BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY).toMatchObject({
      cutoff: 720,
      minimumPsychometric: 600,
      minimumQuantitativeSubscore: 125,
      enabledForRoutes: false,
    });
  });

  it('requires the published quantitative subscore, math gate, and language confirmation', () => {
    expect(
      evaluateBguComputerScienceGates({
        psychometric: 599,
        quantitativeSubscore: 124,
        subjects: [{ subjectId: 'mathematics', units: 4, grade: 89 }],
        languageRequirementsConfirmed: false,
      }).unmetRequirements,
    ).toEqual([
      'psychometric_600',
      'psychometric_quantitative_125',
      'mathematics_90_at_4_or_80_at_5',
      'language_classifications',
    ]);
  });

  it('recognizes the documented five-unit mathematics alternative', () => {
    expect(
      evaluateBguComputerScienceGates({
        psychometric: 600,
        quantitativeSubscore: 125,
        subjects: [qualifiedMath],
        languageRequirementsConfirmed: true,
      }),
    ).toEqual({ eligibleForScoreComparison: true, unmetRequirements: [] });
  });
});
