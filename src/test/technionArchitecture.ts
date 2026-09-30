export const architectureInputs = {
  technionArchitectureBagrutAverage: 115,
  technionArchitectureExamScore: 110,
  technionArchitectureExamPassed: true,
  technionArchitectureRequirementsConfirmed: true,
};

// Reduced public-source responses; real-source replays are recorded in docs/admissions-verification.
export function architectureSourceResponse(url: string): string {
  if (url.endsWith('/calculator/')) {
    return 'new GFCalc(73, [{"field_id":5,"formula":"(0.7*((0.1*{D:1})+(0.09*{P:3})+15))+(0.3*{A:8})","rounding":"1"}])';
  }
  if (url.endsWith('/architecture-info/')) {
    return 'מתמטיקה ברמה של 4 יח״ל לפחות בציון 70 ומעלה או ציון 65 ומעלה ב-5 יח״ל. בחינה באנגלית ברמה של 4 יח״ל לפחות. בחינות שידורגו בשליש התחתון יקבלו לא עובר.';
  }
  if (url.endsWith('/english-exam/')) return 'ציון אנגלית גבוה מ-104';
  if (url.endsWith('/knowledge-of-hebrew/')) return 'ציון של 121 לפחות';
  return '<caption>אוקטובר 2026</caption><tr><td class="column-1">ארכיטקטורה*</td><td class="column-2">85 קבלה על בסיס מקום פנוי</td></tr>';
}
