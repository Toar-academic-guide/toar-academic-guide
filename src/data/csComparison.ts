export interface CsComparisonRow {
  institution: string;
  programId: string;
  route: string;
  value: string;
  scale: string;
  cycle: string;
  sourceUrl: string;
  checkedDate: string;
  note?: string;
  numeric: boolean;
}

export const csOfficialUrls = {
  technion:
    'https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/',
  tau: 'https://go.tau.ac.il/he/exact/ba/computer?s=17598',
  haifa: 'https://admissions.haifa.ac.il/computer-information-science/program/3210/',
  reichman:
    'https://www.runi.ac.il/media/j1lp0sva/%D7%98%D7%91%D7%9C%D7%AA-%D7%A1%D7%A4%D7%99%D7%9D-%D7%9C%D7%90%D7%AA%D7%A8-%D7%AA%D7%A9%D7%A4%D7%96-281026.pdf',
  huji: 'https://info.huji.ac.il/node/777',
  bgu: 'https://www.bgu.ac.il/welcome/ba/catalog/categories/computer-science/',
  ariel: 'https://www.ariel.ac.il/wp/registration-and-acceptance/',
  biu: 'https://www.biu.ac.il/en/node/376',
} as const;

const checkedDate = '14.11.2026';

export const csAnswer =
  'כל מוסד מפרסם תנאי קבלה למדעי המחשב בסולם משלו: סכם בטכניון ובחיפה, ציון התאמה בתל אביב, וציון מתואם או ממוצע בגרות ברייכמן. משווים כל ציון רק לסף של אותו מוסד. בטבלה מופיעים המסלולים, המחזור, המקור ותאריך הבדיקה. במחשבון MyWay אפשר לבדוק את המסלולים הנתמכים בעזרת ציוני הבגרות והפסיכומטרי.';

export const csComparisonRows: readonly CsComparisonRow[] = [
  {
    institution: 'הטכניון',
    programId: 'technion_cs',
    route: 'סכם',
    value: '91',
    scale: 'סכם הטכניון',
    cycle: 'סמסטר אביב תשפ״ז (מרץ 2027)',
    sourceUrl: csOfficialUrls.technion,
    checkedDate,
    note: 'הסף באתר הוא הערכה ועשוי להשתנות; נדרשת גם עמידה בדרישות האפיק.',
    numeric: true,
  },
  {
    institution: 'אוניברסיטת תל אביב',
    programId: 'tau_cs',
    route: 'ציון התאמה',
    value: 'סף קבלה 705 · סף דחייה 695',
    scale: 'ציון התאמה של אוניברסיטת תל אביב',
    cycle: 'סמסטר ב׳ תשפ״ז (מרץ 2027)',
    sourceUrl: csOfficialUrls.tau,
    checkedDate,
    note: 'האתר הרשמי מציין שהמידע נכון ל־11.11.2026.',
    numeric: true,
  },
  {
    institution: 'אוניברסיטת חיפה',
    programId: 'haifa_cs',
    route: 'סכם',
    value: '700 ומעלה; טווח המתנה 680–699',
    scale: 'סכם של אוניברסיטת חיפה',
    cycle: 'כמפורסם באתר המוסד',
    sourceUrl: csOfficialUrls.haifa,
    checkedDate,
    note: 'מתמטיקה: 4 יחידות בציון 90 או 5 יחידות בציון 75 לפחות; נדרשים סיווג אנגלית טרום בסיסי וציון 120 ביעלנט או מעבר מבחן סיווג בעברית או קורס עברית. מועמדים בטווח ההמתנה נידונים בוועדת החוג.',
    numeric: true,
  },
  {
    institution: 'אוניברסיטת חיפה',
    programId: 'haifa_cs',
    route: 'מסלול אופק לקראת תואר — בגרות ללא פסיכומטרי',
    value: 'ממוצע בגרות משוקלל 105 ומעלה',
    scale: 'ממוצע בגרות משוקלל',
    cycle: 'החל מתשפ״ז',
    sourceUrl: csOfficialUrls.haifa,
    checkedDate,
    note: 'מתמטיקה: 4 יחידות בציון 85 או 5 יחידות בציון 75 לפחות. נדרשים סיווג אנגלית טרום בסיסי, ציון 120 ביעלנט או מעבר מבחן סיווג בעברית או קורס עברית, וקורות חיים. הקבלה כפופה לוועדת החוג ולמקום פנוי; מסלול הקדם אינו מעמד מן המניין עד להשלמתו.',
    numeric: true,
  },
  {
    institution: 'אוניברסיטת רייכמן',
    programId: 'reichman_cs',
    route: 'ציון מתואם',
    value: '705 וגם פסיכומטרי 660 לפחות',
    scale: 'ציון מתואם של רייכמן ופסיכומטרי',
    cycle: 'תשפ״ז',
    sourceUrl: csOfficialUrls.reichman,
    checkedDate,
    note: 'במסלול זה נדרשות 5 יחידות מתמטיקה בציון 85 לפחות.',
    numeric: true,
  },
  {
    institution: 'אוניברסיטת רייכמן',
    programId: 'reichman_cs',
    route: 'בגרות',
    value: 'ממוצע בגרות 104 ומעלה',
    scale: 'ממוצע בגרות',
    cycle: 'תשפ״ז',
    sourceUrl: csOfficialUrls.reichman,
    checkedDate,
    note: 'נדרשות 5 יחידות מתמטיקה בציון 75 ו־5 יחידות בפיזיקה, כימיה, ביולוגיה או מדעי המחשב (לא תכנון מערכות) בציון 85 לפחות.',
    numeric: true,
  },
  {
    institution: 'אוניברסיטת רייכמן',
    programId: 'reichman_cs',
    route: 'פסיכומטרי עם זכאות לבגרות',
    value: '720 ומעלה',
    scale: 'ציון פסיכומטרי',
    cycle: 'תשפ״ז',
    sourceUrl: csOfficialUrls.reichman,
    checkedDate,
    note: 'נדרשות 5 יחידות מתמטיקה בציון 80 לפחות.',
    numeric: true,
  },
  {
    institution: 'האוניברסיטה העברית בירושלים',
    programId: 'huji_cs',
    route: 'מידע באתר המוסד',
    value: '—',
    scale: '—',
    cycle: '—',
    sourceUrl: csOfficialUrls.huji,
    checkedDate,
    numeric: false,
  },
  {
    institution: 'אוניברסיטת בן־גוריון בנגב',
    programId: 'bgu_cs',
    route: 'מידע באתר המוסד',
    value: '—',
    scale: '—',
    cycle: '—',
    sourceUrl: csOfficialUrls.bgu,
    checkedDate,
    numeric: false,
  },
  {
    institution: 'אוניברסיטת אריאל',
    programId: 'ariel_cs',
    route: 'מידע באתר המוסד',
    value: '—',
    scale: '—',
    cycle: '—',
    sourceUrl: csOfficialUrls.ariel,
    checkedDate,
    numeric: false,
  },
  {
    institution: 'אוניברסיטת בר־אילן',
    programId: 'biu_cs',
    route: 'מידע באתר המוסד',
    value: '—',
    scale: '—',
    cycle: '—',
    sourceUrl: csOfficialUrls.biu,
    checkedDate,
    numeric: false,
  },
];

export const csReichmanHubRequirements = [
  'ציון מתואם 705 ומעלה וגם פסיכומטרי 660 לפחות; או ממוצע בגרות 104 ומעלה; או פסיכומטרי 720 ומעלה עם זכאות לבגרות.',
  'במסלול המתואם נדרשות 5 יחידות מתמטיקה בציון 85 לפחות. במסלול הבגרות נדרשות 5 יחידות מתמטיקה בציון 75 ו־5 יחידות בפיזיקה, כימיה, ביולוגיה או מדעי המחשב (לא תכנון מערכות) בציון 85 לפחות.',
  'במסלול הפסיכומטרי נדרשות 5 יחידות מתמטיקה בציון 80 לפחות.',
] as const;

export const csHubAdmissionSourceUrls: Partial<Record<string, string>> = {
  tau: csOfficialUrls.tau,
  huji: csOfficialUrls.huji,
  technion: csOfficialUrls.technion,
  reichman: csOfficialUrls.reichman,
};

export const csFaq = [
  {
    question: 'אפשר להשוות סכם 700 בחיפה לסכם 91 בטכניון?',
    answer:
      'לא ישירות. כל מוסד מחשב ציון בסולם משלו: הטכניון מפרסם סכם 91 כהערכה לסמסטר אביב תשפ״ז, חיפה מפרסמת סכם 700, ותל אביב מפרסמת ציון התאמה 705. משווים כל ציון רק לסף של אותו מוסד.',
  },
  {
    question: 'אפשר להתקבל למדעי המחשב בלי פסיכומטרי?',
    answer:
      'כן, יש מסלולים כאלה. בחיפה מסלול אופק לקראת תואר מתחיל מממוצע בגרות משוקלל 105, עם דרישות במתמטיקה, באנגלית ובעברית, קורות חיים ואישור ועדת החוג. ברייכמן מסלול הבגרות דורש ממוצע 104, מתמטיקה 5 יחידות בציון 75 ומקצוע מדעי 5 יחידות בציון 85 לפחות.',
  },
  {
    question: 'מתי מתפרסמים ספי הקבלה לשנה הבאה?',
    answer:
      'מועדי העדכון משתנים בין המוסדות. בדקו בעמוד הקבלה הרשמי של כל מוסד את הספים למחזור שמעניין אתכם.',
  },
  {
    question: 'איך יודעים איפה אני מתקבל/ת?',
    answer:
      'משווים את הציונים שלכם לתנאי הקבלה של כל מוסד. במחשבון MyWay אפשר לבדוק מסלולים נתמכים בעזרת ציוני הבגרות והפסיכומטרי; במסלולים אחרים יש לעיין בדרישות המלאות של המוסד.',
  },
] as const;

export const csComparedProgramIds = new Set(csComparisonRows.map((row) => row.programId));
