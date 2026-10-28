import { HAIFA_REQUIRED_INPUT_LABELS } from './haifaAdmissionsInputs';
import type {
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';

/** Display precision only: API values and admission decisions remain untouched. */
export function formatSekhemNumber(value: number, institutionId: string): string {
  return String(institutionId === 'reichman' ? Math.round(value) : value);
}

const inputLabels: Partial<Record<AdmissionsRequiredInput, string>> = {
  ...HAIFA_REQUIRED_INPUT_LABELS,
  haifa_bagrut_average: 'ממוצע הבגרות בחיפה',
  bagrut_subject_record: 'יחידות וציונים בכל מקצועות הבגרות',
  bagrut_average: 'ממוצע הבגרות',
  bagrut_profile_version: 'פרטי תעודת הבגרות',
  bagrut_sector: 'מגזר תעודת הבגרות',
  bgu_bagrut_average: 'ממוצע הבגרות לפי כללי בן־גוריון',
  tau_bagrut_average: 'ממוצע הבגרות לפי כללי תל אביב',
  tau_physiotherapy_route: 'אפיק הקבלה לפיזיותרפיה',
  tau_physiotherapy_requirements: 'תנאי הקבלה לפיזיותרפיה',
  tau_management_requirements: 'תנאי הקבלה לניהול',
  psychometric_overall: 'ציון פסיכומטרי כללי',
  english_units: 'יחידות באנגלית',
  english_grade: 'ציון הבגרות באנגלית',
  physics_units: 'יחידות בפיזיקה',
  physics_grade: 'ציון בפיזיקה',
  cs_units: 'יחידות במדעי המחשב',
  cs_grade: 'ציון במדעי המחשב',
  huji_bagrut_average: 'ממוצע הבגרות הרשמי של העברית',
  huji_medicine_affirmative_action: 'מעמד ראויים לקידום לרפואה בעברית',
  huji_medicine_route: 'אפיק הקבלה לרפואה בעברית',
  huji_medicine_psychometric_date: 'תאריך הפסיכומטרי לרפואה בעברית',
  huji_medicine_residency: 'אזרחות או תושבות קבע לרפואה בעברית',
  huji_medicine_registration: 'הרשמה והמסמכים לרפואה בעברית',
  huji_medicine_prior_study: 'לימודים קודמים ברפואה או במקצועות הבריאות',
  huji_medicine_english_basis: 'הוכחת אנגלית לרפואה בעברית',
  huji_medicine_english_score: 'ציון אנגלית לרפואה בעברית',
  huji_medicine_hebrew_basis: 'הוכחת עברית לרפואה בעברית',
  huji_medicine_hebrew_score: 'ציון עברית לרפואה בעברית',
  huji_medicine_assessment_score: 'ציון מו״ר/מרק״ם לרפואה בעברית',
  huji_medicine_assessment_year: 'שנת מו״ר/מרק״ם לרפואה בעברית',
  huji_medicine_preparatory_average: 'ממוצע מכינה לרפואה בעברית',
  huji_medicine_preparatory_year: 'שנת סיום המכינה לרפואה בעברית',
  huji_medicine_preparatory_eligible: 'הכרה במכינה לרפואה בעברית',
  huji_medicine_preparatory_conversion: 'המרת ממוצע המכינה לסולם העברית',
  huji_medicine_qualification: 'תנאי הקבלה לרפואה בעברית',
  // A composite is never requested, including when an API route names it as missing.
  huji_medicine_cognitive_score: 'נתוני המסלול לרפואה בעברית',
  institution_weighted_score: 'נתוני החישוב של התוכנית',
  bgu_engineering_details: 'ציוני הבגרות ונתוני המכינה או ההנדסאי להנדסה בבן־גוריון',
  bgu_engineering_physics_course: 'השלמת פיזיקה להנדסה בבן־גוריון',
};

const inputTargets: Partial<Record<AdmissionsRequiredInput, string>> = {
  haifa_bagrut_average: '#haifaBagrutAverage',
  bagrut_subject_record: '#sekhem-bagrut-subjects',
  psychometric_overall: '#psychometric-total',
  psychometric_math: '#psychometric-quantitative',
  psychometric_verbal: '#psychometric-verbal',
  psychometric_english: '#psychometric-english',
};

export function resultInputReasons(
  result: AdmissionsEvaluationResult,
): { text: string; href?: string }[] {
  if (
    result.linkedInstitutionId === 'haifa' &&
    !Number.isFinite(result.score) &&
    !Number.isFinite(result.threshold)
  )
    return [{ text: 'עדיין לא מחשבים את הסכם של חיפה כאן' }];
  return [...new Set(result.requiredInputs ?? [])].flatMap((key) => {
    if (!inputLabels[key]) return [];
    const text =
      result.linkedInstitutionId === 'technion' && key === 'bagrut_subject_record'
        ? 'לחישוב הסכם בטכניון דרושים ציונים ויחידות בכל מקצועות הבגרות.'
        : `לחישוב צריך להשלים: ${inputLabels[key]}.`;
    return [{ text, href: inputTargets[key] }];
  });
}

/** Source diagnostics belong in the API; students get the consequence for their calculation. */
export function resultSourceReason(result: AdmissionsEvaluationResult): string {
  switch (result.kind) {
    case 'authority_unavailable':
    case 'tracked_missing_rule':
    case 'degraded':
      return 'עדיין אין לנו מקור רשמי עדכני לחישוב.';
    case 'unsupported':
      return 'עדיין לא מחשבים סכם לתוכנית הזו כאן.';
    case 'requirements_only':
    case 'open_admission':
      return 'בתוכנית הזו נבדקים תנאי הקבלה בלי חישוב סכם.';
    case 'needs_input':
      return 'חסרים ציונים או פרטים נוספים לחישוב הסכם.';
    default:
      return 'לא התקבלו כל הנתונים הדרושים לחישוב הסכם.';
  }
}
