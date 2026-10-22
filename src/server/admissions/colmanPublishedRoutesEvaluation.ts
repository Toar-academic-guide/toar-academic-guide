import { confirmationCondition, withScoreAssessment } from './scoreAssessment';
import { COLMAN_BAGRUT_CALCULATOR_URL } from '@/lib/colmanBagrutInputs';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

const routes = {
  colmgmt_law: { average: 100, psychometric: 540, quantitative: undefined, path: 'law' },
  colmgmt_business: {
    average: 85,
    psychometric: 555,
    quantitative: 100,
    path: 'business-administration',
  },
} as const;

export function evaluateColmanPublishedRoutes({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}): AdmissionsEvaluationResult {
  const route = routes[input.degreeId as keyof typeof routes];
  const average = input.extraInputs?.colmanBagrutAverage;
  const quantitative = input.extraInputs?.psychometricMath;
  const base = {
    institution,
    linkedInstitutionId: institution.id,
    capability: 'manual_gate' as const,
    kind: 'manual_gate' as const,
    confidence: 'high' as const,
    sourceLabel: 'תנאי קבלה',
    officialUrls: [
      `https://www.colman.ac.il/academics/ba/${route.path}/`,
      'https://www.colman.ac.il/academics/ba/b-a-admission/',
      COLMAN_BAGRUT_CALCULATOR_URL,
    ],
  };
  const collegeDecides =
    'במסלול בגרות ופסיכומטרי ההחלטה היא של המכללה: היא לא מפרסמת את הציון המשוקלל הנדרש. כדאי לבדוק מול מרכז הרישום.';
  if (average === undefined) {
    return {
      ...base,
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      requiredInputs: ['colman_bagrut_average'],
      explanation:
        'לבדיקת מסלול הבגרות נדרש ממוצע משוקלל של המכללה למינהל. הממוצע הכללי בפרופיל אינו מחליף את ממוצע המכללה. ' +
        collegeDecides,
      nextAction:
        'פתחו את הפרופיל האקדמי והשלימו את ממוצע המכללה למינהל ואת אישור הזכאות לתעודת בגרות מלאה.',
    };
  }
  const conditions = [
    confirmationCondition(
      'colman_bagrut_certificate',
      'זכאות לתעודת בגרות מלאה ומוכרת',
      input.extraInputs?.colmanBagrutCertificateConfirmed,
    ),
  ];
  if (average >= route.average) {
    return withScoreAssessment(
      {
        ...base,
        decision: 'eligible_to_apply',
        score: average,
        scoreLabel: 'ממוצע בגרות משוקלל — מסלול בגרות',
        threshold: route.average,
        explanation: `תנאי הציונים למסלול הבגרות מתקיימים: ממוצע משוקלל ${route.average} לפחות. יש לאשר זכאות לבגרות מלאה; אין כאן אישור קבלה סופית.`,
        nextAction: 'פנו למרכז הרישום לאישור הממוצע והזכאות לתעודת בגרות מלאה.',
      },
      conditions,
    );
  }
  const bagrutBelow = `מסלול בגרות: הממוצע נמוך מ־${route.average}.`;
  const psychometricBelow =
    input.psychometric !== undefined && input.psychometric < route.psychometric;
  const quantitativeBelow =
    route.quantitative !== undefined &&
    quantitative !== undefined &&
    quantitative < route.quantitative;
  if (psychometricBelow || quantitativeBelow) {
    return withScoreAssessment(
      {
        ...base,
        decision: 'below',
        score: average,
        threshold: route.average,
        scoreLabel: 'ממוצע בגרות משוקלל — מסלול בגרות',
        explanation: `${bagrutBelow} במסלול בגרות ופסיכומטרי לא מתקיים הסף של ${psychometricBelow ? `פסיכומטרי ${route.psychometric}` : `כמותי ${route.quantitative}`}. זו אינה דחייה מכל מסלולי הקבלה.`,
        nextAction: 'בדקו מול מרכז הרישום אפשרות קבלה דרך מכינת שחקים.',
      },
      conditions,
    );
  }
  const missing: AdmissionsRequiredInput[] = [];
  if (input.psychometric === undefined) missing.push('psychometric_overall');
  if (route.quantitative !== undefined && quantitative === undefined)
    missing.push('psychometric_math');
  if (missing.length) {
    return {
      ...base,
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      requiredInputs: missing,
      explanation: `${bagrutBelow} לבדיקת הספים במסלול בגרות ופסיכומטרי נדרשים ${missing.includes('psychometric_overall') ? 'ציון פסיכומטרי' : ''}${missing.length === 2 ? ' ו' : ''}${missing.includes('psychometric_math') ? 'ציון כמותי' : ''}.`,
      nextAction:
        'השלימו את הציונים בפרופיל האקדמי, או בדקו מול מרכז הרישום אפשרות קבלה דרך מכינת שחקים.',
    };
  }
  return {
    ...base,
    decision: 'unknown',
    explanation: `${bagrutBelow} ${collegeDecides}`,
    nextAction: 'בדקו מול מרכז הרישום את הציון המשוקלל הנדרש ואת אפשרויות הקבלה.',
  };
}
