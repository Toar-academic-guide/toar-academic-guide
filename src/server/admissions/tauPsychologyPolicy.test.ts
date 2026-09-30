import { describe, expect, it } from 'vitest';

import { evaluateTauPsychologyGates } from './tauPsychologyPolicy';

describe('TAU Psychology policy', () => {
  it('passes the universal TAU English gate', () => {
    expect(
      evaluateTauPsychologyGates({
        degreeId: 'tau_psychology',
        psychometric: 680,
        bagrut: 110,
        extraInputs: { psychometricEnglish: 100 },
      }),
    ).toEqual({ state: 'pass' });
  });

  it('returns below when the English gate is not met', () => {
    expect(
      evaluateTauPsychologyGates({
        degreeId: 'tau_psychology',
        psychometric: 680,
        bagrut: 110,
        extraInputs: { psychometricEnglish: 99 },
      }),
    ).toEqual({
      state: 'below',
      unmetRequirements: ['רמת מתקדמים א׳ באנגלית (100 ומעלה)'],
    });
  });

  it('requests the English score when it is missing', () => {
    expect(
      evaluateTauPsychologyGates({
        degreeId: 'tau_psychology',
        psychometric: 680,
        bagrut: 110,
      }),
    ).toEqual({
      state: 'needs_input',
      requiredInputs: ['psychometric_english'],
    });
  });
});
