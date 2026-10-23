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
  reichman_psychology: { coordinated: 620, bagrut: 100, psychometric: 640, coordinatedPsy: 0 },
} as const;

const THRESHOLDS_URL = 'https://www.runi.ac.il/media/4tsb3m1v/ספי-קבלה-לתואר-ראשון-תשפז.pdf';
const CALCULATOR_URL = 'https://www.runi.ac.il/admissions/undergraduate/calculator';

type Gate = { below: boolean; missing: AdmissionsRequiredInput[] };
type Route = Gate & { label: string; score?: number; threshold: number; requirements: string };

function minimum(
  value: number | undefined,
  threshold: number,
  field: AdmissionsRequiredInput,
): Gate {
  return {
    below: value !== undefined && value < threshold,
    missing: value === undefined ? [field] : [],
  };
}

function combine(...gates: Gate[]): Gate {
  return {
    below: gates.some((gate) => gate.below),
    missing: [...new Set(gates.flatMap((gate) => gate.missing))],
  };
}

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
  const science = (): Gate => {
    const complete =
      extra?.bagrutSubjectRecord?.schemaVersion === 2 && extra.bagrutSubjectRecord.complete;
    const scienceSubjects = subjects.filter((subject) =>
      ['physics', 'chemistry', 'biology', 'computer_science'].includes(subject.subjectId),
    );
    for (const [subjectId, units, grade] of [
      ['physics', extra?.physicsUnits, extra?.physicsGrade],
      ['computer_science', extra?.csUnits, extra?.csGrade],
    ] as const) {
      // Structured rows take precedence; final projects are not qualifying exams.
      if (
        !complete &&
        !extra?.bagrutSubjectRecord?.subjects.some((subject) => subject.subjectId === subjectId) &&
        units !== undefined &&
        grade !== undefined
      )
        scienceSubjects.push({ subjectId, units, grade });
    }
    if (scienceSubjects.some((subject) => subject.units === 5 && subject.grade >= 85))
      return combine();
    return { below: !!complete, missing: complete ? [] : ['bagrut_subject_record'] };
  };
  const isCs = input.degreeId === 'reichman_cs';
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
        isCs ? math(85) : psychologyGates,
      ),
    },
    {
      label: 'מסלול בגרות',
      score: input.bagrut,
      threshold: programme.bagrut,
      requirements: `ממוצע בגרות ${programme.bagrut} לפחות${isCs ? ', מתמטיקה 5 יחידות בציון 85 לפחות, ו־5 יחידות בפיזיקה, כימיה, ביולוגיה או מדעי המחשב (לא תכנון מערכות) בציון 85 לפחות' : ''}`,
      ...combine(
        minimum(input.bagrut, programme.bagrut, 'bagrut_average'),
        isCs ? combine(math(85), science()) : psychologyGates,
      ),
    },
    {
      label: 'מסלול פסיכומטרי',
      score: input.psychometric,
      threshold: programme.psychometric,
      requirements: `פסיכומטרי ${programme.psychometric} לפחות${isCs ? ', מתמטיקה 5 יחידות בציון 80 לפחות' : ''}`,
      ...combine(
        minimum(input.psychometric, programme.psychometric, 'psychometric_overall'),
        isCs ? math(80) : psychologyGates,
      ),
    },
  ];
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
        {
          id: 'reichman_application_requirements',
          label: 'אישור זכאות לבגרות מלאה ועמידה בדרישות השפה',
          status: 'unconfirmed',
        },
      ],
      explanation: `הציונים שהוזנו עומדים בתנאי המסלול: ${match.requirements}.${psychologyRequirements} זו הערכה; ממוצע הבגרות הקובע מחושב ברייכמן. עמידה בסף אינה אישור קבלה.`,
      nextAction:
        'אפשר להמשיך להגשת מועמדות. יש לאשר זכאות לבגרות מלאה ודרישות שפה מול הרישום באוניברסיטת רייכמן.',
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
      explanation: `התנאים ל${route.label}: ${route.requirements}.${psychologyRequirements} חסרים נתונים להשלמת הבדיקה.`,
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
