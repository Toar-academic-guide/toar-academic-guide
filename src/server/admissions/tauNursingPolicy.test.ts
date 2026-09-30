import { describe, expect, it } from 'vitest';

import { evaluateTauNursingGates } from './tauNursingPolicy';

describe('TAU Nursing policy', () => {
  it('passes the published psychometric and English gates', () => {
    expect(
      evaluateTauNursingGates({
        degreeId: 'nursing',
        psychometric: 520,
        bagrut: 100,
        extraInputs: { psychometricEnglish: 100 },
      }),
    ).toEqual({ state: 'pass' });
  });

  it('names each failed cumulative gate', () => {
    expect(
      evaluateTauNursingGates({
        degreeId: 'nursing',
        psychometric: 519,
        bagrut: 100,
        extraInputs: { psychometricEnglish: 99 },
      }),
    ).toEqual({
      state: 'below',
      unmetRequirements: ['ציון פסיכומטרי 520 ומעלה', 'רמת מתקדמים א׳ באנגלית (100 ומעלה)'],
    });
  });

  it('asks for the English classification input instead of assuming it', () => {
    expect(
      evaluateTauNursingGates({
        degreeId: 'nursing',
        psychometric: 600,
        bagrut: 100,
      }),
    ).toEqual({
      state: 'needs_input',
      requiredInputs: ['psychometric_english'],
    });
  });
});
