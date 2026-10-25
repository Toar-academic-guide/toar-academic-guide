import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';
import {
  allOf,
  anyOf,
  examSubject,
  mathAlternatives,
  minimum,
  type NumericGate,
} from './publishedNumericRoutes';

type SubjectField = 'english' | 'physics' | 'cs';

function subjectGate(
  input: AdmissionsEvaluationInput,
  subject: SubjectField,
  units: number,
  grade: number,
): NumericGate {
  const value = examSubject(input, subject === 'cs' ? 'computer_science' : subject);
  return allOf(
    {
      below: value.units !== undefined && value.units !== units,
      missing: value.units === undefined ? [`${subject}_units`] : [],
    },
    minimum(value.grade, grade, `${subject}_grade`),
  );
}

const INPUT_LABELS: Partial<Record<AdmissionsRequiredInput, string>> = {
  math_units: 'מספר יחידות במתמטיקה',
  math_grade: 'ציון במתמטיקה',
  english_units: 'מספר יחידות באנגלית',
  english_grade: 'ציון הבגרות באנגלית',
  physics_units: 'מספר יחידות בפיזיקה',
  physics_grade: 'ציון בפיזיקה',
  cs_units: 'מספר יחידות במדעי המחשב',
  cs_grade: 'ציון במדעי המחשב',
  psychometric_overall: 'ציון פסיכומטרי',
  psychometric_math: 'ציון כמותי בפסיכומטרי',
};

export function evaluateAfekaPublishedRoutes({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}): AdmissionsEvaluationResult {
  const ee = input.degreeId === 'afeka_ee';
  const mathBagrut = mathAlternatives(input, [
    [4, 85],
    [5, 75],
  ]);
  const mathPsych = mathAlternatives(input, [
    [4, 80],
    [5, 70],
  ]);
  const english = anyOf(subjectGate(input, 'english', 4, 70), subjectGate(input, 'english', 5, 60));
  const physics = subjectGate(input, 'physics', 5, 60);
  const psych = allOf(
    minimum(input.psychometric, 600, 'psychometric_overall'),
    minimum(input.extraInputs?.psychometricMath, 115, 'psychometric_math'),
    mathPsych,
  );
  const routes = [
    {
      label: 'בגרות',
      ...allOf(mathBagrut, english, ee ? physics : anyOf(physics, subjectGate(input, 'cs', 5, 60))),
    },
    // The official psychometric-with-science section lists physics, not CS.
    { label: 'פסיכומטרי עם פיזיקה', ...allOf(psych, physics) },
    ...(!ee
      ? [
          {
            label: 'בגרות ללא מקצוע מדעי מוגבר',
            ...allOf(
              mathAlternatives(input, [
                [4, 90],
                [5, 80],
              ]),
              english,
            ),
          },
          {
            label: 'פסיכומטרי',
            ...allOf(psych, minimum(input.psychometric, 620, 'psychometric_overall')),
          },
        ]
      : []),
  ];
  const caveat =
    'נדרש גם סיווג אנגלית ברמת מתחילים/בסיסי לפני תחילת הלימודים. חלופות של מכינה במתמטיקה או בפיזיקה בציון 70 אינן נבדקות בחישוב.' +
    (ee
      ? ''
      : ' גם מקצוע מדעי אחר ב־5 יחידות בציון 70 לפחות (כימיה, ביולוגיה, אלקטרוניקה, אלקטרוניקה ומחשבים, מדעי ההנדסה, ביוטכנולוגיה, מערכות ביוטכנולוגיות, מדע חישובי ומדעי הנתונים), או מכינה ביסודות התכנות והחשיבה הלוגית בציון 70, עשויים להתאים ואינם נבדקים בחישוב.');
  const base = {
    institution,
    linkedInstitutionId: institution.id,
    kind: 'exact' as const,
    capability: 'exact' as const,
    confidence: 'high' as const,
    sourceLabel: 'התאמה לפי הציונים',
    officialUrls: [
      `https://www.afeka.ac.il/candidate/candidate-information-bsc/${ee ? 'undergraduates' : 'admission-and-registration-in-science'}/`,
    ],
  };
  const match = routes.find((route) => !route.below && !route.missing.length);
  if (match)
    return {
      ...base,
      decision: 'accepted',
      scoreAssessment: 'meets_threshold',
      explanation: `הציונים שהוזנו עומדים בתנאי מסלול ${match.label}. ${caveat}`,
      nextAction: 'פנו למכללה לבדיקת התנאים הנוספים לפני ההרשמה.',
    };
  const possible = routes.filter((route) => !route.below);
  if (possible.length) {
    const route = possible.reduce((best, candidate) =>
      candidate.missing.length < best.missing.length ? candidate : best,
    );
    return {
      ...base,
      kind: 'needs_input',
      capability: 'needs_input',
      decision: 'unknown',
      requiredInputs: route.missing,
      explanation: `חסרים נתונים לבדיקת מסלול ${route.label}: ${route.missing.map((field) => INPUT_LABELS[field]).join(', ')}. ${caveat}`,
      nextAction: 'השלימו את המקצועות והציונים החסרים בפרופיל האקדמי.',
    };
  }
  return {
    ...base,
    decision: 'below',
    scoreAssessment: 'below_threshold',
    explanation: `לפי הנתונים שהוזנו, תנאי מסלולי הבגרות והפסיכומטרי שנבדקו אינם מתקיימים. ${caveat}`,
    nextAction: 'אפשר לברר עם המכללה על חלופות הקבלה שאינן נבדקות בחישוב.',
  };
}
