import type { BagrutSubjectRecord } from '@/types';

export const HAIFA_FORMULA_SOURCE_URL = 'https://admissions.haifa.ac.il/score-calculation/';
export const HAIFA_FORMULA_ADMISSION_YEAR = 2026;

const MATH_PROGRAMMES = new Set([
  'accounting',
  'biology',
  'cs',
  'economics',
  'infosystems',
  'math',
  'statistics',
]);
const GENERAL_PROGRAMMES = new Set([
  'communication',
  'nursing',
  'occupational_therapy',
  'physiotherapy',
  'political_science',
  'psychology',
  'social_work',
  'sociology',
  'law',
]);

export function haifaUsesMathPsychometric(programme: string): boolean {
  return MATH_PROGRAMMES.has(programme);
}

function roundHalfUp(value: number, places = 0): number {
  const scale = 10 ** places;
  return Math.floor(value * scale + 0.5 + 1e-9) / scale;
}

/** Official PC is the student's NITE total; Haifa's private Q/V/E-to-PC table is not used. */
export function calculateHaifaAdmissionScore(input: {
  programme: string;
  bagrutAverage: number;
  bagrutYear: number;
  psychometricYear: number;
  psychometric: number;
  quantitative?: number;
  verbal?: number;
  english?: number;
}): { kind: 'calculated'; score: number } | { kind: 'expired_psychometric' | 'missing_input' } {
  if (HAIFA_FORMULA_ADMISSION_YEAR - input.psychometricYear > 10)
    return { kind: 'expired_psychometric' };
  const math = haifaUsesMathPsychometric(input.programme);
  if (
    (!math && !GENERAL_PROGRAMMES.has(input.programme)) ||
    (math &&
      (input.quantitative === undefined ||
        input.verbal === undefined ||
        input.english === undefined))
  )
    return { kind: 'missing_input' };
  const psychometric = math
    ? Math.ceil(
        0.514554 * (6 * input.quantitative! + 4 * input.verbal! + input.english!) - 65.3 - 1e-9,
      )
    : input.psychometric;
  const age = HAIFA_FORMULA_ADMISSION_YEAR - input.bagrutYear;
  if (age > 10) return { kind: 'calculated', score: roundHalfUp(psychometric) };
  const bagrutWeight = input.programme === 'law' ? 3 : 1;
  const psychometricWeight = input.programme === 'law' ? (age <= 6 ? 7 : 17) : age <= 6 ? 3 : 7;
  return {
    kind: 'calculated',
    score: roundHalfUp(
      (bagrutWeight * (10 * input.bagrutAverage - 330) + psychometricWeight * psychometric) /
        (bagrutWeight + psychometricWeight),
    ),
  };
}

export interface HaifaCourse {
  code: string;
  units: number;
  grade: number;
}

// getDiplomaCourses(001), committed with the formula evidence.
const MANDATORY = new Set(['1', '34', '24', '16', '11', '22', '23', '35', '10', '14', '20']);
const CORE_BONUS = new Set(['16', '36', '37', '43', '1', '22', '10', '20', '14']);
// Only confidently mapped subjects from the official non-core bonus list.
const OTHER_BONUS = new Set(['57', '62', '899', '34', '24', '11']);

function subjectBonus({ code, units, grade }: HaifaCourse): number {
  if (grade < 60 || units < 4) return 0;
  if (code === '35') return units === 4 ? 20 : 35;
  if (CORE_BONUS.has(code)) return units === 4 ? 20 : 25;
  if (OTHER_BONUS.has(code)) return units === 4 ? 10 : 20;
  return 0;
}

/** Optimal whole-subject subset, retaining all supplied mandatory rows and >=20 units. */
export function calculateHaifaBagrutAverageFromCourses(courses: HaifaCourse[]): number | undefined {
  let mandatoryUnits = 0;
  let mandatoryTotal = 0;
  const optional: { units: number; total: number }[] = [];
  for (const course of courses) {
    const total = course.units * (course.grade + subjectBonus(course));
    if (MANDATORY.has(course.code)) {
      mandatoryUnits += course.units;
      mandatoryTotal += total;
    } else optional.push({ units: course.units, total });
  }
  const totals = new Map([[mandatoryUnits, mandatoryTotal]]);
  for (const row of optional) {
    for (const [units, total] of [...totals]) {
      const nextUnits = units + row.units;
      totals.set(nextUnits, Math.max(totals.get(nextUnits) ?? -Infinity, total + row.total));
    }
  }
  let best: number | undefined;
  for (const [units, total] of totals) {
    if (units >= 20) best = Math.max(best ?? -Infinity, total / units);
  }
  return best === undefined ? undefined : roundHalfUp(best, 2);
}

const SUBJECT_CODES: Record<string, string> = {
  mathematics: '35',
  english: '16',
  physics: '36',
  chemistry: '37',
  biology: '43',
  computer_science: '899',
  hebrew_expression: '11',
  literature: '10',
  bible: '1',
  geography: '57',
  geology: '62',
};
// The wizard uses code-point IDs for labels without a named stable ID.
for (const [label, code] of [
  ['גיאוגרפיה', '57'],
  ['גיאולוגיה', '62'],
] as const) {
  SUBJECT_CODES[
    `subject_${Array.from(label, (character) => character.codePointAt(0)!.toString(16)).join('_')}`
  ] = code;
}

/** An unmappable row invalidates derivation; never silently discard part of a certificate. */
export function calculateHaifaBagrutAverage(
  record: BagrutSubjectRecord | undefined,
): number | undefined {
  if (!record?.subjects.length) return undefined;
  const arabicSchool = ['arab', 'druze', 'circassian', 'bedouin', 'samaritan'].includes(
    record.sector,
  );
  const subjectCodes: Record<string, string | undefined> = {
    ...SUBJECT_CODES,
    civics: arabicSchool ? '24' : '34',
    history: arabicSchool ? '23' : '22',
    arabic: arabicSchool ? '20' : undefined,
    hebrew: arabicSchool ? '14' : undefined,
  };
  const courses: HaifaCourse[] = [];
  for (const subject of record.subjects) {
    if ('assessmentKind' in subject && subject.assessmentKind !== 'exam') return undefined;
    const code = subjectCodes[subject.subjectId];
    if (!code || courses.some((course) => course.code === code)) return undefined;
    courses.push({ code, units: subject.units, grade: subject.grade });
  }
  const required = arabicSchool
    ? ['35', '16', '24', '20', '14']
    : ['35', '16', '34', '11', '22', '10', '1'];
  if (required.some((code) => !courses.some((course) => course.code === code))) return undefined;
  return calculateHaifaBagrutAverageFromCourses(courses);
}
