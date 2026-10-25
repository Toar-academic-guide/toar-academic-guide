import {
  BIU_GENERAL_REQUIREMENTS_URL,
  BIU_PUBLISHED_ROUTE_PROGRAMMES,
  BIU_PUBLISHED_ROUTES_URL,
} from '@/data/admissions/biuPublishedRoutes';
import { bagrutExamSubjects } from '@/lib/bagrutSubjectRecord';
import { subjectIdForWizardLabel } from '@/utils/bagrutSubjectRecord';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';
import {
  allOf,
  anyOf,
  evaluatePublishedNumericRoutes,
  examSubject,
  mathAlternatives,
  minimum,
  type NumericGate,
} from './publishedNumericRoutes';

const scienceIds = new Map(
  [
    ['biology', 'ביולוגיה'],
    ['biotechnology', 'ביוטכנולוגיה'],
    ['mathematics', 'מתמטיקה'],
    ['chemistry', 'כימיה'],
    ['physics', 'פיזיקה'],
    ['engineering', 'הנדסה'],
    ['computer_science', 'מדעי המחשב'],
  ].flatMap(([id, label]) => [[id, id] as const, [subjectIdForWizardLabel(label), id] as const]),
);

function twoScienceExams(input: AdmissionsEvaluationInput): NumericGate {
  const record = input.extraInputs?.bagrutSubjectRecord;
  const complete = record?.schemaVersion === 2 && record.complete;
  const subjects = [...bagrutExamSubjects(record)];
  for (const subjectId of ['mathematics', 'physics', 'computer_science'] as const) {
    if (complete || record?.subjects.some((row) => row.subjectId === subjectId)) continue;
    const { units, grade } =
      subjectId === 'computer_science'
        ? { units: input.extraInputs?.csUnits, grade: input.extraInputs?.csGrade }
        : examSubject(input, subjectId);
    if (units !== undefined && grade !== undefined) subjects.push({ subjectId, units, grade });
  }
  const qualifying = new Set(
    subjects
      .filter((subject) => subject.units === 5 && subject.grade >= 80)
      .map((subject) => scienceIds.get(subject.subjectId))
      .filter((id) => id !== undefined),
  );
  if (qualifying.size >= 2) return allOf();
  return { below: !!complete, missing: complete ? [] : ['bagrut_subject_record'] };
}

const BIU_LAW_CALCULATOR_URL = 'https://shoham.biu.ac.il/kabala/';
const BIU_LAW_FACULTY_URL = 'https://law.biu.ac.il/node/129';

function evaluateLawPsychometricChannels(
  input: AdmissionsEvaluationInput,
  institution: CatalogueInstitution,
  bagrutResult: AdmissionsEvaluationResult,
): AdmissionsEvaluationResult {
  const officialUrls = [
    BIU_LAW_CALCULATOR_URL,
    BIU_LAW_FACULTY_URL,
    ...(bagrutResult.officialUrls ?? []),
  ];
  const bagrut = { ...bagrutResult, officialUrls };
  const psychometric = evaluatePublishedNumericRoutes({
    institution,
    officialUrls,
    routes: [
      {
        ...allOf(minimum(input.psychometric, 720, 'psychometric_overall'), {
          // The profile has no BIU certificate confirmation field. Keep entitlement
          // unconfirmed in the shared result; do not invent a minimum average here.
          below: false,
          missing: input.bagrut === undefined ? ['bagrut_average'] : [],
        }),
        label: 'פסיכומטרי',
        score: input.psychometric,
        threshold: 720,
        requirements: 'פסיכומטרי 720 לפחות וזכאות לתעודת בגרות',
      },
    ],
  });
  if (bagrut.scoreAssessment === 'meets_threshold') return bagrut;
  if (psychometric.scoreAssessment === 'meets_threshold') return psychometric;

  const combinedFloors = allOf(
    minimum(input.psychometric, 600, 'psychometric_overall'),
    minimum(input.bagrut, 90, 'bagrut_average'),
  );
  if (!combinedFloors.below && !combinedFloors.missing.length)
    return {
      institution,
      linkedInstitutionId: institution.id,
      capability: 'estimated',
      kind: 'estimated',
      decision: 'unknown',
      confidence: 'medium',
      sourceLabel: 'תנאי קבלה למשפטים בבר־אילן',
      officialUrls,
      explanation:
        'הציונים שהוזנו עומדים בתנאי הסף למסלול המשולב: פסיכומטרי 600 וממוצע בגרות 90 לפחות. נדרשת בדיקה במחשבון הקבלה של בר־אילן; עמידה בתנאי הסף אינה אישור קבלה.',
      nextAction: 'בדקו את השקלול במחשבון הקבלה הרשמי של בר־אילן.',
    };
  if (psychometric.kind === 'needs_input') return psychometric;
  if (bagrut.kind === 'needs_input') return bagrut;
  if (!combinedFloors.below)
    return {
      ...bagrut,
      capability: 'needs_input',
      kind: 'needs_input',
      decision: 'unknown',
      scoreAssessment: undefined,
      requiredInputs: combinedFloors.missing,
      explanation: 'חסר ממוצע בגרות לבדיקת תנאי הסף למסלול המשולב.',
      nextAction: 'השלימו את ממוצע הבגרות בפרופיל האקדמי.',
    };
  return {
    ...bagrut,
    explanation:
      'לפי הנתונים שהוזנו, לא מתקיימים תנאי המסלולים שנבדקו: בגרות 112 ואנגלית 5 יחידות בציון 90 לפחות עם סיווג אנגלית 85 לפחות; או פסיכומטרי 720 וזכאות לבגרות; או תנאי הסף למסלול המשולב — פסיכומטרי 600 וממוצע בגרות 90 לפחות.',
  };
}

export function evaluateBiuPublishedRoutes({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}) {
  const programme =
    BIU_PUBLISHED_ROUTE_PROGRAMMES[input.degreeId as keyof typeof BIU_PUBLISHED_ROUTE_PROGRAMMES];
  const threshold =
    programme === 'criminology'
      ? 98
      : programme === 'law' || programme === 'computational_bio'
        ? 112
        : 108;
  const math = examSubject(input, 'mathematics');
  const scienceRoute = () =>
    allOf(
      {
        below:
          math.units !== undefined && math.grade !== undefined && math.units * math.grade < 320,
        missing: [
          ...(math.units === undefined ? ['math_units' as const] : []),
          ...(math.grade === undefined ? ['math_grade' as const] : []),
        ],
      },
      twoScienceExams(input),
    );
  let subjects = allOf();
  let requirements = `ממוצע בגרות ${threshold} לפחות, ללא פסיכומטרי`;
  if (programme === 'law') {
    const english = examSubject(input, 'english');
    subjects = allOf(
      minimum(english.units, 5, 'english_units'),
      minimum(english.grade, 90, 'english_grade'),
    );
    requirements += ', ואנגלית 5 יחידות בציון 90 לפחות';
  } else if (programme === 'computational_bio') {
    subjects = mathAlternatives(input, [[5, 95]]);
    requirements += ', ומתמטיקה 5 יחידות בציון 95 לפחות';
  } else if (programme === 'biotech' || programme === 'lifesciences') {
    subjects =
      programme === 'biotech'
        ? scienceRoute()
        : anyOf(mathAlternatives(input, [[5, 85]]), scienceRoute());
    requirements +=
      ', ומכפלת ציון המתמטיקה במספר היחידות 320 לפחות ושני מקצועות של 5 יחידות בציון 80 לפחות מבין ביולוגיה, ביוטכנולוגיה, מתמטיקה, כימיה, פיזיקה, הנדסה ומחשבים';
    if (programme === 'lifesciences') requirements += '; לחלופין, מתמטיקה 5 יחידות בציון 85 לפחות';
  }
  const bagrutResult = evaluatePublishedNumericRoutes({
    institution,
    officialUrls: [BIU_PUBLISHED_ROUTES_URL, BIU_GENERAL_REQUIREMENTS_URL],
    caveat:
      'הבדיקה מתייחסת למסלול ללא פסיכומטרי בלבד. ממוצע הבגרות משוער ונדרש אישור לפי חישוב בר־אילן. למי שחייבים בבחינת יע״ל נדרש ציון 105 לפחות. ייתכנו אפשרויות קבלה נוספות.' +
      (programme === 'criminology' ? ' במסלול הדו־חוגי יש לעמוד גם בתנאי החוג הנוסף.' : ''),
    routes: [
      {
        ...allOf(
          minimum(input.bagrut, threshold, 'bagrut_average'),
          subjects,
          minimum(input.extraInputs?.psychometricEnglish, 85, 'psychometric_english'),
        ),
        label: 'ממוצע בגרות משוער — ללא פסיכומטרי',
        score: input.bagrut,
        threshold,
        requirements: requirements + ', וסיווג אנגלית 85 לפחות בפסיכומטרי או באמירנ״ט',
      },
    ],
  });
  return input.degreeId === 'biu_law' && input.psychometric !== undefined
    ? evaluateLawPsychometricChannels(input, institution, bagrutResult)
    : bagrutResult;
}
