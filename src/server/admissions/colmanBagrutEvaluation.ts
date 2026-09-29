import { COLMAN_CS_PROGRAM_URL, COLMAN_BAGRUT_CALCULATOR_URL } from '@/lib/colmanBagrutInputs';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

/** Published Bagrut-route grade requirements; the college's internal test remains required. */
export function evaluateColmanBagrutResult({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}): AdmissionsEvaluationResult {
  const { id, name, region, domain, logoUrl, programUrl, calculatorUrl, universityId } =
    institution;
  const base = {
    institution: { id, name, region, domain, logoUrl, programUrl, calculatorUrl, universityId },
    linkedInstitutionId: id,
    officialUrls: [COLMAN_CS_PROGRAM_URL, COLMAN_BAGRUT_CALCULATOR_URL],
    sourceLabel: 'תנאי מסלול הבגרות למדעי המחשב במכללה למינהל',
  };
  const extra = input.extraInputs;
  const average = extra?.colmanBagrutAverage;
  const certificate = extra?.colmanBagrutCertificateConfirmed;
  const math = extra?.bagrutSubjectRecord?.subjects.find(
    (subject) => subject.subjectId === 'mathematics',
  );
  const units = math?.units ?? extra?.mathUnits;
  const grade = math?.grade ?? extra?.mathGrade;
  const missing: AdmissionsRequiredInput[] = [];
  if (average === undefined) missing.push('colman_bagrut_average');
  if (certificate === undefined) missing.push('colman_bagrut_certificate');
  if (units === undefined) missing.push('math_units');
  if (grade === undefined) missing.push('math_grade');
  if (missing.length)
    return {
      ...base,
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      confidence: 'low',
      requiredInputs: missing,
      explanation:
        'לבדיקת מסלול הבגרות נדרשים ממוצע משוקלל של המכללה למינהל, אישור זכאות לתעודת בגרות מלאה ויחידות וציון במתמטיקה. הממוצע הכללי בפרופיל אינו מחליף את ממוצע המכללה.',
      nextAction:
        'פתחו את הפרופיל האקדמי, השלימו את נתוני המכללה למינהל והזינו מתמטיקה במחשבון מקצועות הבגרות. אין צורך בפסיכומטרי למסלול זה.',
    };
  const unmet = [
    ...(certificate === false ? ['זכאות לתעודת בגרות מלאה ומוכרת'] : []),
    ...(average! < 85 ? ['ממוצע בגרות משוקלל 85 לפחות'] : []),
    ...(!((units === 5 && grade! >= 70) || (units === 4 && grade! >= 80))
      ? ['מתמטיקה: 5 יחידות בציון 70 לפחות או 4 יחידות בציון 80 לפחות']
      : []),
  ];
  return {
    ...base,
    capability: 'manual_gate',
    kind: 'manual_gate',
    decision: unmet.length ? 'below' : 'eligible_to_apply',
    confidence: 'high',
    score: average,
    scoreLabel: 'ממוצע בגרות משוקלל — מסלול בגרות',
    threshold: 85,
    explanation: unmet.length
      ? `לא מתקיימים תנאי מסלול הבגרות הישיר: ${unmet.join('; ')}. זו אינה דחייה מכל מסלולי הקבלה; ייתכנו מסלולים אחרים הדורשים בדיקת המכללה.`
      : 'תנאי הציונים למסלול הבגרות מתקיימים: ממוצע משוקלל 85 לפחות ומתמטיקה 5 יחידות בציון 70 לפחות או 4 יחידות בציון 80 לפחות. עדיין נדרש מעבר מבדק פנימי; אין כאן אישור קבלה סופית.',
    nextAction: unmet.length
      ? 'בדקו מול מרכז הרישום את חלופות הקבלה המתאימות. מסלול בגרות ופסיכומטרי אינו מחושב כאן.'
      : 'פנו למרכז הרישום להסדרת המבדק הפנימי והקבלה. פטור לפי פסיכומטרי וכמותי מתייחס למסלול המשולב, ולא נבדק במסלול הבגרות כאן.',
  };
}
