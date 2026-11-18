import { describe, expect, it } from 'vitest';
import { mondayAdmissionsEvidence } from './mondayEvidence';
import { studentExplanations } from './studentExplanations';

describe('reviewed student explanations', () => {
  it('contains Hebrew student copy without English prose', () => {
    expect(Object.keys(studentExplanations).length).toBeGreaterThan(0);
    for (const [itemId, entry] of Object.entries(studentExplanations)) {
      expect(entry.text, itemId).toMatch(/[א-ת]/);
      expect(entry.text, itemId).not.toMatch(/[a-z]{2,}(?:[\s_/-]+[a-z]{2,})+/i);
      expect(new URL(entry.sourceUrl).protocol, itemId).toBe('https:');
      expect(entry.checkedAt, itemId).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('covers every open-admission evidence record', () => {
    const openRecords = mondayAdmissionsEvidence.filter(
      (record) => record.publicBucket === 'open_admission',
    );
    expect(openRecords.length).toBeGreaterThan(0);
    for (const record of openRecords) {
      expect(studentExplanations[record.itemId], record.itemId).toBeDefined();
    }
  });

  it('preserves the Mario-approved Open University copy and provenance', () => {
    expect(studentExplanations['12220699690']).toEqual({
      text: 'באוניברסיטה הפתוחה הקבלה לתואר ראשון פתוחה לכולם: אין צורך בציון פסיכומטרי או בתעודת בגרות מלאה כדי להתחיל ללמוד. אם אתם מתחת לגיל 18 או עדיין בתיכון, יש תהליך קבלה נפרד.',
      sourceUrl: 'https://academic.openu.ac.il/cs/computer/pages/faq.aspx',
      checkedAt: '2026-10-30',
    });
  });
});
