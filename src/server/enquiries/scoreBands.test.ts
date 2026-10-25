import { expect, it } from 'vitest';
import { enquiryScoreBands } from './scoreBands';

it.each([
  [60, 200, '60–64', '200–249'],
  [99.99, 649, '95–99', '600–649'],
  [100, 650, '100–104', '650–699'],
  [104.99, 699, '100–104', '650–699'],
  [105.5, 700, '105–109', '700–749'],
  [119.99, 799, '115–120', '750–800'],
  [120, 800, '115–120', '750–800'],
  [null, null, null, null],
  [null, 680, null, '650–699'],
  [105.5, null, '105–109', null],
])(
  'bands Bagrut %s and psychometric %s without mutating private scores',
  (bagrut, psychometric, bagrutBand, psychometricBand) => {
    const scores = Object.freeze({ bagrut, psychometric });
    expect(enquiryScoreBands(scores)).toEqual({
      bagrut_band: bagrutBand,
      psychometric_band: psychometricBand,
    });
  },
);
