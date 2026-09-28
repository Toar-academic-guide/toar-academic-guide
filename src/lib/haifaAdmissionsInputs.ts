import { z } from 'zod';

export const HAIFA_ADMISSION_YEAR = 2026;
export const HAIFA_SCORE_PROFILE_KEYS = [
  'haifaBagrutAverage',
  'haifaBagrutYear',
  'haifaPsychometricYear',
] as const;

const year = z.number().int().min(1948).max(HAIFA_ADMISSION_YEAR);
export const haifaAdmissionsInputsShape = {
  haifaBagrutAverage: z.number().min(50).max(130).optional(),
  haifaBagrutYear: year.optional(),
  haifaPsychometricYear: year.optional(),
  haifaPsychometricMonth: z.number().int().min(1).max(12).optional(),
  haifaAdmissionQualification: z.enum(['full_bagrut', 'recognized_equivalent', 'none']).optional(),
  haifaEnglishLevel: z
    .enum(['pre_basic', 'basic', 'advanced_a', 'advanced_b', 'exempt'])
    .optional(),
  haifaHebrewQualification: z
    .enum([
      'hebrew_school',
      'hebrew_psychometric',
      'hebrew_engineer',
      'degree_course',
      'exam',
      'university_exam',
    ])
    .optional(),
  haifaHebrewScore: z.number().int().min(50).max(150).optional(),
  haifaHebrewExamDate: z.iso
    .date()
    .refine((date) => date <= `${HAIFA_ADMISSION_YEAR}-12-31`)
    .optional(),
  haifaScienceUnits: z.number().int().min(0).max(35).optional(),
  haifaOtFailedSelectionAttempts: z.number().int().min(0).max(10).optional(),
  haifaOtUnjustifiedAbsence: z.boolean().optional(),
};
export const haifaProfileInputsSchema = z.object(haifaAdmissionsInputsShape);
export const haifaScoreInputsSchema = haifaProfileInputsSchema
  .pick({
    haifaBagrutAverage: true,
    haifaBagrutYear: true,
    haifaPsychometricYear: true,
  })
  .required();

export type HaifaAdmissionsInputs = z.infer<z.ZodObject<typeof haifaAdmissionsInputsShape>>;
export const HAIFA_PROFILE_KEYS = Object.keys(
  haifaAdmissionsInputsShape,
) as (keyof HaifaAdmissionsInputs)[];
export const HAIFA_QUALIFICATION_PROFILE_KEYS = HAIFA_PROFILE_KEYS.filter(
  (key) => !HAIFA_SCORE_PROFILE_KEYS.some((scoreKey) => scoreKey === key),
);
export const HAIFA_NUMERIC_QUALIFICATION_KEYS = [
  'haifaPsychometricMonth',
  'haifaHebrewScore',
  'haifaScienceUnits',
  'haifaOtFailedSelectionAttempts',
];
export const HAIFA_REQUIRED_INPUT_LABELS: Record<string, string> = {
  haifa_bagrut_average: 'ממוצע בגרות רשמי של חיפה',
  haifa_bagrut_year: 'שנת הבגרות',
  haifa_psychometric_year: 'שנת הפסיכומטרי',
  haifa_psychometric_month: 'חודש הפסיכומטרי',
  haifa_admission_qualification: 'תעודת קבלה מוכרת',
  haifa_english_level: 'רמת אנגלית',
  haifa_hebrew_qualification: 'הבסיס לדרישת העברית',
  haifa_hebrew_score: 'ציון עברית',
  haifa_hebrew_exam_date: 'תאריך מבחן העברית',
  haifa_science_units: 'יחידות מדעיות לסיעוד',
  haifa_ot_failed_selection_attempts: 'ניסיונות מיון בריפוי בעיסוק',
  haifa_ot_unjustified_absence: 'היעדרות מריאיון בריפוי בעיסוק',
  math_units: 'יחידות מתמטיקה',
  math_grade: 'ציון מתמטיקה',
  psychometric_math: 'ציון כמותי',
  psychometric_verbal: 'ציון מילולי',
  psychometric_english: 'ציון אנגלית בפסיכומטרי',
};

export const HAIFA_PROGRAM_ALIASES = [
  ['accounting', 'haifa_accounting'],
  ['biology', 'haifa_biology'],
  ['communication', 'haifa_communication'],
  ['cs', 'haifa_cs'],
  ['economics', 'haifa_economics'],
  ['haifa_infosystems'],
  ['law', 'haifa_law'],
  ['haifa_math'],
  ['nursing', 'haifa_nursing'],
  ['occupational_therapy'],
  ['physiotherapy', 'haifa_physiotherapy'],
  ['political_science', 'haifa_politicalscience'],
  ['psychology', 'haifa_psychology'],
  ['social_work', 'haifa_socialwork'],
  ['haifa_sociology'],
  ['haifa_statistics'],
] as const;
const programIds = new Set<string>(HAIFA_PROGRAM_ALIASES.flat());

export function isHaifaProgram(programId: string): boolean {
  return programIds.has(programId);
}
