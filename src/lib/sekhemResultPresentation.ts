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
  bagrut_subject_record:
    'יחידות וציונים במקצועות הבגרות: אנגלית, ספרות, מתמטיקה, תנ״ך, אזרחות, הבעה עברית, היסטוריה ועברית',
  bagrut_average: 'ממוצע הבגרות',
  bagrut_profile_version: 'פרטי תעודת הבגרות',
  bagrut_sector: 'מגזר תעודת הבגרות',
  bgu_bagrut_average: 'ממוצע הבגרות הרשמי של בן־גוריון',
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
  return [...new Set(result.requiredInputs ?? [])].flatMap((key) =>
    inputLabels[key] ? [{ text: inputLabels[key]!, href: inputTargets[key] }] : [],
  );
}

/** Keep hidden numerical bands and stale cutoffs out of numberless result copy. */
export function resultSourceReason(result: AdmissionsEvaluationResult): string {
  return (
    [result.sourceLabel, result.explanation].find(
      (text) => text.trim() && !/\d|נדרשת בדיקה מול המוסד/.test(text),
    ) ?? 'לא התקבלו נתונים לחישוב התוכנית.'
  );
}
