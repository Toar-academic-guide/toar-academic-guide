import { INSTITUTION_BY_ID } from '../institutions';
import guide from '../fineArtsGuide.json';
import type { Program } from './types';

const specs = [
  {
    id: 'haifa_fine_arts',
    row: 'haifa_3039',
    institutionId: 'haifa',
    name: 'אמנות יצירה',
    credential: 'B.A.',
    years: 3,
    extra: [
      'במסלולי הסכם, הבגרות והמכינה נדרשת אנגלית ברמת טרום־בסיסי ומעלה. בעברית: יעלנט או מבחן הסיווג של אוניברסיטת חיפה בציון 90 ומעלה, עם השלמה ל־120 בשנה א׳, או סיום קורס עברית באקדמיה במכינה האוניברסיטאית.',
      'באפיק המכינה נדרשת גם ועדת קבלה חוגית, ובמידת הצורך מכינה של סדנאות בטכניקות ובמושגי יסוד באמנות.',
    ],
  },
  {
    id: 'shenkar_fine_arts',
    row: 'shenkar',
    institutionId: 'shenkar',
    name: 'אמנות רב-תחומית',
    credential: 'B.F.A.',
    years: 4,
    extra: [
      'לראיון מביאים גם צילום תעודת זהות ושתי תמונות פספורט. מועמדים לתואר ראשון נדרשים להוכיח שליטה בעברית לפי דרישות שנקר.',
    ],
  },
  {
    id: 'tau_multidisciplinary_arts',
    row: 'tau_0861',
    institutionId: 'tau',
    name: 'התוכנית הרב-תחומית באמנויות',
    credential: 'B.A.',
    years: 3,
    extra: [
      'קיים גם אפיק ללא פסיכומטרי לבעלי תעודת סיום תיכון מחו״ל השקילה לבגרות ישראלית, בממוצע 90 ומעלה בסולם הישראלי.',
      'מקצועות החובה ההומניים הם תנ״ך, הבעה עברית, ידע העם והמדינה או תולדות עם ישראל, היסטוריה, אזרחות, ספרות, מחשבת ישראל, אנגלית ושפה זרה נוספת אם יש. מקצועות האמנות באפיק 5 היחידות: אמנות, מוזיקה, קולנוע או תאטרון.',
      'באפיק המעבר מהאוניברסיטה הפתוחה לתוכנית הדו־חוגית נדרשות 36 נקודות זכות: 18 לפי טבלת ההקבלות בציון 80 לפחות בכל קורס, והיתר מתוך רשימת אפיק המעבר. נדרשת גם עמידה בתנאי החוג השני ורמת אנגלית מתקדמים א׳ עד תחילת הלימודים; הקבלה היא לשנה א׳.',
      'נדרשת עמידה בתנאי הקבלה הכלליים של האוניברסיטה, לרבות דרישות השפה.',
    ],
  },
] as const;

export const fineArtsProgrammes: Program[] = specs.map((spec) => {
  const row = guide.rows.find((candidate) => candidate.id === spec.row)!;
  const institution = INSTITUTION_BY_ID[spec.institutionId].name;
  return {
    id: spec.id,
    name: spec.name,
    awardedCredential: spec.credential,
    institution,
    institutionId: spec.institutionId,
    type: 'academic',
    category: 'אמנות ועיצוב',
    // Same existing fine-arts subject profile; this is not an admissions score.
    profileScore: { AN: 1, TE: 1, CR: 5, SO: 1, LE: 2, OR: 1, DI: 0, ER: 2 },
    admissionType: 'requirements',
    admissionRequirements: [],
    institutionDetails: [
      {
        institutionName: institution,
        durationYears: spec.years,
        estimatedStudentsPerYear: '',
        quantitativeMinRequirement: null,
        englishMinRequirement: null,
        specificAdmissionNotes: [
          row.routes,
          ...(row.exam === 'לא מופיע בתנאי הקבלה' ? [] : [row.exam]),
          ...spec.extra,
        ],
        officialCalculatorUrl: '',
        programUrl: row.sourceUrl,
        admissionsSourceCandidates: [
          {
            id: `${spec.id}:${spec.institutionId}:source:admissions`,
            origin: 'manual',
            specificity: 'program_admissions',
            confidence: 'high',
            url: row.sourceUrl,
          },
        ],
      },
    ],
  };
});

const sourcedIds = new Set(fineArtsProgrammes.map((program) => program.id));
export function isSourcedFineArtsProgrammeId(id: string) {
  return sourcedIds.has(id);
}

/** Keep both static and database-backed legacy cards aligned with the reviewed copy. */
export function applyFineArtsCopy<T extends Program>(program: T): T {
  const rowId =
    program.id === 'bezalel_fine_arts'
      ? 'bezalel'
      : program.id === 'minshar_fine_arts'
        ? 'minshar'
        : undefined;
  if (!rowId) return program;
  const row = guide.rows.find((candidate) => candidate.id === rowId)!;
  const notes = [row.routes, row.exam, ...(row.deadline === 'לא פורסם' ? [] : [row.deadline])];
  return {
    ...program,
    admissionRequirements: notes,
    institutionDetails: program.institutionDetails?.map((detail) => ({
      ...detail,
      specificAdmissionNotes: notes,
      programUrl: row.sourceUrl,
    })),
  };
}
