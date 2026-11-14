import { describe, expect, it } from 'vitest';
import { isLawBarOutcomeStale, lawBarOutcomes } from './lawBarOutcomes';

describe('law bar first-time outcomes', () => {
  it('keeps every official summer 2026 row in PDF order with exact rates', () => {
    expect(
      lawBarOutcomes.rows.map(({ school, candidates, passed, rate }) => [
        school,
        candidates,
        passed,
        rate,
      ]),
    ).toEqual([
      ['האוניברסיטה העברית', 110, 101, '91.82'],
      ['אוניברסיטת תל-אביב', 182, 156, '85.71'],
      ['אוניברסיטת חיפה', 46, 38, '82.61'],
      ['אוניברסיטת בר-אילן', 145, 118, '81.38'],
      ['המכללה למינהל', 161, 131, '81.37'],
      ['מכללת ספיר', 74, 55, '74.32'],
      ['המרכז האקדמי פרס', 98, 70, '71.43'],
      ['אוניברסיטת רייכמן', 37, 26, '70.27'],
      ['עולים מחו"ל', 4, 2, '50.00'],
      ['המרכז האקדמי למשפט ולעסקים', 137, 66, '48.18'],
      ['מכללת נתניה', 155, 74, '47.74'],
      ['הקריה האקדמית אונו', 533, 225, '42.21'],
      ['המכללה האקדמית צפת', 28, 10, '35.71'],
      ['שערי מדע ומשפט', 75, 25, '33.33'],
      ['ישראלי שלמד בחו"ל', 22, 4, '18.18'],
      ['המרכז האקדמי כרמל', 2, 0, '0.00'],
    ]);
    expect(lawBarOutcomes.rows.reduce((sum, row) => sum + row.candidates, 0)).toBe(1809);
    expect(lawBarOutcomes.rows.reduce((sum, row) => sum + row.passed, 0)).toBe(1101);
    for (const row of lawBarOutcomes.rows) {
      expect(((row.passed / row.candidates) * 100).toFixed(2)).toBe(row.rate);
    }
    expect(lawBarOutcomes.rows.filter((row) => 'programId' in row)).toHaveLength(12);
  });

  it('shows the stale notice only after eight months from publication', () => {
    expect(isLawBarOutcomeStale(new Date('2026-11-14T12:00:00Z'))).toBe(false);
    expect(isLawBarOutcomeStale(new Date('2027-03-16T21:59:59Z'))).toBe(false);
    expect(isLawBarOutcomeStale(new Date('2027-03-16T22:00:00Z'))).toBe(true);
  });
});
