import {
  allOf,
  evaluatePublishedNumericRoutes,
  mathAlternatives,
  minimum,
  type PublishedNumericRoute,
} from './publishedNumericRoutes';
import { confirmationCondition, withScoreAssessment } from './scoreAssessment';
import { COLMAN_BAGRUT_CALCULATOR_URL } from '@/lib/colmanBagrutInputs';
import { canonicalProgramId } from '@/lib/seo/programAliases';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

const routes = {
  colmgmt_law: {
    average: 100,
    psychometric: 540,
    quantitative: undefined,
    path: 'law',
    unpublishedWeightedScore: true,
  },
  colmgmt_business: {
    average: 85,
    psychometric: 555,
    quantitative: 100,
    path: 'business-administration',
    unpublishedWeightedScore: true,
  },
  colmgmt_economics: {
    average: 85,
    psychometric: 540,
    quantitative: 110,
    path: 'economy',
    unpublishedWeightedScore: false,
  },
} as const;

export function evaluateColmanPublishedRoutes({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}): AdmissionsEvaluationResult {
  if (['colmgmt_accounting', 'colmgmt_infosystems'].includes(input.degreeId))
    return evaluateColmanAdditionalRoutes({ input, institution });
  const route = routes[canonicalProgramId(input.degreeId) as keyof typeof routes];
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
        (route.unpublishedWeightedScore
          ? collegeDecides
          : `אפשר להגיש מועמדות גם עם זכאות לבגרות, פסיכומטרי ${route.psychometric} ומעלה וציון כמותי ${route.quantitative} ומעלה.`),
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
  if (!route.unpublishedWeightedScore) {
    return withScoreAssessment(
      {
        ...base,
        decision: 'eligible_to_apply',
        score: input.psychometric,
        scoreLabel: 'פסיכומטרי — מסלול בגרות ופסיכומטרי',
        threshold: route.psychometric,
        explanation: `תנאי הציונים למסלול בגרות ופסיכומטרי מתקיימים: פסיכומטרי ${route.psychometric} ומעלה וציון כמותי ${route.quantitative} ומעלה. יש לאשר זכאות לבגרות מלאה; אין כאן אישור קבלה סופית.`,
        nextAction: 'פנו למרכז הרישום לאישור הציונים והזכאות לתעודת בגרות מלאה.',
      },
      conditions,
    );
  }
  return {
    ...base,
    decision: 'unknown',
    explanation: `${bagrutBelow} ${collegeDecides}`,
    nextAction: 'בדקו מול מרכז הרישום את הציון המשוקלל הנדרש ואת אפשרויות הקבלה.',
  };
}

function evaluateColmanAdditionalRoutes({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}): AdmissionsEvaluationResult {
  const accounting = input.degreeId === 'colmgmt_accounting';
  const average = input.extraInputs?.colmanBagrutAverage ?? input.bagrut;
  const math = accounting
    ? allOf()
    : mathAlternatives(input, [
        [5, 70],
        [4, 80],
      ]);
  const threshold = accounting ? 100 : 95;
  const numericRoutes: PublishedNumericRoute[] = [
    {
      label: 'ממוצע בגרות משוער',
      score: average,
      threshold,
      requirements: `ממוצע בגרות ${threshold} לפחות${accounting ? '' : ', ומתמטיקה 5 יחידות בציון 70 או 4 יחידות בציון 80'}`,
      ...allOf(minimum(average, threshold, 'bagrut_average'), math),
    },
  ];
  if (accounting)
    numericRoutes.push({
      label: 'פסיכומטרי — בכפוף לשקלול המכללה',
      score: input.psychometric,
      threshold: 555,
      requirements: 'פסיכומטרי 555 לפחות וכמותי 100 לפחות; נדרש גם אישור השקלול של המכללה',
      ...allOf(
        minimum(input.psychometric, 555, 'psychometric_overall'),
        minimum(input.extraInputs?.psychometricMath, 100, 'psychometric_math'),
      ),
      conditions: [
        {
          id: 'institution_weighted_score',
          label: 'אישור עמידה בשקלול הבגרות והפסיכומטרי של המכללה',
          status: 'unconfirmed',
        },
      ],
    });
  else
    numericRoutes.push({
      label: 'ממוצע בגרות — קבלה על תנאי',
      score: average,
      threshold: 85,
      requirements: 'ממוצע בגרות 85–94.4 ומתמטיקה 5 יחידות בציון 70 או 4 יחידות בציון 80',
      ...allOf(
        minimum(average, 85, 'bagrut_average'),
        { below: average !== undefined && average > 94.4, missing: [] },
        math,
      ),
      conditions: [
        { id: 'admissions_committee', label: 'אישור תנאי הקבלה של המכללה', status: 'unconfirmed' },
      ],
    });
  return evaluatePublishedNumericRoutes({
    institution,
    routes: numericRoutes,
    officialUrls: [
      `https://www.colman.ac.il/academics/ba/${accounting ? 'accounting' : 'management-information-systems'}/`,
      COLMAN_BAGRUT_CALCULATOR_URL,
    ],
    caveat:
      'ממוצע הבגרות כפוף לחישוב המכללה. מסלולים נוספים המשלבים פסיכומטרי דורשים בדיקה מול הרישום.',
  });
}
