import { canonicalInstitutionId } from '@/data/institutionAliases';
import { bagrutExamSubjects } from '@/lib/bagrutSubjectRecord';
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

const SOURCE = 'https://w3.braude.ac.il/intrested/';
const CALCULATOR = 'https://info.braude.ac.il/yedion/fireflyweb.aspx?prgname=Reg_Calc_1';
type Department = {
  psych: number;
  quant?: number;
  english?: number;
  average: number;
  math: readonly [number, number];
  englishBagrut?: readonly [number, number];
  physics?: number;
  bonus?: number;
  composite?: string;
  cs?: boolean;
};
// Only department values present in both the supplied research and official page.
const DEPARTMENTS: Readonly<Record<string, Department>> = {
  braude_civil_eng: {
    psych: 580,
    english: 85,
    average: 70,
    math: [85, 75],
    englishBagrut: [70, 60],
    physics: 80,
    composite: '580 (רב תחומי או כמותי הגבוה מביניהם)',
  },
  braude_biotech: {
    psych: 550,
    english: 85,
    average: 70,
    math: [80, 70],
    englishBagrut: [70, 60],
    bonus: 90,
  },
  braude_ee: {
    psych: 550,
    quant: 110,
    english: 90,
    average: 70,
    math: [80, 70],
    physics: 60,
    bonus: 95,
  },
  braude_me: { psych: 550, english: 85, average: 70, math: [75, 65], bonus: 95 },
  braude_infosystems: {
    psych: 550,
    quant: 110,
    english: 85,
    average: 70,
    math: [80, 70],
    englishBagrut: [70, 60],
    bonus: 101,
    composite: '550 בציון רב תחומי ו־550 בדגש כמותי',
  },
  braude_softwareeng: {
    psych: 550,
    quant: 110,
    english: 85,
    average: 70,
    math: [80, 70],
    englishBagrut: [70, 60],
    bonus: 101,
    composite: '550 בציון רב תחומי ו־550 בדגש כמותי',
  },
  braude_industrial_eng: { psych: 550, average: 70, math: [80, 70], bonus: 101 },
  braude_cs: {
    psych: 600,
    quant: 115,
    english: 85,
    average: 75,
    math: [80, 70],
    englishBagrut: [75, 70],
    cs: true,
  },
  braude_ee_me: {
    psych: 550,
    quant: 110,
    english: 100,
    average: 70,
    math: [80, 70],
    physics: 70,
    bonus: 105,
  },
};

function departmentFor(id: string): Department | undefined {
  const key = id === 'mon_12220708942_cs' ? 'braude_cs' : id;
  return Object.hasOwn(DEPARTMENTS, key) ? DEPARTMENTS[key] : undefined;
}
export function isBraudePublishedRoutePair(programId: string, institutionId: string): boolean {
  return (
    canonicalInstitutionId(institutionId) === 'braude' && departmentFor(programId) !== undefined
  );
}

type Floor = NumericGate & { id: AdmissionsRequiredInput; label: string };
function floor(id: AdmissionsRequiredInput, label: string, gate: NumericGate): Floor {
  return { id, label, ...gate };
}
function unchecked(id: AdmissionsRequiredInput, label: string): Floor {
  // These gaps cannot be resolved by asking for an institutional composite or new inputs.
  return floor(id, label, { below: false, missing: [] });
}
function subjectGate(
  input: AdmissionsEvaluationInput,
  subject: 'english' | 'physics',
  alternatives: readonly (readonly [number, number])[],
): NumericGate {
  const { units, grade } = examSubject(input, subject);
  return anyOf(
    ...alternatives.map(([requiredUnits, requiredGrade]) =>
      allOf(
        {
          below: units !== undefined && units !== requiredUnits,
          missing: units === undefined ? [`${subject}_units`] : [],
        },
        minimum(grade, requiredGrade, `${subject}_grade`),
      ),
    ),
  );
}
function rawAverage(input: AdmissionsEvaluationInput): number | undefined {
  const record = input.extraInputs?.bagrutSubjectRecord;
  // A generic MyWay average may contain bonuses. Projects/combined rows lack a
  // Braude weighting policy, so even a complete record cannot resolve those.
  if (
    record?.schemaVersion !== 2 ||
    !record.complete ||
    !record.subjects.length ||
    record.subjects.some((s) => s.assessmentKind !== 'exam')
  )
    return undefined;
  const units = record.subjects.reduce((total, s) => total + s.units, 0);
  return units > 0
    ? record.subjects.reduce((total, s) => total + s.units * s.grade, 0) / units
    : undefined;
}
function advancedSubject(input: AdmissionsEvaluationInput): NumericGate {
  const record = input.extraInputs?.bagrutSubjectRecord;
  const subjects = bagrutExamSubjects(record).filter(
    (s) => !['mathematics', 'english'].includes(s.subjectId) && s.units >= 4,
  );
  if (!record || record.schemaVersion === 1 || !record.complete) {
    for (const id of ['physics', 'computer_science'] as const) {
      const value = examSubject(input, id);
      if (
        !subjects.some((s) => s.subjectId === id) &&
        value.units !== undefined &&
        value.grade !== undefined &&
        value.units >= 4
      )
        subjects.push({ subjectId: id, units: value.units, grade: value.grade });
    }
  }
  if (subjects.some((s) => s.grade >= 60)) return { below: false, missing: [] };
  return record?.schemaVersion === 2 && record.complete
    ? { below: true, missing: [] }
    : { below: false, missing: ['bagrut_subject_record'] };
}

export function evaluateBraudePublishedRoutes({
  input,
  institution,
}: {
  input: AdmissionsEvaluationInput;
  institution: CatalogueInstitution;
}): AdmissionsEvaluationResult | undefined {
  if (!isBraudePublishedRoutePair(input.degreeId, institution.id)) return undefined;
  const department = departmentFor(input.degreeId)!;
  const { math, englishBagrut, physics, quant, english, bonus, cs } = department;
  const mathLabel = `מתמטיקה: 4 יחידות בציון ${math[0]} או 5 יחידות בציון ${math[1]} לפחות`;
  const psychGate = cs
    ? anyOf(
        minimum(input.psychometric, 600, 'psychometric_overall'),
        allOf(
          minimum(input.psychometric, 580, 'psychometric_overall'),
          mathAlternatives(input, [
            [4, 85],
            [5, 75],
          ]),
        ),
      )
    : minimum(input.psychometric, department.psych, 'psychometric_overall');
  const floors: Floor[] = [
    floor(
      'psychometric_overall',
      cs
        ? 'פסיכומטרי: 600 לפחות, או 580 לפחות עם מתמטיקה 4 יחידות בציון 85 או 5 יחידות בציון 75 לפחות'
        : `פסיכומטרי: ${department.psych} לפחות`,
      psychGate,
    ),
    floor(
      'bagrut_average',
      `ממוצע בגרות משוקלל ללא בונוסים: ${department.average} לפחות`,
      minimum(rawAverage(input), department.average, 'bagrut_subject_record'),
    ),
    floor(
      'math_grade',
      mathLabel,
      mathAlternatives(input, [
        [4, math[0]],
        [5, math[1]],
      ]),
    ),
    ...(quant === undefined
      ? []
      : [
          floor(
            'psychometricMath',
            `המרכיב הכמותי בפסיכומטרי: ${quant} לפחות`,
            minimum(input.extraInputs?.psychometricMath, quant, 'psychometricMath'),
          ),
        ]),
    ...(english === undefined
      ? []
      : [
          floor(
            'psychometricEnglish',
            `המרכיב באנגלית בפסיכומטרי: ${english} לפחות`,
            minimum(input.extraInputs?.psychometricEnglish, english, 'psychometricEnglish'),
          ),
        ]),
    ...(englishBagrut
      ? [
          floor(
            'english_grade',
            `אנגלית בבגרות: 4 יחידות בציון ${englishBagrut[0]} או 5 יחידות בציון ${englishBagrut[1]} לפחות`,
            subjectGate(input, 'english', [
              [4, englishBagrut[0]],
              [5, englishBagrut[1]],
            ]),
          ),
        ]
      : []),
    ...(physics === undefined
      ? []
      : [
          floor(
            'physics_grade',
            `פיזיקה: 5 יחידות בציון ${physics} לפחות`,
            subjectGate(input, 'physics', [[5, physics]]),
          ),
        ]),
    // CS has no extra advanced-subject row in its official department section.
    ...(cs
      ? []
      : [
          floor(
            'bagrut_subject_record',
            'מקצוע מוגבר נוסף על מתמטיקה ואנגלית בציון 60 לפחות',
            advancedSubject(input),
          ),
        ]),
  ];
  const gaps: Floor[] = [
    ...(department.composite
      ? [unchecked('institution_weighted_score', department.composite)]
      : []),
    ...(!englishBagrut
      ? [unchecked('english_grade', 'דרישת הבגרות באנגלית טעונה בדיקה מול המכללה')]
      : []),
    ...(input.degreeId === 'braude_industrial_eng'
      ? [unchecked('psychometricEnglish', 'דרישת הסיווג באנגלית טעונה בדיקה מול המכללה')]
      : []),
  ];
  const primary = allOf(...floors);
  const missedFloors = floors
    .filter((f) => f.below)
    .map((f) => f.label)
    .join('; ');
  // Research omits ALL bonus-route subject floors and the complete optimal
  // average policy. A generic average proves neither a pass nor a miss here.
  const bonusGap =
    bonus === undefined
      ? []
      : [
          unchecked(
            'bagrut_average',
            `מסלול ללא פסיכומטרי: ממוצע מיטבי כולל בונוסים ${bonus} לפחות ודרישות המקצועות של המסלול`,
          ),
        ];
  const conditions: NonNullable<AdmissionsEvaluationResult['additionalConditions']> = [
    ...floors.map((f) => ({
      id: f.id,
      label: f.label,
      status: f.below
        ? ('unmet' as const)
        : f.missing.length
          ? ('unconfirmed' as const)
          : ('confirmed' as const),
    })),
    ...[...gaps, ...bonusGap].map((f) => ({
      id: f.id,
      label: f.label,
      status: 'unconfirmed' as const,
    })),
  ];
  const base = {
    institution: { ...institution, id: 'braude' as CatalogueInstitution['id'] },
    linkedInstitutionId: 'braude',
    kind: 'exact' as const,
    capability: 'exact' as const,
    confidence: 'high' as const,
    sourceLabel: 'תנאי הסף להרשמה',
    officialUrls: [SOURCE, CALCULATOR],
    additionalConditions: conditions,
  };
  if (primary.below && bonus === undefined)
    return {
      ...base,
      decision: 'below',
      scoreAssessment: 'below_threshold',
      explanation: `הציונים שהוזנו אינם עומדים בתנאי הסף: ${missedFloors}. מקור: תנאי הסף של בראודה.`,
      nextAction: 'בדקו את תנאי הסף באתר המכללה ואת אפשרויות שיפור הציונים.',
    };
  if (primary.below || primary.missing.length || gaps.length) {
    return {
      ...base,
      kind: 'needs_input',
      capability: 'needs_input',
      decision: 'unknown',
      requiredInputs: primary.below ? [] : primary.missing,
      explanation: primary.below
        ? `מסלול הפסיכומטרי אינו עומד בתנאי הסף: ${missedFloors}. מסלול הבגרות ללא פסיכומטרי טרם נבדק במלואו. מקור: תנאי הסף של בראודה.`
        : `נדרשים נתונים נוספים לבדיקת כל תנאי הסף.${gaps.length ? ` תנאים שטרם נבדקו: ${gaps.map((f) => f.label).join('; ')}.` : ''}`,
      nextAction:
        gaps.length || bonus !== undefined
          ? 'בדקו את התנאים שטרם נבדקו באתר המכללה ובמחשבון הבגרויות שלה.'
          : 'השלימו את הציונים החסרים ואת מקצועות תעודת הבגרות בפרופיל האקדמי.',
    };
  }
  return {
    ...base,
    decision: 'accepted',
    scoreAssessment: 'meets_threshold',
    additionalConditions: conditions.slice(0, floors.length),
    explanation: 'הציונים שהוזנו עומדים בתנאי הסף להרשמה למסלול הפסיכומטרי.',
    nextAction: 'אפשר להמשיך להרשמה במכללה.',
  };
}
