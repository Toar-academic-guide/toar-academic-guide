import { expect, it } from 'vitest';
import { admissionScoreGap } from './admissionScoreGap';

it('names the actual score scale and both compared values', () => {
  expect(admissionScoreGap({ score: 24.98, threshold: 25.5, scoreLabel: 'סכם' }, String)).toBe(
    'חסרות לכם 0.52 נקודות בסכם לסף (24.98 לעומת 25.5)',
  );
});

it('keeps the displayed gap consistent with rounded scores without changing inputs', () => {
  const input = { score: 635.5, threshold: 650, scoreLabel: 'ציון קבלה' };
  expect(admissionScoreGap(input, (value) => String(Math.round(value)))).toBe(
    'חסרות לכם 14 נקודות בציון קבלה לסף (636 לעומת 650)',
  );
  expect(input.score).toBe(635.5);
});
