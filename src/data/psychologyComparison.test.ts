import { describe, expect, it } from 'vitest';
import { psychologyComparisonRows } from './psychologyComparison';

describe('psychology comparison sources', () => {
  it('covers the nine issue-specified programme routes with a dated official source for every figure', () => {
    expect(psychologyComparisonRows.map((row) => row.programId)).toEqual([
      'tau_psychology',
      'huji_psychology',
      'achva_psychology',
      'bgu_psychology',
      'haifa_psychology',
      'biu_psychology',
      'ariel_psychology',
      'reichman_psychology',
      'ono_psychology',
    ]);
    for (const row of psychologyComparisonRows) {
      expect(row.checkedDate).toMatch(/^\d{2}\.\d{2}\.2026$/);
      expect(row.main.length).toBeGreaterThan(0);
      for (const item of [...row.main, ...row.bagrut]) {
        expect(item.url).toMatch(/^https:\/\//);
        expect(item.url).not.toMatch(/(?:study\.co\.il|yoram\.walla\.co\.il|milgapo)/);
      }
    }
  });

  it('keeps the distinct scales, conditional Ofek route, Ono qualification, and Ariel source gap explicit', () => {
    const row = (id: string) =>
      psychologyComparisonRows.find((candidate) => candidate.programId === id)!;
    expect(row('tau_psychology').main[0].text).toContain('ציון התאמה: סף קבלה 660, סף דחייה 659');
    expect(row('bgu_psychology').main[0].text).toContain('סכם 650 וגם פסיכומטרי 650');
    expect(row('biu_psychology').scale).toContain('בר־אילן');
    expect(row('haifa_psychology').bagrut[0].text).toContain('מסלול אופק ללא פסיכומטרי');
    expect(row('haifa_psychology').note).toContain('2–3 קורסים בציון 75');
    expect(row('ono_psychology').institution).toContain('מדעי ההתנהגות (B.A.)');
    expect(row('ariel_psychology').checkedDate).toBe('21.10.2026');
    expect(row('ariel_psychology').main[0].text).toContain('ממוצע 75 וציון 70 לפחות');
    expect(row('ariel_psychology').note).toContain('לא אומת');
  });
});
