import catalogueContentRepair from './admissions/catalogueContentRepair.json';
import { describe, expect, it } from 'vitest';
import { psychologyComparisonRows, psychologyProfessionUrl } from './psychologyComparison';

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

  it('keeps the distinct scales, conditional Ofek route, Ono qualification, and Ariel catalogue conditions explicit', () => {
    const row = (id: string) =>
      psychologyComparisonRows.find((candidate) => candidate.programId === id)!;
    expect(row('tau_psychology').main[0].text).toContain('ציון התאמה: סף קבלה 660, סף דחייה 659');
    expect(row('bgu_psychology').main[0].text).toContain('סכם 650 וגם פסיכומטרי 650');
    expect(row('biu_psychology').scale).toContain('בר־אילן');
    expect(row('haifa_psychology').bagrut[0].text).toContain('מסלול אופק ללא פסיכומטרי');
    expect(row('haifa_psychology').note).toContain('2–3 קורסים בציון 75');
    expect(row('ono_psychology').institution).toContain('מדעי ההתנהגות (B.A.)');
    const ariel = row('ariel_psychology');
    const record = catalogueContentRepair.requirements.find(
      (item) => item.programId === 'ariel_psychology',
    )!;
    expect(ariel.main.map((item) => item.text)).toEqual(record.notes.slice(0, 3));
    expect(ariel.bagrut[0].text).toContain('בגרות 97 לפחות');
    expect(ariel.main[0].text).toContain('משולב 580');
    expect(ariel.scale).toContain('6.666');
    expect(ariel.note).toBe(record.notes.slice(3).join(' '));
    expect(JSON.stringify(ariel)).not.toContain('לא אומת');
    expect(psychologyProfessionUrl).toMatch(/^https:\/\/me\.health\.gov\.il\//);
  });
});
