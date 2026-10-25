import {
  BIU_CALCULATOR_URL,
  BIU_CHANNELS,
  BIU_ENGINEERING_URL,
  BIU_EE_PSYCH_NOTE,
  BIU_LAW_URL,
  BIU_SOCIAL_WORK_URL,
  BIU_PSYCH_ROUTE_LINES,
  BIU_SPECIAL_CHANNELS,
  type BiuChannel,
  type BiuFloor,
} from '@/data/admissions/biuChannels';
import {
  BIU_GENERAL_REQUIREMENTS_URL,
  BIU_PUBLISHED_ROUTES_URL,
} from '@/data/admissions/biuPublishedRoutes';
import type { BiuFloorResult } from '@/lib/biuFloorPresentation';
import { bagrutExamSubjects } from '@/lib/bagrutSubjectRecord';
import { subjectIdForWizardLabel } from '@/utils/bagrutSubjectRecord';
import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
  FloorCheckRow,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';
import { allOf, examSubject, type NumericGate } from './publishedNumericRoutes';

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
function scienceExams(input: AdmissionsEvaluationInput) {
  const record = input.extraInputs?.bagrutSubjectRecord;
  const complete = record?.schemaVersion === 2 && record.complete;
  const subjects = [...bagrutExamSubjects(record)];
  for (const subjectId of ['mathematics', 'physics', 'computer_science'] as const) {
    if (complete || record?.subjects.some((row) => row.subjectId === subjectId)) continue;
    const { units, grade } = examSubject(input, subjectId);
    if (units !== undefined && grade !== undefined) subjects.push({ subjectId, units, grade });
  }
  const qualifying = new Set(
    subjects
      .filter((subject) => subject.units === 5 && subject.grade >= 80)
      .map((subject) => scienceIds.get(subject.subjectId))
      .filter((id) => id !== undefined),
  );
  return { count: qualifying.size, complete: !!complete };
}
export function twoScienceExams(input: AdmissionsEvaluationInput): NumericGate {
  const { count, complete } = scienceExams(input);
  if (count >= 2) return allOf();
  return { below: complete, missing: complete ? [] : ['bagrut_subject_record'] };
}

type FloorValue = {
  value?: number;
  studentValue?: number | string;
  missing: AdmissionsRequiredInput[];
  wrongUnits?: boolean;
};
function floorValue(input: AdmissionsEvaluationInput, floor: BiuFloor): FloorValue {
  const scalar = (value: number | undefined, field: AdmissionsRequiredInput): FloorValue => ({
    value,
    studentValue: value,
    missing: value === undefined ? [field] : [],
  });
  switch (floor.metric) {
    case 'psychometric':
      return scalar(input.psychometric, 'psychometric_overall');
    case 'quant':
      return scalar(input.extraInputs?.psychometricMath, 'psychometric_math');
    case 'average':
      return scalar(input.bagrut, 'bagrut_average');
    case 'englishClassification':
      return scalar(input.extraInputs?.psychometricEnglish, 'psychometric_english');
    case 'entitlement':
      return {
        value: input.bagrut === undefined ? undefined : 1,
        missing: input.bagrut === undefined ? ['bagrut_average'] : [],
      };
    case 'hebrew':
      return { missing: [] };
    case 'scienceExams': {
      const { count, complete } = scienceExams(input);
      return {
        value: complete || count >= 2 ? count : undefined,
        studentValue: complete || count >= 2 ? count : undefined,
        missing: !complete && count < 2 ? ['bagrut_subject_record'] : [],
      };
    }
    default: {
      const subject =
        floor.metric === 'physics5'
          ? 'physics'
          : floor.metric === 'english5'
            ? 'english'
            : 'mathematics';
      const { units, grade } = examSubject(input, subject);
      const prefix = subject === 'mathematics' ? 'math' : subject;
      const missing: AdmissionsRequiredInput[] = [
        ...(units === undefined ? [`${prefix}_units` as AdmissionsRequiredInput] : []),
        ...(grade === undefined ? [`${prefix}_grade` as AdmissionsRequiredInput] : []),
      ];
      if (floor.metric === 'mathProduct') {
        const value = units === undefined || grade === undefined ? undefined : units * grade;
        return { value, studentValue: value, missing };
      }
      return {
        value: grade,
        studentValue:
          units !== undefined && units !== 5
            ? `${units} יח״ל${grade !== undefined ? ` בציון ${grade}` : ''}`
            : grade,
        missing,
        wrongUnits: units !== undefined && units !== 5,
      };
    }
  }
}
function checkFloor(input: AdmissionsEvaluationInput, channel: BiuChannel, floor: BiuFloor) {
  const { value, studentValue, missing, wrongUnits } = floorValue(input, floor);
  const lenient = floor.lenient ?? floor.value;
  const strict = floor.strict ?? floor.value;
  let status: FloorCheckRow['status'];
  if (floor.informational) status = 'missing';
  else if (wrongUnits) status = floor.soft ? 'soft_miss' : 'miss';
  else if (missing.length || value === undefined) status = floor.soft ? 'soft_miss' : 'missing';
  else if (value < lenient) status = floor.soft ? 'soft_miss' : 'miss';
  else status = value < strict ? 'conflicting' : 'pass';
  const row: FloorCheckRow = {
    channel: channel.label,
    label: floor.label,
    displayValue: floor.metric === 'entitlement' ? 'אישור זכאות' : floor.value,
    verdictThreshold: lenient,
    studentValue,
    status,
    ...(floor.note && { note: floor.note }),
    sourceUrl:
      floor.sourceUrl ??
      channel.sourceUrl ??
      (channel.published ? BIU_PUBLISHED_ROUTES_URL : BIU_CALCULATOR_URL),
  };
  return { row, missing: floor.informational || floor.soft ? [] : missing };
}

function sourceReference(url: string) {
  return `\u2066${url}\u2069`;
}

function missedFloors(rows: FloorCheckRow[]) {
  return rows
    .filter((row) => row.status === 'miss')
    .map((row) => {
      const threshold =
        row.note === BIU_EE_PSYCH_NOTE
          ? `נדרש ${row.displayValue} במחשבון; ${row.note}`
          : `${row.verdictThreshold}`;
      return `${row.channel}: ${row.label} ${threshold} (שלך ${row.studentValue}) · מקור: ${sourceReference(row.sourceUrl)}`;
    })
    .join('. ');
}

function annotateBelow(
  result: AdmissionsEvaluationResult,
  input: AdmissionsEvaluationInput,
): BiuFloorResult {
  if (result.decision !== 'below') return result;
  const programme = input.degreeId.replace(/^biu_/, '');
  const special = BIU_SPECIAL_CHANNELS[programme] ?? [];
  const psychLine = input.psychometric === undefined ? BIU_PSYCH_ROUTE_LINES[programme] : undefined;
  return {
    ...result,
    // These programmes publish a reservist route in BIU_SPECIAL_CHANNELS.
    // Keep its kind explicit: the detail view must never parse explanation copy.
    ...([
      'law',
      'ee',
      'socialwork',
      'criminology',
      'lifesciences',
      'biotech',
      'computational_bio',
    ].includes(programme) && {
      floorCaveats: [{ kind: 'reservist' as const }],
    }),
    explanation: `לא עומד/ת בתנאי הסף — ${result.explanation} ${missedFloors(result.floorChecks ?? [])}${psychLine ? `. ${psychLine} · מקור: ${sourceReference(BIU_CALCULATOR_URL)}${programme === 'law' ? `; ${sourceReference(BIU_LAW_URL)}` : ''}` : ''}. ${special.map(({ text, url }) => `${text} · מקור: ${sourceReference(url)}`).join('. ')}${special.length ? '. ' : ''}ייתכנו גם מסלולי קבלה מיוחדים ברמת האוניברסיטה (תוכנית 30+, בני 40 ומעלה, הערכה חלופית לעד 10% מהסטודנטים בכל תוכנית) · מקורות: ${sourceReference(BIU_PUBLISHED_ROUTES_URL)} ; ${sourceReference(BIU_GENERAL_REQUIREMENTS_URL)}`,
    officialUrls: [
      ...new Set([
        ...(result.officialUrls ?? []),
        ...special.map(({ url }) => url),
        BIU_PUBLISHED_ROUTES_URL,
        BIU_GENERAL_REQUIREMENTS_URL,
      ]),
    ],
  };
}

export function evaluateBiuChannels(
  input: AdmissionsEvaluationInput,
  institution: CatalogueInstitution,
  bagrutResult: AdmissionsEvaluationResult,
  channels: readonly BiuChannel[] | undefined,
  lawResult?: AdmissionsEvaluationResult,
): AdmissionsEvaluationResult {
  const definitions = channels ?? BIU_CHANNELS[`biu_${input.degreeId}`] ?? [];
  const hasBagrutRoute = definitions.some(
    (channel) => channel.published && channel.label.startsWith('ערוץ בגרות'),
  );
  const bagrutOnly = input.psychometric === undefined || input.degreeId === 'law';
  const checked = definitions
    .filter((channel) => !bagrutOnly || !hasBagrutRoute || channel.label.startsWith('ערוץ בגרות'))
    .map((channel) => {
      const checks = channel.floors.map((floor) => checkFloor(input, channel, floor));
      return {
        rows: checks.map(({ row }) => row),
        missed: checks.some(({ row }) => row.status === 'miss'),
        missing: checks.flatMap((check) => check.missing),
      };
    });
  const floorChecks = checked.flatMap(({ rows }) => rows);
  const officialUrls = [
    ...new Set([
      BIU_CALCULATOR_URL,
      ...(bagrutResult.officialUrls ?? []),
      ...floorChecks.map((row) => row.sourceUrl),
      ...(input.degreeId === 'biu_cs'
        ? ['https://cs.biu.ac.il/he/tracks/bsc-in-computer-science']
        : []),
      ...(input.degreeId === 'biu_ee'
        ? [
            BIU_ENGINEERING_URL,
            'https://engineering.biu.ac.il/en/prerequisites',
            'https://engineering.biu.ac.il/tracks/Electrical_Engineering',
            'https://www.biu.ac.il/page/9139',
          ]
        : []),
      ...(input.degreeId === 'biu_socialwork' ? [BIU_SOCIAL_WORK_URL] : []),
    ]),
  ];
  const finish = (result: AdmissionsEvaluationResult) =>
    annotateBelow(
      {
        ...result,
        floorChecks,
        officialUrls: [...new Set([...(result.officialUrls ?? []), ...officialUrls])],
      },
      input,
    );
  if (lawResult) return finish(lawResult);
  if (hasBagrutRoute && (bagrutOnly || bagrutResult.scoreAssessment === 'meets_threshold'))
    return finish(bagrutResult);

  const base: AdmissionsEvaluationResult = {
    institution,
    linkedInstitutionId: institution.id,
    capability: 'estimated',
    kind: 'estimated',
    decision: 'unknown',
    confidence: 'medium',
    sourceLabel: 'תנאי קבלה בבר-אילן',
    officialUrls,
    floorChecks,
    explanation:
      input.degreeId === 'biu_criminology' || input.degreeId === 'criminology'
        ? 'לא פורסמו תנאי סף נוספים למסלול השקלול. נדרשת בדיקה במחשבון הרשמי של בר-אילן.'
        : 'עמידה בתנאי הסף אינה אישור קבלה. יש לבדוק את השקלול במחשבון הרשמי של בר-אילן.',
    nextAction: 'בדקו את השקלול במחשבון הקבלה הרשמי של בר-אילן.',
  };
  if (input.psychometric === undefined)
    return {
      ...base,
      kind: 'needs_input',
      capability: 'needs_input',
      requiredInputs: [
        ...new Set<AdmissionsRequiredInput>([
          'psychometric_overall',
          ...checked.flatMap(({ missing }) => missing),
        ]),
      ],
      explanation: 'חסר ציון פסיכומטרי לבדיקת תנאי הסף.',
    };
  const possible = checked.filter(({ missed }) => !missed);
  if (!possible.length)
    return finish({
      ...base,
      decision: 'below',
      scoreAssessment: 'below_threshold',
      explanation: 'לפי הנתונים שהוזנו, בכל מסלול שנבדק חסר לפחות תנאי סף מחייב.',
    });
  if (possible.some(({ missing }) => missing.length === 0)) return base;
  return {
    ...base,
    kind: 'needs_input',
    capability: 'needs_input',
    requiredInputs: [...new Set(possible.flatMap(({ missing }) => missing))],
    explanation: 'חסרים נתונים לבדיקת תנאי הסף. השלימו את הציונים והמקצועות החסרים.',
  };
}
