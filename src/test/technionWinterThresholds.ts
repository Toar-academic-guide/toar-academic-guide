// Official table cells captured on 2026-10-25; spring precedes winter on the page.
export const technionWinterThresholdsHtml = `
<h2>סיכום אפשרויות הקבלה למסלולים בסמסטר אביב תשפ"ז</h2>
<table id="tablepress-482"><tbody>
<tr><td class="column-1">הנדסת חשמל*</td><td class="column-2">94 -על בסיס מקום פנוי</td></tr>
</tbody></table>
<h2>סיכום אפשרויות הקבלה למסלולים בסמסטר חורף תשפ"ז</h2>
<table id="tablepress-485"><tbody>
<tr><td class="column-1">הנדסת חשמל</td><td class="column-2">91.5</td></tr>
<tr><td class="column-1">הנדסת מכונות</td><td class="column-2">87</td></tr>
</tbody></table>`;

export const technionWinterSubjectRecord = {
  schemaVersion: 1 as const,
  sector: 'jewish' as const,
  subjects: [
    'english',
    'literature',
    'mathematics',
    'bible',
    'civics',
    'hebrew_expression',
    'history',
    'hebrew',
  ].map((subjectId) => ({
    subjectId,
    units: ['english', 'mathematics'].includes(subjectId) ? 5 : 2,
    grade: 95,
  })),
};
