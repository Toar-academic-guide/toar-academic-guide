export const lawBarOutcomes = {
  sitting: 'מועד קיץ 2026',
  examDate: '2026-06-23',
  publicationDate: '2026-07-16',
  checkedDate: '11.11.2026',
  sourceUrl: 'https://www.israelbar.biz/files/mitmahim/bar_exams_summer_2026_press_release.pdf',
  pageModifiedDate: '2026-11-14',
  question: 'לאיזו פקולטה למשפטים שיעור המעבר הגבוה ביותר בבחינת הלשכה?',
  answer:
    'במועד קיץ 2026 של בחינת ההסמכה בכתב של לשכת עורכי הדין, שנערכה ב-23.6.2026, שיעור המעבר הגבוה ביותר בקרב מי שניגשו בפעם הראשונה נרשם באוניברסיטה העברית: 91.82% (101 מתוך 110). אחריה אוניברסיטת תל-אביב עם 85.71% (156 מתוך 182) ואוניברסיטת חיפה עם 82.61% (38 מתוך 46). אלה נתוני הלשכה למועד זה, ואינם מבטיחים קבלה ללימודים או הצלחה בבחינה.',
  tableTitle:
    'שיעור המעבר בבחינת ההסמכה בכתב של לשכת עורכי הדין, מועד קיץ 2026, נבחנים בפעם הראשונה (מתכונת מלאה + מקוצרת)',
  caption:
    'שיעור המעבר בבחינת ההסמכה בכתב של לשכת עורכי הדין, מועד קיץ 2026, נבחנים בפעם הראשונה (מתכונת מלאה + מקוצרת). הבחינה נערכה ב-23.6.2026. מקור: לשכת עורכי הדין, הודעה לתקשורת מ-16.7.2026, https://www.israelbar.biz/files/mitmahim/bar_exams_summer_2026_press_release.pdf. נבדק בתאריך 11.11.2026.',
  total:
    'במועד זה ניגשו 1,809 נבחנים בפעם הראשונה, ומהם עברו 1,101 — 60.86%. הנתונים בטבלה הם למועד קיץ 2026 בלבד.',
  staleNotice: 'זה המועד האחרון שפורסם באתר לשכת עורכי הדין במועד הבדיקה. בדקו אם פורסם מועד חדש.',
  rows: [
    {
      school: 'האוניברסיטה העברית',
      studiedAt: 'באוניברסיטה העברית',
      candidates: 110,
      passed: 101,
      rate: '91.82',
      programId: 'huji_law',
    },
    {
      school: 'אוניברסיטת תל-אביב',
      studiedAt: 'באוניברסיטת תל-אביב',
      candidates: 182,
      passed: 156,
      rate: '85.71',
      programId: 'tau_law',
    },
    {
      school: 'אוניברסיטת חיפה',
      studiedAt: 'באוניברסיטת חיפה',
      candidates: 46,
      passed: 38,
      rate: '82.61',
      programId: 'haifa_law',
    },
    {
      school: 'אוניברסיטת בר-אילן',
      studiedAt: 'באוניברסיטת בר-אילן',
      candidates: 145,
      passed: 118,
      rate: '81.38',
      programId: 'biu_law',
    },
    {
      school: 'המכללה למינהל',
      studiedAt: 'במכללה למינהל',
      candidates: 161,
      passed: 131,
      rate: '81.37',
      programId: 'colmgmt_law',
    },
    {
      school: 'מכללת ספיר',
      studiedAt: 'במכללת ספיר',
      candidates: 74,
      passed: 55,
      rate: '74.32',
      programId: 'sapir_law',
    },
    {
      school: 'המרכז האקדמי פרס',
      studiedAt: 'במרכז האקדמי פרס',
      candidates: 98,
      passed: 70,
      rate: '71.43',
      programId: 'peres_law',
    },
    {
      school: 'אוניברסיטת רייכמן',
      studiedAt: 'באוניברסיטת רייכמן',
      candidates: 37,
      passed: 26,
      rate: '70.27',
      programId: 'reichman_law',
    },
    { school: 'עולים מחו"ל', candidates: 4, passed: 2, rate: '50.00' },
    {
      school: 'המרכז האקדמי למשפט ולעסקים',
      studiedAt: 'במרכז האקדמי למשפט ולעסקים',
      candidates: 137,
      passed: 66,
      rate: '48.18',
      programId: 'ramat_gan_law',
    },
    {
      school: 'מכללת נתניה',
      studiedAt: 'במכללת נתניה',
      candidates: 155,
      passed: 74,
      rate: '47.74',
      programId: 'netanya_law',
    },
    {
      school: 'הקריה האקדמית אונו',
      studiedAt: 'בקריה האקדמית אונו',
      candidates: 533,
      passed: 225,
      rate: '42.21',
      programId: 'ono_law',
    },
    { school: 'המכללה האקדמית צפת', candidates: 28, passed: 10, rate: '35.71' },
    {
      school: 'שערי מדע ומשפט',
      studiedAt: 'בשערי מדע ומשפט',
      candidates: 75,
      passed: 25,
      rate: '33.33',
      programId: 'shaare_mishpat_law',
    },
    { school: 'ישראלי שלמד בחו"ל', candidates: 22, passed: 4, rate: '18.18' },
    { school: 'המרכז האקדמי כרמל', candidates: 2, passed: 0, rate: '0.00' },
  ],
  additionalHubProgramIds: [
    'sapir_law',
    'peres_law',
    'ramat_gan_law',
    'netanya_law',
    'shaare_mishpat_law',
  ],
} as const;

export type LawBarOutcomeRow = (typeof lawBarOutcomes.rows)[number];

export function isLawBarOutcomeStale(today = new Date()): boolean {
  const [year, month, day] = lawBarOutcomes.publicationDate.split('-').map(Number);
  const cutoffDay = new Date(Date.UTC(year, month - 1 + 8, day)).toISOString().slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(today);
  const datePart = (type: string) => parts.find((part) => part.type === type)?.value;
  const localDay = `${datePart('year')}-${datePart('month')}-${datePart('day')}`;
  return localDay > cutoffDay;
}
