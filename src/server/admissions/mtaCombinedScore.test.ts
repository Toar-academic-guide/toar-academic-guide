import { describe, expect, it } from 'vitest';
import official from '../../../docs/admissions-verification/2026-10-23-mta-official-calculator.json';
import { mtaCombinedScore } from './mtaCombinedScore';

describe('MTA combined score replay of the live official calculator', () => {
  it.each(official.results)(
    '$bagrut / $psychometric → $officialResult',
    ({ bagrut, psychometric, officialResult }) => {
      const expected = Number(officialResult);
      expect(mtaCombinedScore(bagrut, psychometric)).toBe(
        Number.isFinite(expected) ? expected : undefined,
      );
    },
  );
  it('requires both ordinary scores', () => {
    expect(mtaCombinedScore(undefined, 580)).toBeUndefined();
    expect(mtaCombinedScore(96, undefined)).toBeUndefined();
  });
});
