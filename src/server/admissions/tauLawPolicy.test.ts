import { describe, expect, it } from 'vitest';

import { evaluateTauLawGates } from './tauLawPolicy';

const input = (overrides: Record<string, unknown> = {}) => ({
  degreeId: 'law',
  psychometric: 680,
  bagrut: 110,
  extraInputs: { psychometricEnglish: 110 },
  ...overrides,
});

describe('evaluateTauLawGates', () => {
  it('requires the English subscores needed by the official route', () => {
    expect(evaluateTauLawGates(input({ extraInputs: {} }))).toEqual({
      state: 'needs_input',
      requiredInputs: ['psychometric_english'],
    });
  });

  it('accepts the reviewed standard route', () => {
    expect(evaluateTauLawGates(input())).toEqual({ state: 'pass', unmetRequirements: [] });
  });

  it('fails below the psychometric or English minimums', () => {
    expect(
      evaluateTauLawGates(input({ psychometric: 590, extraInputs: { psychometricEnglish: 99 } })),
    ).toEqual({
      state: 'below',
      unmetRequirements: ['פסיכומטרי 600 ומעלה', 'אנגלית בפסיכומטרי ברמת 100 ומעלה'],
    });
  });
});
