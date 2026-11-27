import existingRepair from './catalogueContentRepair.json';
import { medicineAdmissionByProgramId, type MedicineAdmissionRow } from './medicineAdmissions';

/** Programme-specific display corrections with first-party source checks. */
export type Issue370Correction = {
  programId: string;
  institutionId: string;
  sourceUrl: string;
  checkedAt: string;
  notes: string[];
  programUrl?: string;
  clearLegacyFacts?: boolean;
  clearAllFacts?: boolean;
  replaceRequirements?: boolean;
  durationYears?: number;
};

const checkedLegacy = '2026-11-14';
const checkedRoutes = '2026-11-17';

const row = (
  programIds: string[],
  institutionId: string,
  sourceUrl: string,
  checkedAt: string,
  notes: string[],
  options: Pick<
    Issue370Correction,
    'clearLegacyFacts' | 'clearAllFacts' | 'replaceRequirements'
  > = {},
): Issue370Correction[] =>
  programIds.map((programId) => ({
    programId,
    institutionId,
    sourceUrl,
    checkedAt,
    notes,
    ...options,
  }));

const medicineCorrection = (
  programId: MedicineAdmissionRow['programId'],
  options: Pick<Issue370Correction, 'clearAllFacts'> = {},
): Issue370Correction[] => {
  const facts = medicineAdmissionByProgramId[programId];
  return row(
    [programId],
    facts.institutionId,
    facts.sourceUrl,
    facts.checkedAt,
    [...facts.childNotes],
    options,
  );
};

const legacy = { clearLegacyFacts: true, replaceRequirements: true };
const hujiBagrutUrl = 'https://info.huji.ac.il/reception-channels/KabalaYeshira_Bagrut';
const haifaCsOldNotes =
  existingRepair.requirements?.find((entry) => entry.programId === 'haifa_cs')?.notes ?? [];
const hujiOldNotes = (id: string) =>
  existingRepair.requirements?.find(
    (entry) => entry.programId === id && entry.institutionId === 'huji',
  )?.notes ?? [];
const hujiBagrutRow = (
  id: string,
  average: number,
  promoted: number,
  programmeUrl: string,
): Issue370Correction => ({
  programId: id,
  institutionId: 'huji',
  sourceUrl: hujiBagrutUrl,
  programUrl: programmeUrl,
  checkedAt: checkedRoutes,
  notes: [
    `ללא פסיכומטרי: ממוצע בגרות ${average} לפחות, או ${promoted} לראויים לקידום. נדרשת עמידה גם בתנאי הקבלה הנוספים של החוג.`,
    ...hujiOldNotes(id).slice(1),
  ],
});

export const ISSUE_370_CORRECTIONS: Issue370Correction[] = [
  ...row(
    ['haifa_socialwork', 'social_work'],
    'haifa',
    'https://admissions.haifa.ac.il/social-welfare-health-sciences/program/3082/',
    checkedLegacy,
    [
      'סכם 615 לפחות; סכם 580–614 הוא טווח המתנה.',
      'נדרשים ריאיון קבלה, אנגלית ברמת בסיסי ועברית 120 למי שחייבים בסיווג.',
    ],
    legacy,
  ),
  ...row(
    ['haifa_law', 'law'],
    'haifa',
    'https://admissions.haifa.ac.il/law/program/3000/',
    checkedLegacy,
    [
      'סכם 680 לפחות; 630–679 הוא טווח המתנה.',
      'נדרשות אנגלית ברמת מתקדמים א׳ ועברית 120 למי שחייבים בסיווג. מסלולי אופק ומיון נוסף כפופים לתנאים נפרדים.',
    ],
    legacy,
  ),
  ...row(
    ['haifa_economics', 'economics'],
    'haifa',
    'https://admissions.haifa.ac.il/social-sciences/program/2482/',
    checkedLegacy,
    [
      'סכם 660 לפחות; 640–659 הוא טווח המתנה.',
      'נדרשות מתמטיקה 4 יחידות בציון 80 או 5 יחידות בציון 60 לפחות, אנגלית ברמת בסיסי ועברית 120 למי שחייבים בסיווג. מסלול אופק הוא מסלול מותנה ונפרד.',
    ],
    legacy,
  ),
  ...row(
    ['haifa_biology', 'biology'],
    'haifa',
    'https://admissions.haifa.ac.il/natural-sciences/program/3036/',
    checkedLegacy,
    [
      'סכם 640 לפחות; סכם 620–639 הוא טווח המתנה.',
      'מתמטיקה: 3 יחידות בציון 90, 4 יחידות בציון 80 או 5 יחידות בציון 70 לפחות. נדרשות גם אנגלית ברמת טרום־בסיסי ועברית לפי כללי האוניברסיטה.',
    ],
    legacy,
  ),
  ...row(
    ['colmgmt_accounting', 'accounting'],
    'colman',
    'https://www.colman.ac.il/academics/ba/accounting/',
    checkedLegacy,
    [
      'קבלה על סמך בגרות: ממוצע משוקלל של המכללה 100 לפחות.',
      'במסלול המשולב נדרשים פסיכומטרי 555 לפחות, ציון כמותי 100 לפחות ועמידה בציון המשוקלל שקובעת המכללה.',
    ],
    legacy,
  ),
  ...row(
    ['colmgmt_infosystems'],
    'colman',
    'https://www.colman.ac.il/academics/ba/management-information-systems/',
    checkedLegacy,
    [
      'התוכנית משלבת מערכות מידע ומנהל עסקים. במסלול בגרות נדרש ממוצע משוקלל 95 לפחות ומתמטיקה 5 יחידות בציון 70 או 4 יחידות בציון 80 לפחות.',
      'ממוצע 85–94.4 מאפשר בדיקת קבלה על תנאי; במסלולים משולבים נדרש גם השקלול של המכללה.',
    ],
    legacy,
  ),
  ...row(
    ['hit_visual_comm'],
    'hit',
    'https://www.hit.ac.il/academic/design/visual-communications/',
    checkedLegacy,
    ['אין ציון סף קבוע לקבלה. נדרשת זכאות לבגרות והקבלה נקבעת לאחר תרגילים, ריאיון ותיק עבודות.'],
    legacy,
  ),
  ...row(
    ['ono_business', 'business'],
    'ono',
    'https://www.ono.ac.il/curriculum/',
    checkedRoutes,
    [
      'תנאי הקבלה משתנים בין ההתמחויות במנהל עסקים. בדקו את תנאי ההתמחות המבוקשת באתר הקריה האקדמית אונו.',
    ],
    legacy,
  ),
  ...row(
    ['ono_cs', 'cs'],
    'ono',
    'https://www.ono.ac.il/curriculum/computer-science-bsc/',
    checkedLegacy,
    [
      'לתשפ״ז מפורסמים מסלולי קבלה לפי בגרות, פסיכומטרי או שילוב ציונים. דרישות המתמטיקה תלויות במסלול; בדקו את התנאים המלאים באתר המכללה.',
    ],
    legacy,
  ),
  ...row(
    ['telhai_biology', 'biology'],
    'telhai',
    'https://www.telhai.ac.il/תהליך_הקבלה',
    checkedLegacy,
    ['בתל־חי מופיע מסלול במדעי החי. בדקו באתר המכללה אם זה המסלול שמתאים לכם.'],
    { ...legacy, clearAllFacts: true },
  ),
  ...row(
    ['telhai_cs', 'cs'],
    'telhai',
    'https://www.telhai.ac.il/BSc_מדעי_המחשב',
    checkedLegacy,
    ['בדקו את תנאי הקבלה המעודכנים במסלול מדעי המחשב באתר תל־חי.'],
    { ...legacy, clearAllFacts: true },
  ),
  ...row(
    ['telhai_socialwork', 'social_work'],
    'telhai',
    'https://www.telhai.ac.il/תהליך_הקבלה',
    checkedLegacy,
    ['תנאי הקבלה העדכניים לעבודה סוציאלית מפורטים באתר תל־חי.'],
    { ...legacy, clearAllFacts: true },
  ),
  ...row(
    ['tlvyaffo_economics', 'economics'],
    'mta',
    'https://www.mta.ac.il/program/management_economics_ba',
    checkedLegacy,
    ['המכללה מפרסמת מסלול משולב בכלכלה וניהול. בדקו את שם המסלול ותנאיו באתר המכללה לפני ההרשמה.'],
    { ...legacy, clearAllFacts: true },
  ),
  ...row(
    ['tau_psychology', 'psychology'],
    'tau',
    'https://go.tau.ac.il/he/social-sciences/ba/psychology?s=15870',
    checkedRoutes,
    [
      'בסמסטר א׳ תשפ״ז: סף קבלה בציון התאמה 660; סף דחייה 659. יש לעמוד גם בתנאי הקבלה הכלליים של האוניברסיטה.',
    ],
  ),
  ...row(
    ['tau_cs', 'cs'],
    'tau',
    'https://go.tau.ac.il/he/exact/ba/computer?s=17598',
    checkedRoutes,
    [
      'בסמסטר ב׳ תשפ״ז: סף קבלה בציון התאמה 705; סף דחייה 695.',
      'נדרשות מתמטיקה 5 יחידות בציון 80 לפחות, או 4 יחידות בציון 88 לפחות; לחלופות עם מבחן סיווג יש לבדוק את התנאים המלאים באתר האוניברסיטה.',
    ],
  ),
  ...row(
    ['tau_datascience', 'datascience'],
    'tau',
    'https://go.tau.ac.il/he/exact/ba/datascience?s=17322',
    checkedRoutes,
    [
      'בסמסטר א׳ תשפ״ז: סף קבלה בציון התאמה למדעים מדויקים 689; סף דחייה 688.',
      'נדרשת עדיפות ראשונה, מתמטיקה 5 יחידות בציון 80 לפחות ומקצוע מדעי או טכנולוגי נוסף לפי תנאי התוכנית.',
    ],
  ),
  ...row(
    ['tau_ee', 'ee'],
    'tau',
    'https://go.tau.ac.il/he/engineering/ba/electrical?s=17661',
    checkedRoutes,
    [
      'בסמסטר ב׳ תשפ״ז: סף קבלה בציון התאמה להנדסה 725; סף דחייה 695.',
      'נדרשות מתמטיקה 5 יחידות בציון 90 לפחות או 4 יחידות בציון 95 עם בחינת סיווג, ועמידה בתנאי הפיזיקה והפסיכומטרי של התוכנית.',
    ],
  ),
  ...row(
    ['tau_industrial', 'industrial'],
    'tau',
    'https://go.tau.ac.il/he/engineering/ba/industrial-engineering?s=15568',
    checkedRoutes,
    [
      'בסמסטר א׳ תשפ״ז: סף קבלה בציון התאמה להנדסה 667; סף דחייה 666.',
      'נדרשות מתמטיקה 5 יחידות בציון 75 לפחות או 4 יחידות בציון 85 עם בחינת סיווג, ועמידה בתנאי הפיזיקה והפסיכומטרי של התוכנית.',
    ],
  ),
  ...row(
    ['tau_me', 'me'],
    'tau',
    'https://go.tau.ac.il/he/engineering/ba/mechanical?s=15547',
    checkedRoutes,
    [
      'בסמסטר א׳ תשפ״ז: סף קבלה בציון התאמה להנדסה 650; סף דחייה 649.',
      'נדרשות מתמטיקה 5 יחידות בציון 75 לפחות או 4 יחידות בציון 85 עם בחינת סיווג, ועמידה בתנאי הפיזיקה והפסיכומטרי של התוכנית.',
    ],
  ),
  ...row(
    ['tau_biology', 'biology'],
    'tau',
    'https://go.tau.ac.il/he/life/ba/bio?s=15530',
    checkedRoutes,
    [
      'בסמסטר א׳ תשפ״ז: סף קבלה בציון התאמה 576; סף דחייה 575. קיימים גם מסלולי קבלה חלופיים באתר האוניברסיטה.',
    ],
  ),
  ...row(
    ['tau_socialwork', 'social_work'],
    'tau',
    'https://go.tau.ac.il/he/social-sciences/ba/social-work?s=15899',
    checkedRoutes,
    [
      'בסמסטר א׳ תשפ״ז: סף קבלה בציון התאמה 580; סף דחייה 579. בית הספר רשאי לזמן מועמדים לריאיון אישי או קבוצתי.',
    ],
  ),
  ...row(
    ['tau_occupational_therapy', 'occupational_therapy'],
    'tau',
    'https://go.tau.ac.il/he/med/ba/occu?s=15394',
    checkedRoutes,
    [
      'בסמסטר א׳ תשפ״ז: סף קבלה בציון התאמה 607; סף דחייה 606.',
      'נדרשים פסיכומטרי 600 לפחות, ריאיון אישי, ועמידה בתנאי המדעים והשפה של התוכנית.',
    ],
  ),
  ...row(
    ['tau_economics', 'economics'],
    'tau',
    'https://go.tau.ac.il/he/social-sciences/ba/economics?s=15831',
    checkedRoutes,
    [
      'בסמסטר א׳ תשפ״ז: סף קבלה בציון התאמה 610; סף דחייה 609. יש לעמוד גם בתנאי הקבלה הכלליים של האוניברסיטה.',
    ],
  ),
  {
    programId: 'huji_psychology',
    institutionId: 'huji',
    sourceUrl: hujiBagrutUrl,
    programUrl: 'https://info.huji.ac.il/bachelor/Psychology',
    checkedAt: checkedRoutes,
    durationYears: 3,
    notes: [
      ...hujiOldNotes('huji_psychology').slice(0, 2),
      'ללא פסיכומטרי: ממוצע בגרות 113 לפחות, או 109.5 לראויים לקידום. נדרשת עמידה גם בתנאי הקבלה הנוספים של החוג.',
      ...hujiOldNotes('huji_psychology').slice(2),
    ],
  },
  ...row(['huji_cs'], 'huji', hujiBagrutUrl, checkedRoutes, [
    'ללא פסיכומטרי: ממוצע בגרות 114 לפחות, או 110.5 לראויים לקידום. נדרשת עמידה גם בתנאי המתמטיקה, השפה ושאר תנאי החוג.',
  ]),
  ...row(['huji_economics'], 'huji', hujiBagrutUrl, checkedRoutes, [
    'ללא פסיכומטרי: ממוצע בגרות 110 לפחות, או 106.5 לראויים לקידום. נדרשת עמידה גם בתנאי הקבלה הנוספים של החוג.',
  ]),
  hujiBagrutRow('huji_law', 113, 109.5, 'https://info.huji.ac.il/bachelor/Law'),
  hujiBagrutRow('huji_accounting', 110, 106.5, 'https://info.huji.ac.il/bachelor/Accounting'),
  hujiBagrutRow(
    'huji_business',
    110,
    106.5,
    'https://info.huji.ac.il/bachelor/Business-Administration',
  ),
  ...row(
    ['haifa_cs'],
    'haifa',
    'https://admissions.haifa.ac.il/computer-information-science/program/3210/',
    checkedRoutes,
    [
      ...haifaCsOldNotes.slice(0, 2),
      'מסלול אופק ללא פסיכומטרי, החל מתשפ״ז: ממוצע בגרות משוקלל 105 לפחות, מתמטיקה 4 יחידות בציון 85 או 5 יחידות בציון 75 לפחות, ועמידה בדרישות השפה. נדרשים קורות חיים; הקבלה מותנית בהחלטת ועדת החוג ואינה מובטחת.',
      ...haifaCsOldNotes.slice(2),
    ],
  ),
  ...row(
    ['technion_civil'],
    'technion',
    'https://admissions.technion.ac.il/acceptance-without-psychometric-exam/',
    checkedRoutes,
    [
      'בסמסטר א׳ תשפ״ז בלבד, להנדסה אזרחית ולהנדסת הסביבה בנפרד: מסלול ללא פסיכומטרי עם ממוצע בגרות רגיל 90 לפחות, אנגלית, מתמטיקה ופיזיקה 5 יחידות בציון 95 לפחות בכל אחד, וריאיון בפקולטה.',
      'התנאים האלה חלים על מסלול הבגרות המצוינת בלבד; תנאי המסלול הרגיל מפורטים באתר הטכניון.',
    ],
  ),
  ...row(
    ['reichman_cs', 'cs'],
    'reichman',
    'https://www.runi.ac.il/media/j1lp0sva/טבלת-ספים-לאתר-תשפז-281026.pdf',
    checkedRoutes,
    [
      'לתשפ״ז, מסלול ציון מתואם: 705 לפחות וגם פסיכומטרי 660 לפחות; מתמטיקה 5 יחידות בציון 85 לפחות.',
      'מסלול בגרות: ממוצע 104 לפחות, מתמטיקה 5 יחידות בציון 75 לפחות, ומקצוע מדעי מאושר נוסף בהיקף 5 יחידות בציון 85 לפחות.',
      'מסלול פסיכומטרי: 720 לפחות עם זכאות לבגרות ומתמטיקה 5 יחידות בציון 80 לפחות. קיימות גם חלופות עם הכנה במתמטיקה.',
    ],
    { clearLegacyFacts: true },
  ),
  ...medicineCorrection('huji_medicine'),
  ...medicineCorrection('technion_medicine'),
  ...medicineCorrection('tau_medicine'),
  ...medicineCorrection('bgu_medicine'),
  ...medicineCorrection('biu_medicine', { clearAllFacts: true }),
];

export const ISSUE_370_HIDDEN_PROGRAM_IDS = [
  'telhai_nursing',
  'ono_socialwork',
  'tlvyaffo_socialwork',
] as const;

export const ISSUE_370_LINK_ONLY_PROGRAM_IDS = new Set([
  'telhai_biology',
  'telhai_cs',
  'telhai_socialwork',
  'tlvyaffo_economics',
]);

// These pages now show a different TAU route from the calculator's reviewed one.
export { ISSUE_370_UNREVIEWED_CALCULATOR_PAIRS } from './unreviewedCalculatorPairs';

export const ISSUE_370_REPAIR_IDS = new Set([
  ...ISSUE_370_CORRECTIONS.map((row) => row.programId),
  ...ISSUE_370_HIDDEN_PROGRAM_IDS,
]);
