export interface StudentExplanation {
  text: string;
  sourceUrl: string;
  checkedAt: string;
}

export const studentExplanations: Readonly<Record<string, StudentExplanation>> = {
  '12220699690': {
    text: 'באוניברסיטה הפתוחה הקבלה לתואר ראשון פתוחה לכולם: אין צורך בציון פסיכומטרי או בתעודת בגרות מלאה כדי להתחיל ללמוד. אם אתם מתחת לגיל 18 או עדיין בתיכון, יש תהליך קבלה נפרד.',
    sourceUrl: 'https://academic.openu.ac.il/cs/computer/pages/faq.aspx',
    checkedAt: '2026-10-30',
  },
};
