import type {
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';

/** Display precision only: API values and admission decisions remain untouched. */
export function formatSekhemNumber(value: number, institutionId: string): string {
  return String(institutionId === 'reichman' ? Math.round(value) : value);
}

const inputLabels: Partial<Record<AdmissionsRequiredInput, string>> = {
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
  psychometric_math: 'ציון החלק הכמותי',
  psychometric_verbal: 'ציון החלק המילולי',
  psychometric_english: 'ציון האנגלית',
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
  huji_medicine_cognitive_score: 'פרטי המסלול לרפואה בעברית',
  institution_weighted_score: 'פרטי הקבלה של התוכנית',
  bgu_engineering_details: 'ציוני הבגרות ופרטי המכינה או ההנדסאי להנדסה בבן־גוריון',
  bgu_engineering_physics_course: 'השלמת פיזיקה להנדסה בבן־גוריון',
};

export type ResultInputTarget = { subject: string; field: 'grade' | 'units' } | { inputId: string };

type InputAction = { label: string; target: ResultInputTarget };
const subjects: Record<string, string> = {
  math: 'מתמטיקה',
  english: 'אנגלית',
  physics: 'פיזיקה',
  cs: 'מדעי המחשב',
};
const psychometricTargets: Record<string, string> = {
  psychometric_overall: 'psychometric-total',
  psychometric_math: 'psychometric-quantitative',
  psychometric_verbal: 'psychometric-verbal',
  psychometric_english: 'psychometric-english',
};
const psychometricLabels: Record<string, string> = {
  psychometric_overall: 'הפסיכומטרי הכללי',
  psychometric_math: 'החלק הכמותי',
  psychometric_verbal: 'החלק המילולי',
  psychometric_english: 'החלק באנגלית',
};

function requiredActions(result: AdmissionsEvaluationResult): InputAction[] {
  const actions: InputAction[] = [];
  for (const key of new Set(result.requiredInputs ?? [])) {
    const [subject, field] = key.split('_');
    if (subjects[subject] && (field === 'grade' || field === 'units')) {
      if (
        !actions.some(
          (item) => 'subject' in item.target && item.target.subject === subjects[subject],
        )
      )
        actions.push({ label: subjects[subject], target: { subject: subjects[subject], field } });
    } else if (psychometricTargets[key]) {
      actions.push({
        label: psychometricLabels[key],
        target: { inputId: psychometricTargets[key] },
      });
    }
  }
  return actions;
}

const institutionNames: Record<string, string> = {
  haifa: 'חיפה',
  tau: 'תל אביב',
  huji: 'האוניברסיטה העברית',
  bgu: 'בן־גוריון',
  technion: 'הטכניון',
  reichman: 'רייכמן',
  biu: 'בר־אילן',
  afeka: 'אפקה',
  hit: 'HIT',
};

export function institutionShortName(id: string, fallback: string): string {
  return institutionNames[id] ?? fallback;
}

export function resultSourceReason(result: AdmissionsEvaluationResult): string {
  const institution = institutionNames[result.linkedInstitutionId ?? result.institution.id];
  return institution
    ? `${institution}: בדיקה אישית מול המוסד`
    : `${result.institution.name}: בדיקה אישית מול המוסד`;
}

export function resultInputReasons(result: AdmissionsEvaluationResult): string[] {
  return [...new Set(result.requiredInputs ?? [])].flatMap((key) => {
    if (!inputLabels[key]) return [];
    return [`הוסיפו את ${inputLabels[key]} וקבלו את ציון הקבלה`];
  });
}

type CardPresentation = {
  text: string | null;
  actions?: InputAction[];
  tone?: 'positive' | 'negative';
};

/** A verdict never implies that the API returned a calculated score. */
export function resultPresentation(result: AdmissionsEvaluationResult): CardPresentation {
  const score = Number.isFinite(result.score);
  const threshold = Number.isFinite(result.threshold);
  // An exact score without a cutoff establishes no admission verdict.
  if (result.kind === 'exact' && score && !threshold && result.decision === 'unknown')
    return { text: null };
  if (result.linkedInstitutionId === 'haifa' && !score && !threshold)
    return { text: resultSourceReason(result) };

  if (
    ['authority_unavailable', 'tracked_missing_rule', 'degraded', 'unsupported'].includes(
      result.kind,
    )
  )
    return { text: resultSourceReason(result) };

  // A below verdict takes precedence if an inconsistent response also claims a passed floor.
  if (result.decision === 'below' || result.scoreAssessment === 'below_threshold') {
    if (score || threshold)
      return {
        text:
          result.kind === 'estimated' && score && threshold
            ? 'ציון הקבלה המשוער שלכם נמוך מהסף'
            : 'הציונים מתחת לסף',
        tone: 'negative',
      };
    const reasons = resultInputReasons(result);
    return {
      text: reasons.join(' ') || 'הציונים אינם עומדים בתנאי הקבלה שנבדקו.',
      tone: 'negative',
    };
  }
  if (result.decision === 'accepted' || result.scoreAssessment === 'meets_threshold') {
    if (result.requiredInputs?.length) {
      const actions = requiredActions(result);
      return actions.length
        ? {
            text: 'עומדים בתנאי הסף. כדי לחשב את ציון הקבלה, הוסיפו ציון ב',
            actions,
            tone: 'positive',
          }
        : {
            text: `עומדים בתנאי הסף. ${resultInputReasons(result).join(' ') || 'לחישוב ציון הקבלה דרושים פרטים נוספים על מסלול הקבלה.'}`,
            tone: 'positive',
          };
    }
    if (!score && threshold)
      return {
        text: 'עוברים את הסף ✓',
        tone: 'positive',
      };
    return {
      text: score ? 'הציונים עומדים בתנאי הקבלה' : 'עומדים בתנאי הקבלה של התוכנית',
      tone: 'positive',
    };
  }
  const reasons = resultInputReasons(result);
  return { text: reasons.join(' ') || resultSourceReason(result) };
}
