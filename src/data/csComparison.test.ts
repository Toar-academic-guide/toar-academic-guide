import { describe, expect, it } from 'vitest';
import {
  csAnswer,
  csComparisonRows,
  csOfficialUrls,
  csReichmanHubRequirements,
} from './csComparison';

describe('CS comparison source ledger', () => {
  it('keeps seven native-scale numeric routes and four link-only institutions in official order', () => {
    expect(csComparisonRows).toHaveLength(11);
    expect(csComparisonRows.filter((row) => row.numeric).map((row) => row.programId)).toEqual([
      'technion_cs',
      'tau_cs',
      'haifa_cs',
      'haifa_cs',
      'reichman_cs',
      'reichman_cs',
      'reichman_cs',
    ]);
    expect(csComparisonRows.filter((row) => !row.numeric).map((row) => row.programId)).toEqual([
      'huji_cs',
      'bgu_cs',
      'ariel_cs',
      'biu_cs',
    ]);
    for (const row of csComparisonRows) {
      expect(row.sourceUrl).toMatch(/^https:\/\//);
      expect(row.checkedDate).toBe('14.11.2026');
      if (!row.numeric) expect(row.value).toBe('—');
    }
  });

  it('preserves source-specific cycles and required route conditions without stale Reichman copy', () => {
    expect(csComparisonRows[0]).toMatchObject({ value: '91', scale: 'סכם הטכניון' });
    expect(csComparisonRows[0].note).toContain('הערכה');
    expect(csComparisonRows[1]).toMatchObject({
      value: 'סף קבלה 705 · סף דחייה 695',
      cycle: 'סמסטר ב׳ תשפ״ז (מרץ 2027)',
    });
    expect(csComparisonRows[1].sourceUrl).toBe(csOfficialUrls.tau);
    expect(csComparisonRows[2].value).toContain('680–699');
    expect(csComparisonRows[3].note).toContain('ועדת החוג');
    expect(csComparisonRows[3].note).toContain('4 יחידות בציון 85');
    expect(csComparisonRows[5].value).toContain('104');
    expect(csComparisonRows[5].note).toContain('מתמטיקה בציון 75');
    expect(csComparisonRows[5].note).toContain('בציון 85');
    expect(csReichmanHubRequirements.join(' ')).not.toContain('108');
    expect(csAnswer.trim().split(/\s+/u).length).toBeGreaterThanOrEqual(40);
    expect(csAnswer.trim().split(/\s+/u).length).toBeLessThanOrEqual(60);
  });
});
