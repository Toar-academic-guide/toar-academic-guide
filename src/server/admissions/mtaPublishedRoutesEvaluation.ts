import { bagrutExamSubjects } from '@/lib/bagrutSubjectRecord';
import { mtaCombinedScore } from './mtaCombinedScore';
import { confirmationCondition, withScoreAssessment } from './scoreAssessment';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

type NumericCheck = { met: boolean; missing: AdmissionsRequiredInput[] };
type NumericRoute = {
  checks: NumericCheck[];
  score: number | undefined;
  threshold: number;
  label: string;
  text: string;
  committee?: boolean;
  relaxedMath?: boolean;
};

function minimum(
  value: number | undefined,
  threshold: number,
  missing: AdmissionsRequiredInput[],
): NumericCheck {
  return {
    met: value !== undefined && value >= threshold,
    missing: value === undefined ? missing : [],
  };
}

export function evaluateMtaPublishedRoutes({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}): AdmissionsEvaluationResult {
  const nursing = input.degreeId === 'tlvyaffo_nursing';
  const { bagrut, psychometric, extraInputs: extra } = input;
  const combined = mtaCombinedScore(bagrut, psychometric);
  const combinedMissing: AdmissionsRequiredInput[] = [];
  if (bagrut === undefined) combinedMissing.push('bagrut_average');
  if (psychometric === undefined) combinedMissing.push('psychometric_overall');
  const bagrutAt = (threshold: number) => minimum(bagrut, threshold, ['bagrut_average']);
  const psychometricAt = (threshold: number) =>
    minimum(psychometric, threshold, ['psychometric_overall']);
  const combinedAt = (threshold: number) => minimum(combined, threshold, combinedMissing);

  const routes: NumericRoute[] = nursing
    ? [
        {
          checks: [bagrutAt(90), psychometricAt(520)],
          score: bagrut,
          threshold: 90,
          label: 'ממוצע בגרות משוער — מסלול אוטומטי',
          text: 'בגרות 90 לפחות ופסיכומטרי 520 לפחות — המסלול האוטומטי',
        },
        {
          checks: [bagrutAt(90), psychometricAt(500)],
          score: bagrut,
          threshold: 90,
          label: 'ממוצע בגרות משוער — ועדת קבלה',
          text: 'בגרות 90 לפחות ופסיכומטרי 500 לפחות — הגשת מועמדות לוועדת קבלה ולראיון',
          committee: true,
        },
        {
          checks: [psychometricAt(520)],
          score: psychometric,
          threshold: 520,
          label: 'פסיכומטרי — ועדת קבלה',
          text: 'פסיכומטרי 520 לפחות, בכפוף לזכאות לבגרות — הגשת מועמדות לוועדת קבלה ולראיון',
          committee: true,
        },
        {
          checks: [combinedAt(515), psychometricAt(430)],
          score: combined,
          threshold: 515,
          label: 'ציון משולב משוער — ועדת קבלה',
          text: 'ציון משולב 515 לפחות ופסיכומטרי 430 לפחות — הגשת מועמדות לוועדת קבלה ולראיון',
          committee: true,
        },
      ]
    : [
        {
          checks: [bagrutAt(94), psychometricAt(550)],
          score: bagrut,
          threshold: 94,
          label: 'ממוצע בגרות משוער',
          text: 'בגרות 94 לפחות ופסיכומטרי 550 לפחות',
        },
        {
          checks: [psychometricAt(580)],
          score: psychometric,
          threshold: 580,
          label: 'פסיכומטרי',
          text: 'פסיכומטרי 580 לפחות, בכפוף לזכאות לבגרות',
        },
        {
          checks: [combinedAt(580)],
          score: combined,
          threshold: 580,
          label: 'ציון משולב משוער',
          text: 'ציון משולב 580 לפחות',
        },
        {
          checks: [psychometricAt(600), combinedAt(620)],
          score: combined,
          threshold: 620,
          label: 'ציון משולב משוער — מתמטיקה 4 יחידות',
          text: 'פסיכומטרי 600 לפחות וציון משולב 620 לפחות, עם מתמטיקה 4 יחידות בציון 65 לפחות',
          relaxedMath: true,
        },
        {
          checks: [bagrutAt(96)],
          score: bagrut,
          threshold: 96,
          label: 'ממוצע בגרות משוער — ללא פסיכומטרי',
          text: 'בגרות 96 לפחות — ללא פסיכומטרי',
        },
      ];

  const base = {
    institution,
    linkedInstitutionId: institution.id,
    capability: 'manual_gate' as const,
    kind: 'manual_gate' as const,
    confidence: 'medium' as const,
    sourceLabel: 'תנאי קבלה',
    officialUrls: [
      'https://www.mta.ac.il/conditions_for_applying',
      'https://mtamn.mta.ac.il/yedion/fireflyweb.aspx?prgname=Reg_Calc_1',
    ],
  };
  const nextAction = 'פנו למרכז ייעוץ ורישום לאישור הנתונים ולבירור אפשרויות הקבלה.';
  const estimate = 'ממוצע הבגרות והציון המשולב הם הערכה; המכללה מחשבת אותם לפי שיטתה.';
  const matched = routes.filter((route) => route.checks.every((check) => check.met));

  if (!matched.length) {
    const possible = routes.filter((route) =>
      route.checks.every((check) => check.met || check.missing.length > 0),
    );
    const missing = [
      ...new Set(possible.flatMap((route) => route.checks.flatMap((check) => check.missing))),
    ];
    if (missing.length)
      return {
        ...base,
        capability: 'needs_input',
        kind: 'needs_input',
        decision: 'unknown',
        requiredInputs: missing,
        explanation: 'נדרשים נתוני בגרות או פסיכומטרי נוספים לבדיקת חלופות הקבלה.',
        nextAction: 'השלימו את הציונים החסרים בפרופיל האקדמי.',
      };
    const reference = routes.find((route) => route.score !== undefined);
    return withScoreAssessment(
      {
        ...base,
        decision: 'below',
        score: reference?.score,
        threshold: reference?.threshold,
        scoreLabel: reference?.label,
        scoreAssessment: 'below_threshold',
        explanation: `לפי הנתונים שהוזנו, לא מתקיימת אף חלופת ציונים שנבדקה ל${nursing ? 'סיעוד' : 'כלכלה וניהול'}. ${estimate}`,
        nextAction,
      },
      [],
    );
  }

  const math = bagrutExamSubjects(extra?.bagrutSubjectRecord).find(
    (subject) => subject.subjectId === 'mathematics',
  );
  const units = math?.units ?? extra?.mathUnits;
  const grade = math?.grade ?? extra?.mathGrade;
  const english = extra?.psychometricEnglish;
  const missing: AdmissionsRequiredInput[] = [];
  if (!nursing) {
    if (units === undefined) missing.push('math_units');
    if (grade === undefined) missing.push('math_grade');
  }
  if (english === undefined) missing.push('psychometric_english');
  if (missing.length) {
    const fields = [
      ...(missing.includes('math_units') ? ['יחידות במתמטיקה'] : []),
      ...(missing.includes('math_grade') ? ['ציון במתמטיקה'] : []),
      ...(missing.includes('psychometric_english')
        ? ['ציון אנגלית בפסיכומטרי או באמיר״ם/אמירנ״ט']
        : []),
    ].join(', ');
    return {
      ...base,
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      requiredInputs: missing,
      explanation: `להשלמת הבדיקה נדרשים: ${fields}.`,
      nextAction: 'השלימו את הנתונים החסרים בפרופיל האקדמי.',
    };
  }

  const normalMath = (units === 4 && grade! >= 80) || (units === 5 && grade! >= 55);
  const relaxedMath = units === 4 && grade! >= 65;
  const route =
    (!normalMath && relaxedMath && matched.find((candidate) => candidate.relaxedMath)) ||
    matched[0];
  const conditions = [
    confirmationCondition(
      'psychometric_english',
      'אנגלית 85 לפחות בפסיכומטרי או באמיר״ם/אמירנ״ט',
      english! >= 85,
    ),
    confirmationCondition(
      'bagrut_average',
      'עמידה בתנאי הסף הכלליים ואישור הנתונים בידי המכללה',
      undefined,
    ),
  ];
  if (!nursing)
    conditions.push(
      confirmationCondition(
        'math_grade',
        route.relaxedMath
          ? 'מתמטיקה 4 יחידות בציון 65 לפחות'
          : 'מתמטיקה 4 יחידות בציון 80 לפחות או 5 יחידות בציון 55 לפחות',
        route.relaxedMath ? relaxedMath : normalMath,
      ),
    );
  if (route.committee)
    conditions.push(
      confirmationCondition('mta_nursing_interview', 'ועדת קבלה וראיון אישי', undefined),
    );

  return withScoreAssessment(
    {
      ...base,
      decision: 'pending',
      score: route.score,
      threshold: route.threshold,
      scoreLabel: route.label,
      scoreAssessment: 'meets_threshold',
      explanation: `תנאי הציונים מתקיימים בחלופה: ${route.text}. ${estimate}`,
      nextAction: route.committee
        ? 'פנו למרכז ייעוץ ורישום לבירור הגשת מועמדות לוועדת הקבלה ולראיון אישי.'
        : nextAction,
    },
    conditions,
  );
}
