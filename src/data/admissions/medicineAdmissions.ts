/** Source-checked six-year medicine facts shared by the hub and its five child pages. */
export type MedicineCell =
  { kind: 'value'; text: string; cycle?: string } | { kind: 'notPublished' } | { kind: 'pending' };

export type MedicineAdmissionRow = {
  programId:
    'huji_medicine' | 'technion_medicine' | 'tau_medicine' | 'bgu_medicine' | 'biu_medicine';
  institutionId: 'huji' | 'technion' | 'tau' | 'bgu' | 'biu';
  institution: string;
  minimumPsychometric: MedicineCell;
  stageOne: MedicineCell;
  screening: MedicineCell;
  screeningWeight: MedicineCell;
  lastFinal: MedicineCell;
  registrationDeadline: MedicineCell;
  lastPsychometricSitting: MedicineCell;
  footnote: string;
  sourceUrl: string;
  secondarySourceUrl?: string;
  checkedAt: '2026-11-27';
  childNotes: readonly string[];
};

const value = (text: string, cycle?: string): MedicineCell => ({ kind: 'value', text, cycle });
const notPublished: MedicineCell = { kind: 'notPublished' };
const checkedAt = '2026-11-27';

const huji = {
  psychometric: '700',
  stageOne: '25.186',
  screeningMinimum: '200',
  screeningWeight: '60%',
  academicWeight: '40%',
  lastFinal: '25.708',
  deadline: '30.04.2027',
  lastSitting: 'אפריל 2027',
  mathFour: '80',
  mathFive: '70',
} as const;

const technion = {
  screeningMinimum: '190',
  screeningWeight: '70%',
  sechemWeight: '30%',
  lastFinal: '205',
} as const;

const tau = {
  psychometric: '700',
  english: '120',
  oldDeadline: '30.04.2026',
  oldSitting: 'מרץ/אפריל 2026',
} as const;

const biu = {
  psychometric: '680',
  bagrut: '101',
  english: '120',
  mathFourUnits: '4',
  mathFourGrade: '85',
  mathFiveUnits: '5',
  mathFiveGrade: '80',
} as const;

export const MEDICINE_ADMISSIONS: readonly MedicineAdmissionRow[] = [
  {
    programId: 'huji_medicine',
    institutionId: 'huji',
    institution: 'האוניברסיטה העברית',
    minimumPsychometric: value(`${huji.psychometric} (רב־תחומי)`),
    stageOne: value(`סף קוגניטיבי ${huji.stageOne}`, 'תשפ״ז'),
    screening: value('מו״ר/מרק״ם; לנרשמים לעברית בלבד: מרק״ם'),
    screeningWeight: value(
      `${huji.screeningMinimum} לפחות למעבר לשלב ג׳; ציון סופי: ${huji.screeningWeight} מו״ר/מרק״ם + ${huji.academicWeight} בגרות ופסיכומטרי משוקלל`,
    ),
    lastFinal: value(huji.lastFinal, 'תשפ״ז'),
    registrationDeadline: value(huji.deadline, 'תשפ״ח'),
    lastPsychometricSitting: value(huji.lastSitting, 'תשפ״ח'),
    footnote: `מתמטיקה: מומלץ ${huji.mathFour} ב־4 יח״ל או ${huji.mathFive} ב־5 יח״ל; אחרת נדרש קורס נוסף בשנה א׳.`,
    sourceUrl: 'https://info.huji.ac.il/bachelor/Medicine',
    checkedAt,
    childNotes: [
      `נדרש פסיכומטרי רב־תחומי ${huji.psychometric} לפחות. סף המיון הקוגניטיבי לשלב א׳ בתשפ״ז היה ${huji.stageOne}.`,
      `למעבר משלב מרק״ם לשלב הסופי נדרש ציון ${huji.screeningMinimum} לפחות. הציון הסופי משקלל מרק״ם ${huji.screeningWeight} ובגרות ופסיכומטרי ${huji.academicWeight}; סף הקבלה בתשפ״ז היה ${huji.lastFinal}.`,
      `לתשפ״ח: ההרשמה עד ${huji.deadline}, ומועד ${huji.lastSitting} הוא מועד הפסיכומטרי האחרון שיתקבל.`,
    ],
  },
  {
    programId: 'technion_medicine',
    institutionId: 'technion',
    institution: 'הטכניון',
    minimumPsychometric: notPublished,
    stageOne: value('סף הזימון למו״ר לפי סכם מתפרסם לקראת סוף מאי'),
    screening: value('מו״ר; לנרשמים גם לעברית: הגרלה בין מו״ר למרק״ם'),
    screeningWeight: value(
      `מו״ר מתחת ל־${technion.screeningMinimum} – נדחה; במסלול הסכם ${technion.screeningWeight} מו״ר סופי + ${technion.sechemWeight} סכם`,
      'תשפ״ז',
    ),
    lastFinal: value(`ציון מו״ר משוקלל ${technion.lastFinal}`, 'תשפ״ז'),
    registrationDeadline: notPublished,
    lastPsychometricSitting: notPublished,
    footnote: 'לתשפ״ז נבחר ציון המו״ר הגבוה משנות 2023–2026.',
    sourceUrl: 'https://admissions.technion.ac.il/2026/09/07/mor-calculation-for-2026/',
    secondarySourceUrl: 'https://admissions.technion.ac.il/mor-test/',
    checkedAt,
    childNotes: [
      `בתשפ״ז ציון מו״ר מתחת ל־${technion.screeningMinimum} אינו מאפשר קבלה. במסלול הסכם, הציון הסופי משקלל ${technion.screeningWeight} מו״ר ו־${technion.sechemWeight} סכם.`,
      `בתשפ״ז סף ציון הקבלה המשוקלל במו״ר הוא ${technion.lastFinal}. בדקו את תנאי המחזור הבא באתר הטכניון.`,
    ],
  },
  {
    programId: 'tau_medicine',
    institutionId: 'tau',
    institution: 'אוניברסיטת תל אביב',
    minimumPsychometric: value(tau.psychometric),
    stageOne: notPublished,
    screening: value('מו״ר/מרק״ם'),
    screeningWeight: value('70% מבחנים לא קוגניטיביים + 30% ציון התאמה ראשוני', 'תשפ״ז'),
    lastFinal: notPublished,
    registrationDeadline: value(`תשפ״ז: ${tau.oldDeadline} · תשפ״ח: יעודכן`),
    lastPsychometricSitting: value(`תשפ״ז: ${tau.oldSitting} · תשפ״ח: יעודכן`),
    footnote: `אנגלית ${tau.english} או חלופה מוכרת; רפואה בעדיפות ראשונה, למעט מי שרשמו רפואה ארבע־שנתית בעדיפות ראשונה.`,
    sourceUrl: 'https://go.tau.ac.il/he/med/ba/med-doc?v=new-info',
    secondarySourceUrl: 'https://en-go.tau.ac.il/Faculty-of-Medicine',
    checkedAt,
    childNotes: [
      `נדרשים פסיכומטרי ${tau.psychometric} לפחות ואנגלית ${tau.english} לפחות או חלופה מוכרת. יש לרשום רפואה בעדיפות ראשונה, למעט בעלי תואר ראשון שרושמים רפואה ארבע־שנתית בעדיפות ראשונה.`,
      'בתשפ״ז: הציון הסופי משקלל 70% מבחנים לא קוגניטיביים ו־30% ציון התאמה ראשוני. מועדי ההרשמה והבחינות לתשפ״ח יעודכנו באתר האוניברסיטה.',
    ],
  },
  {
    programId: 'bgu_medicine',
    institutionId: 'bgu',
    institution: 'אוניברסיטת בן־גוריון',
    minimumPsychometric: value('סף פסיכומטרי וסכם נקבע בכל שנה'),
    stageOne: value('עמידה בסף הפסיכומטרי והסכם → זימון למבחן ממוחשב'),
    screening: value('מבחן ממוחשב של בן־גוריון ושני ראיונות קבלה'),
    screeningWeight: value('הקבלה לפי שקלול שני הראיונות'),
    lastFinal: notPublished,
    registrationDeadline: notPublished,
    lastPsychometricSitting: notPublished,
    footnote: 'אנגלית ברמת מתקדמים ב׳; רפואה בעדיפות ראשונה בלבד.',
    sourceUrl: 'https://www.bgu.ac.il/welcome/ba/catalog/categories/medical-school/',
    checkedAt,
    childNotes: [
      'לאחר עמידה בתנאי הסף מתקיימים מבחן מיון ממוחשב ושני ראיונות קבלה. יש לרשום רפואה בעדיפות ראשונה.',
      'בדקו את ספי הציונים למחזור המבוקש במערכת המועמדים של האוניברסיטה.',
    ],
  },
  {
    programId: 'biu_medicine',
    institutionId: 'biu',
    institution: 'אוניברסיטת בר־אילן',
    minimumPsychometric: value(
      `${biu.psychometric}; בגרות משוקללת ${biu.bagrut}; אנגלית ${biu.english}`,
    ),
    stageOne: notPublished,
    screening: value('פרטים באתר בר־אילן'),
    screeningWeight: notPublished,
    lastFinal: notPublished,
    registrationDeadline: notPublished,
    lastPsychometricSitting: value('מרץ/אפריל של שנת ההרשמה', 'תשפ״ח'),
    footnote:
      'מתשפ״ח המיון מתבסס על הפסיכומטרי הדו־תחומי, וסיווג האנגלית נקבע באמירנט. ההרשמה לתשפ״ח טרם החלה.',
    sourceUrl: 'https://medicine.biu.ac.il/six_year_track_application_requirements',
    checkedAt,
    childNotes: [
      `לתוכנית השש־שנתית נדרשים פסיכומטרי ${biu.psychometric} לפחות, ממוצע בגרות משוקלל ${biu.bagrut} לפחות ואנגלית ${biu.english} לפחות.`,
      `נדרשות מתמטיקה ${biu.mathFourUnits} יחידות בציון ${biu.mathFourGrade} או ${biu.mathFiveUnits} יחידות בציון ${biu.mathFiveGrade} לפחות, ואזרחות ישראלית או תושבות קבע. ההרשמה לתשפ״ח טרם החלה.`,
    ],
  },
] as const;

export const medicineAdmissionByProgramId = Object.fromEntries(
  MEDICINE_ADMISSIONS.map((row) => [row.programId, row]),
) as Record<MedicineAdmissionRow['programId'], MedicineAdmissionRow>;

export function medicineAdmissionForProgramId(programId: string): MedicineAdmissionRow | undefined {
  return MEDICINE_ADMISSIONS.find((row) => row.programId === programId);
}
