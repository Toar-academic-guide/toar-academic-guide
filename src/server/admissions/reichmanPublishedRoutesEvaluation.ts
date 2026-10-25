import {
  allOf as combine,
  examSubject,
  mathAlternatives,
  minimum,
  type NumericGate as Gate,
} from './publishedNumericRoutes';
import { bagrutExamSubjects } from '@/lib/bagrutSubjectRecord';
import { calculateReichmanCoordinatedScore } from '@/utils/sekhemCalculators';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

// תשפ״ז, columns: coordinated / Bagrut / psychometric. See the source audit in docs.
const programmes = {
  reichman_cs: { coordinated: 705, bagrut: 108, psychometric: 720, coordinatedPsy: 660 },
  reichman_law: { coordinated: 650, bagrut: 100, psychometric: 700, coordinatedPsy: 610 },
  reichman_business: { coordinated: 630, bagrut: 100, psychometric: 700, coordinatedPsy: 0 },
  reichman_economics: { coordinated: 600, bagrut: 100, psychometric: 680, coordinatedPsy: 0 },
  reichman_psychology: { coordinated: 620, bagrut: 100, psychometric: 640, coordinatedPsy: 0 },
} as const;

const THRESHOLDS_URL = 'https://www.runi.ac.il/media/4tsb3m1v/ספי-קבלה-לתואר-ראשון-תשפז.pdf';
const CALCULATOR_URL = 'https://www.runi.ac.il/admissions/undergraduate/calculator';

type Route = Gate & { label: string; score?: number; threshold: number; requirements: string };

export function evaluateReichmanPublishedRoutes({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}): AdmissionsEvaluationResult {
  const programme = programmes[input.degreeId as keyof typeof programmes];
  const extra = input.extraInputs;
  const subjects = bagrutExamSubjects(extra?.bagrutSubjectRecord);
  const subjectGate = (
    subjectId: string,
    units: number | undefined,
    grade: number | undefined,
    minUnits: number,
    minGrade: number,
    unitsField: AdmissionsRequiredInput,
    gradeField: AdmissionsRequiredInput,
  ): Gate => {
    const record = extra?.bagrutSubjectRecord;
    const subject = subjects.find((entry) => entry.subjectId === subjectId);
    const recorded =
      record?.subjects.some((entry) => entry.subjectId === subjectId) ||
      (record?.schemaVersion === 2 && record.complete);
    return combine(
      minimum(recorded ? subject?.units : units, minUnits, unitsField),
      minimum(recorded ? subject?.grade : grade, minGrade, gradeField),
    );
  };
  const math = (grade: number, units = 5) =>
    subjectGate(
      'mathematics',
      extra?.mathUnits,
      extra?.mathGrade,
      units,
      grade,
      'math_units',
      'math_grade',
    );
  const psychologyRequirements =
    input.degreeId === 'reichman_psychology'
      ? ' נדרשים גם מתמטיקה 3 יחידות לפחות בציון 85 לפחות ואנגלית 4 יחידות לפחות בציון 90 לפחות.'
      : '';
  const psychologyGates =
    input.degreeId === 'reichman_psychology'
      ? combine(
          math(85, 3),
          subjectGate(
            'english',
            extra?.englishUnits,
            extra?.englishGrade,
            4,
            90,
            'english_units',
            'english_grade',
          ),
        )
      : combine();
  const science = (minGrade = 85): Gate => {
    const complete =
      extra?.bagrutSubjectRecord?.schemaVersion === 2 && extra.bagrutSubjectRecord.complete;
    const scienceSubjects = subjects.filter((subject) =>
      (input.degreeId === 'reichman_business'
        ? ['physics', 'chemistry', 'biology']
        : ['physics', 'chemistry', 'biology', 'computer_science']
      ).includes(subject.subjectId),
    );
    for (const [subjectId, units, grade] of [
      ['physics', extra?.physicsUnits, extra?.physicsGrade],
      ['computer_science', extra?.csUnits, extra?.csGrade],
    ] as const) {
      // Structured rows take precedence; final projects are not qualifying exams.
      if (
        !(input.degreeId === 'reichman_business' && subjectId === 'computer_science') &&
        !complete &&
        !extra?.bagrutSubjectRecord?.subjects.some((subject) => subject.subjectId === subjectId) &&
        units !== undefined &&
        grade !== undefined
      )
        scienceSubjects.push({ subjectId, units, grade });
    }
    if (scienceSubjects.some((subject) => subject.units === 5 && subject.grade >= minGrade))
      return combine();
    return { below: !!complete, missing: complete ? [] : ['bagrut_subject_record'] };
  };
  const isCs = input.degreeId === 'reichman_cs';
  const business = input.degreeId === 'reichman_business';
  const economics = input.degreeId === 'reichman_economics';
  const businessOrEconomics = business || economics;
  const englishUnits = examSubject(input, 'english').units;
  const language = businessOrEconomics ? minimum(englishUnits, 4, 'english_units') : combine();
  const economicsMath = mathAlternatives(input, [
    [4, 75],
    [5, 60],
  ]);
  const ordinaryGates = combine(psychologyGates, language, economics ? economicsMath : combine());
  const routeGates = (psychometric: boolean): Gate =>
    combine(
      ordinaryGates,
      business && !psychometric ? math(100, 3) : combine(),
      businessOrEconomics && psychometric
        ? minimum(extra?.psychometricMath, 125, 'psychometric_math')
        : combine(),
    );
  const newRequirements = business
    ? ' נדרשת אנגלית 4 יחידות לפחות. במסלולי בגרות 100 ומתואם: מתמטיקה ברמת 3 יחידות בציון 100 לפחות; במסלול הפסיכומטרי: כמותי 125 לפחות.'
    : economics
      ? ' נדרשים אנגלית 4 יחידות לפחות ומתמטיקה 4 יחידות בציון 75 או 5 יחידות בציון 60 לפחות. במסלול הפסיכומטרי נדרש גם כמותי 125 לפחות.'
      : '';

  const coordinated =
    input.bagrut !== undefined && input.psychometric !== undefined
      ? calculateReichmanCoordinatedScore(input.bagrut, input.psychometric)
      : undefined;
  const routes: Route[] = [
    {
      label: 'ציון מתואם',
      score: coordinated,
      threshold: programme.coordinated,
      requirements: `ציון מתואם ${programme.coordinated} לפחות${programme.coordinatedPsy ? ` ופסיכומטרי ${programme.coordinatedPsy} לפחות` : ''}${isCs ? ', מתמטיקה 5 יחידות בציון 85 לפחות' : ''}`,
      ...combine(
        minimum(input.bagrut, 0, 'bagrut_average'),
        minimum(input.psychometric, programme.coordinatedPsy, 'psychometric_overall'),
        { below: coordinated !== undefined && coordinated < programme.coordinated, missing: [] },
        isCs ? math(85) : routeGates(false),
      ),
    },
    {
      label: 'מסלול בגרות',
      score: input.bagrut,
      threshold: programme.bagrut,
      requirements: `ממוצע בגרות ${programme.bagrut} לפחות${isCs ? ', מתמטיקה 5 יחידות בציון 85 לפחות, ו־5 יחידות בפיזיקה, כימיה, ביולוגיה או מדעי המחשב (לא תכנון מערכות) בציון 85 לפחות' : ''}`,
      ...combine(
        minimum(input.bagrut, programme.bagrut, 'bagrut_average'),
        isCs ? combine(math(85), science()) : routeGates(false),
      ),
    },
    {
      label: 'מסלול פסיכומטרי',
      score: input.psychometric,
      threshold: programme.psychometric,
      requirements: `פסיכומטרי ${programme.psychometric} לפחות${isCs ? ', מתמטיקה 5 יחידות בציון 80 לפחות' : ''}`,
      ...combine(
        minimum(input.psychometric, programme.psychometric, 'psychometric_overall'),
        isCs ? math(80) : routeGates(true),
      ),
    },
  ];
  if (business)
    routes.push({
      label: 'מסלול בגרות 95–99',
      score: input.bagrut,
      threshold: 95,
      requirements:
        'ממוצע בגרות 95–99, מתמטיקה 4 יחידות לפחות בציון 80, ו־5 יחידות בפיזיקה, כימיה או ביולוגיה בציון 75 לפחות',
      ...combine(
        minimum(input.bagrut, 95, 'bagrut_average'),
        { below: input.bagrut !== undefined && input.bagrut >= 100, missing: [] },
        language,
        math(80, 4),
        science(75),
      ),
    });
  const mathSubject = examSubject(input, 'mathematics');
  const prepRequired =
    businessOrEconomics &&
    mathSubject.units !== undefined &&
    (mathSubject.units < 4 ||
      (mathSubject.units === 4 &&
        mathSubject.grade !== undefined &&
        mathSubject.grade < (economics ? 85 : 80)) ||
      (mathSubject.units === 5 && mathSubject.grade !== undefined && mathSubject.grade < 65));
  const base = {
    institution,
    linkedInstitutionId: institution.id,
    capability: 'estimated' as const,
    kind: 'estimated' as const,
    confidence: 'medium' as const,
    sourceLabel: 'התאמה לפי הציונים',
    officialUrls: [THRESHOLDS_URL, CALCULATOR_URL],
  };
  const match = routes.find((route) => !route.below && !route.missing.length);
  if (match)
    return {
      ...base,
      decision: 'pending',
      score: match.score,
      scoreLabel: match.label,
      threshold: match.threshold,
      scoreAssessment: 'meets_threshold',
      additionalConditions: [
        ...(prepRequired
          ? [
              {
                id: 'math_grade' as const,
                label: 'מעבר קורס הכנה במתמטיקה',
                status: 'unconfirmed' as const,
              },
            ]
          : []),
        ...(businessOrEconomics && !prepRequired && mathSubject.units === undefined
          ? [
              {
                id: 'math_grade' as const,
                label: 'בדיקת הצורך בקורס הכנה במתמטיקה לפי ציוני הבגרות',
                status: 'unconfirmed' as const,
              },
            ]
          : []),
        {
          id: 'reichman_application_requirements',
          label: 'עמידה בדרישות השפה',
          status: 'unconfirmed',
        },
      ],
      explanation: `הציונים שהוזנו עומדים בתנאי המסלול: ${match.requirements}.${psychologyRequirements}${newRequirements} זו הערכה; ממוצע הבגרות הקובע מחושב ברייכמן. עמידה בסף אינה אישור קבלה.`,
      nextAction:
        'אפשר להמשיך להגשת מועמדות. יש לבדוק את דרישות השפה מול הרישום באוניברסיטת רייכמן.',
    };
  const viable = routes.filter((route) => !route.below);
  if (viable.length) {
    const scored = viable.filter((route) => route.score !== undefined);
    const candidates = scored.length ? scored : viable;
    const route = candidates.reduce((best, candidate) =>
      candidate.missing.length < best.missing.length ? candidate : best,
    );
    return {
      ...base,
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      requiredInputs: route.missing,
      explanation: `התנאים ל${route.label}: ${route.requirements}.${psychologyRequirements}${newRequirements} חסרים נתונים להשלמת הבדיקה.`,
      nextAction:
        'השלימו את הציונים החסרים בפרופיל האקדמי ואת היחידות והציונים במקצועות הבגרות. הציון המתואם מחושב אוטומטית.',
    };
  }
  return {
    ...base,
    decision: 'below',
    scoreAssessment: 'below_threshold',
    explanation:
      'לפי הנתונים שהוזנו, תנאי מסלולי הקבלה הרגילים שנבדקו אינם מתקיימים. זו אינה דחייה מכל אפשרויות הקבלה ברייכמן.',
    nextAction: isCs
      ? 'בדקו עם הרישום אפשרויות קבלה הכוללות קורס הכנה במתמטיקה או מסלול מעבר מהאוניברסיטה הפתוחה.'
      : 'בדקו עם הרישום אפשרויות קבלה נוספות.',
  };
}
