import { describe, expect, it } from 'vitest';
import { SECTORS } from '@/data/bagrutSubjects';
import { defaultUnitsFor, unitOptionsFor } from './bagrutUnitOptions';

describe('new-row defaults helper', () => {
  it.each(Object.keys(SECTORS))('uses 3 for English/math and 2 for electives in %s', (sector) => {
    expect(defaultUnitsFor('אנגלית', sector)).toBe(3);
    expect(defaultUnitsFor('מתמטיקה', sector)).toBe(3);
    for (const label of ['', 'כימיה', 'פיזיקה', 'מדעי המחשב', 'מקצוע חדש']) {
      expect(defaultUnitsFor(label, sector)).toBe(2);
    }
  });

  it.each(['ערבי', 'דרוזי', 'צרקסי', 'בדואי', 'שומרוני'])(
    'uses the sector minimum for Hebrew in %s',
    (sector) => expect(defaultUnitsFor('עברית', sector)).toBe(3),
  );

  it('keeps every compulsory default within its SECTORS range', () => {
    for (const [sector, subjects] of Object.entries(SECTORS)) {
      for (const subject of subjects) {
        const units = defaultUnitsFor(subject.n, sector);
        expect(units).toBeGreaterThanOrEqual(subject.min);
        expect(units).toBeLessThanOrEqual(subject.max);
        expect(unitOptionsFor(subject.n, sector, '')).toContain(units);
        if (subject.min === 1) expect(units).toBe(2);
      }
    }
    expect(defaultUnitsFor('עברית', 'יהודי')).toBe(2);
    expect(defaultUnitsFor('', 'unknown')).toBe(2);
  });
});
