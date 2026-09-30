import type { BagrutSector, BagrutSubjectRecord, BagrutSubjectV2 } from '@/types';
import type { AdmissionsExtraInputs, AdmissionsRequiredInput } from '@/types/admissionsEvaluation';
import { TAU_STANDARD_BONUS_SUBJECT_IDS } from '@/data/admissions/tauBagrutBonusSubjects';

export interface ReviewedBagrutPolicy {
  id: string;
  version: string;
  authority: 'official-published-requirement' | 'evidence-incomplete';
  sourceUrl: string;
  effectiveFrom: string;
  enabled: boolean;
}

export const TAU_ENGINEERING_EXACT_SCIENCES_POLICY: ReviewedBagrutPolicy = {
  id: 'tau-engineering-exact-sciences',
  version: 'tau-engineering-exact-sciences-2026-06-11',
  authority: 'official-published-requirement',
  sourceUrl: 'https://go.tau.ac.il/he/engineering/ba/electrical',
  effectiveFrom: '2026-06-11',
  enabled: true,
};

export const TAU_BAGRUT_PROFILE_POLICY = {
  id: 'tau-bagrut-profile',
  version: 'tau-bagrut-profile-2026-09-29',
  sourceUrl: 'https://go.tau.ac.il/he/ba/how-to-calculate',
  calculatorUrl: 'https://ims.tau.ac.il/Md/calc/Bagrut.aspx',
  recordSchemaVersion: 2 as const,
};

export const BGU_BAGRUT_PROFILE_POLICY = {
  id: 'bgu-bagrut-profile',
  version: 'bgu-bagrut-profile-2026-09-29',
  sourceUrl:
    'https://www.bgu.ac.il/media/0mdl0p0x/%D7%99%D7%93%D7%99%D7%A2%D7%95%D7%9F-%D7%AA%D7%A9%D7%A4%D7%96-%D7%AA%D7%95%D7%90%D7%A8-%D7%A8%D7%90%D7%A9%D7%95%D7%9F-%D7%A0%D7%9B%D7%95%D7%9F-%D7%9C%D7%99%D7%95%D7%9D-01012026-%D7%9C%D7%90%D7%AA%D7%A8.pdf',
  calculatorUrl: 'https://bgu4u.bgu.ac.il/html/average_calc/index.php',
  recordSchemaVersion: 2 as const,
};

/**
 * Checks whether the record preserves every profile-level fact needed by the
 * reviewed TAU policy. It deliberately does not calculate an average yet.
 */
export function evaluateTauBagrutProfileReadiness(
  record: BagrutSubjectRecord,
): { state: 'ready'; policyVersion: string } | AdmissionsPolicyNeedsInput {
  const policyVersion = TAU_BAGRUT_PROFILE_POLICY.version;
  if (record.schemaVersion !== TAU_BAGRUT_PROFILE_POLICY.recordSchemaVersion) {
    return { state: 'needs_input', missingInputs: ['bagrut_profile_version'], policyVersion };
  }
  if (!record.complete) {
    return { state: 'needs_input', missingInputs: ['bagrut_certificate_complete'], policyVersion };
  }
  if (record.certificateType === 'other') {
    return { state: 'needs_input', missingInputs: ['bagrut_certificate_type'], policyVersion };
  }

  const totalUnits = record.subjects.reduce((sum, subject) => sum + subject.units, 0);
  if (totalUnits < 20) {
    return { state: 'needs_input', missingInputs: ['bagrut_certificate_units'], policyVersion };
  }

  const examSubjectIds = new Set(
    record.subjects
      .filter((subject) => subject.assessmentKind === 'exam')
      .map((subject) => subject.subjectId),
  );
  if (
    record.subjects.some(
      (subject) =>
        subject.assessmentKind === 'final_project' && !examSubjectIds.has(subject.subjectId),
    )
  ) {
    return {
      state: 'needs_input',
      missingInputs: ['bagrut_final_project_subject'],
      policyVersion,
    };
  }

  return { state: 'ready', policyVersion };
}

const TAU_TWENTY_FIVE_POINT_SUBJECT_IDS = new Set([
  'english',
  'physics',
  'chemistry',
  'biology',
  'literature',
  'history',
  'bible',
]);

/** Returns the reviewed TAU bonus for one schema-v2 certificate entry. */
export function tauBagrutBonusForSubject(subject: BagrutSubjectV2, sector: BagrutSector): number {
  if (subject.grade < 60 || subject.assessmentKind === 'combined') {
    return 0;
  }

  if (subject.subjectId === 'mathematics' && subject.assessmentKind === 'exam') {
    if (subject.units === 5) return 35;
    if (subject.units === 4) return 12.5;
    return 0;
  }

  if (subject.subjectId === 'english' && subject.units === 4 && subject.assessmentKind === 'exam') {
    return 12.5;
  }

  const hasTwentyFivePointBonus =
    TAU_TWENTY_FIVE_POINT_SUBJECT_IDS.has(subject.subjectId) ||
    (subject.subjectId === 'arabic' && sector !== 'jewish');
  const isStandardBonusSubject =
    hasTwentyFivePointBonus || TAU_STANDARD_BONUS_SUBJECT_IDS.has(subject.subjectId);
  if (!isStandardBonusSubject) {
    return 0;
  }
  if (subject.units === 5) {
    return hasTwentyFivePointBonus && subject.assessmentKind === 'exam' ? 25 : 20;
  }
  return subject.units === 4 ? 10 : 0;
}

export type TauBagrutAverageResult =
  | {
      state: 'calculated';
      average: number;
      includedSubjectIds: string[];
      excludedSubjectIds: string[];
      policyVersion: string;
    }
  | AdmissionsPolicyNeedsInput;

/** Replays TAU's published bonus, omission, external-certificate, and cap rules. */
export function calculateTauBagrutAverage(record: BagrutSubjectRecord): TauBagrutAverageResult {
  const readiness = evaluateTauBagrutProfileReadiness(record);
  if (readiness.state === 'needs_input') {
    return readiness;
  }
  if (record.schemaVersion !== 2) {
    return needsInput(TAU_BAGRUT_PROFILE_POLICY.version, ['bagrut_profile_version']);
  }

  const examBySubjectId = new Map(
    record.subjects
      .filter((subject) => subject.assessmentKind === 'exam')
      .map((subject) => [subject.subjectId, subject]),
  );
  const requiredSubjectIds = new Set(['english', 'mathematics', 'history', 'civics']);
  if (record.sector === 'jewish') {
    requiredSubjectIds.add('hebrew_expression');
    if (examBySubjectId.has('arabic')) requiredSubjectIds.add('arabic');
  } else {
    requiredSubjectIds.add('arabic');
  }

  const missingRequiredSubjects = [...requiredSubjectIds]
    .filter((subjectId) => {
      const subject = examBySubjectId.get(subjectId);
      return !subject || (subjectId === 'history' && subject.units < 2);
    })
    .sort()
    .map((subjectId) => `bagrut_subject:${subjectId}`);
  if (missingRequiredSubjects.length > 0) {
    return {
      state: 'needs_input',
      missingInputs: missingRequiredSubjects,
      policyVersion: TAU_BAGRUT_PROFILE_POLICY.version,
    };
  }

  if (examBySubjectId.get('english')!.units < 4) {
    return {
      state: 'needs_input',
      missingInputs: ['bagrut_foreign_language'],
      policyVersion: TAU_BAGRUT_PROFILE_POLICY.version,
    };
  }

  const groups = groupTauSubjects(record.subjects, record.sector);
  let states = new Map<string, TauAverageSelection>([['0', emptyTauSelection()]]);
  for (const group of groups) {
    const required = requiredSubjectIds.has(group.subjectId);
    const choices = tauGroupChoices(group, required);
    const nextStates = new Map<string, TauAverageSelection>();
    for (const state of states.values()) {
      for (const choice of choices) {
        const candidate: TauAverageSelection = {
          units: state.units + choice.units,
          points: state.points + choice.points,
          includedSubjectIds: choice.included
            ? [...state.includedSubjectIds, group.subjectId]
            : state.includedSubjectIds,
        };
        const key = String(candidate.units);
        const current = nextStates.get(key);
        if (!current || isBetterTauSelection(candidate, current)) {
          nextStates.set(key, candidate);
        }
      }
    }
    states = nextStates;
  }

  const best = [...states.values()]
    .filter((selection) => selection.units >= 20)
    .sort(compareTauAverageSelections)[0];
  if (!best) {
    return {
      state: 'needs_input',
      missingInputs: ['bagrut_certificate_units'],
      policyVersion: TAU_BAGRUT_PROFILE_POLICY.version,
    };
  }

  const externalAdjustment = record.certificateType === 'external_1977_or_later' ? 2 : 0;
  const average = roundToTwoDecimals(Math.min(117, best.points / best.units + externalAdjustment));
  const includedSubjectIds = [...best.includedSubjectIds].sort();
  const included = new Set(includedSubjectIds);

  return {
    state: 'calculated',
    average,
    includedSubjectIds,
    excludedSubjectIds: groups
      .map((group) => group.subjectId)
      .filter((subjectId) => !included.has(subjectId))
      .sort(),
    policyVersion: TAU_BAGRUT_PROFILE_POLICY.version,
  };
}

const BGU_ENHANCED_BONUS_BY_SUBJECT = new Map<string, Map<number, number>>([
  [
    'mathematics',
    new Map([
      [4, 20],
      [5, 35],
    ]),
  ],
  [
    'english',
    new Map([
      [4, 15],
      [5, 25],
    ]),
  ],
  ['physics', new Map([[5, 25]])],
  ['chemistry', new Map([[5, 25]])],
  ['literature', new Map([[5, 25]])],
  ['bible', new Map([[5, 25]])],
  ['history', new Map([[5, 25]])],
  ['arabic', new Map([[5, 25]])],
  ['computer_science', new Map([[5, 25]])],
  ['biology', new Map([[5, 25]])],
]);

export type BguBagrutAverageResult =
  | {
      state: 'calculated';
      average: number;
      includedSubjectIds: string[];
      excludedSubjectIds: string[];
      policyVersion: string;
    }
  | AdmissionsPolicyNeedsInput;

/** Replays BGU's published 2026–27 optional-average bonus, omission, and cap rules. */
export function calculateBguBagrutAverage(record: BagrutSubjectRecord): BguBagrutAverageResult {
  const policyVersion = BGU_BAGRUT_PROFILE_POLICY.version;
  if (record.schemaVersion !== 2) {
    return needsInput(policyVersion, ['bagrut_profile_version']);
  }
  if (!record.complete) {
    return needsInput(policyVersion, ['bagrut_certificate_complete']);
  }
  if (record.certificateType !== 'internal') {
    return needsInput(policyVersion, ['bagrut_certificate_type']);
  }

  const exams = record.subjects.filter((subject) => subject.assessmentKind === 'exam');
  const examBySubjectId = new Map(exams.map((subject) => [subject.subjectId, subject]));
  const requiredSubjectIds = new Set(['english', 'mathematics', 'history', 'civics']);
  if (record.sector === 'jewish') requiredSubjectIds.add('hebrew_expression');
  else requiredSubjectIds.add('arabic');
  const missingRequiredSubjects = [...requiredSubjectIds]
    .filter((subjectId) => !examBySubjectId.has(subjectId))
    .sort()
    .map((subjectId) => `bagrut_subject:${subjectId}`);
  if (missingRequiredSubjects.length > 0) {
    return needsInput(policyVersion, missingRequiredSubjects);
  }

  const groups = exams
    .map((subject) => ({
      subjectId: subject.subjectId,
      units: subject.units,
      points: subject.units * (subject.grade + bguBagrutBonusForSubject(subject)),
    }))
    .sort((left, right) => left.subjectId.localeCompare(right.subjectId));
  let states = new Map<string, TauAverageSelection>([['0', emptyTauSelection()]]);
  for (const group of groups) {
    const choices = requiredSubjectIds.has(group.subjectId)
      ? [{ included: true, units: group.units, points: group.points }]
      : [
          { included: false, units: 0, points: 0 },
          { included: true, units: group.units, points: group.points },
        ];
    const nextStates = new Map<string, TauAverageSelection>();
    for (const state of states.values()) {
      for (const choice of choices) {
        const candidate: TauAverageSelection = {
          units: state.units + choice.units,
          points: state.points + choice.points,
          includedSubjectIds: choice.included
            ? [...state.includedSubjectIds, group.subjectId]
            : state.includedSubjectIds,
        };
        const key = String(candidate.units);
        const current = nextStates.get(key);
        if (!current || isBetterTauSelection(candidate, current)) nextStates.set(key, candidate);
      }
    }
    states = nextStates;
  }

  const best = [...states.values()]
    .filter((selection) => selection.units >= 20)
    .sort(compareTauAverageSelections)[0];
  if (!best) return needsInput(policyVersion, ['bagrut_certificate_units']);

  const includedSubjectIds = [...best.includedSubjectIds].sort();
  const included = new Set(includedSubjectIds);
  return {
    state: 'calculated',
    average: roundToOneDecimal(Math.min(120, best.points / best.units)),
    includedSubjectIds,
    excludedSubjectIds: groups
      .map((group) => group.subjectId)
      .filter((subjectId) => !included.has(subjectId))
      .sort(),
    policyVersion,
  };
}

function bguBagrutBonusForSubject(subject: BagrutSubjectV2): number {
  if (subject.grade <= 60) return 0;
  const enhanced = BGU_ENHANCED_BONUS_BY_SUBJECT.get(subject.subjectId)?.get(subject.units);
  if (enhanced !== undefined) return enhanced;
  if (subject.units === 5) return 20;
  if (subject.units === 4) return 10;
  return 0;
}

function roundToOneDecimal(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

interface TauSubjectGroup {
  subjectId: string;
  subjects: BagrutSubjectV2[];
  units: number;
  points: number;
}

interface TauAverageSelection {
  units: number;
  points: number;
  includedSubjectIds: string[];
}

function groupTauSubjects(subjects: BagrutSubjectV2[], sector: BagrutSector): TauSubjectGroup[] {
  const bySubjectId = new Map<string, BagrutSubjectV2[]>();
  for (const subject of subjects) {
    const group = bySubjectId.get(subject.subjectId) ?? [];
    group.push(subject);
    bySubjectId.set(subject.subjectId, group);
  }

  return [...bySubjectId.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([subjectId, entries]) => ({
      subjectId,
      subjects: entries,
      units: entries.reduce((sum, subject) => sum + subject.units, 0),
      points: entries.reduce(
        (sum, subject) =>
          sum + subject.units * (subject.grade + tauBagrutBonusForSubject(subject, sector)),
        0,
      ),
    }));
}

function tauGroupChoices(
  group: TauSubjectGroup,
  required: boolean,
): Array<{ included: boolean; units: number; points: number }> {
  const includedChoices = [{ included: true, units: group.units, points: group.points }];
  const hebrewExam = group.subjects.find(
    (subject) => subject.assessmentKind === 'exam' && subject.units === 3,
  );
  if (required && group.subjectId === 'hebrew_expression' && hebrewExam) {
    includedChoices.push({
      included: true,
      units: group.units - 1,
      points: group.points - hebrewExam.grade,
    });
  }
  return required
    ? includedChoices
    : [{ included: false, units: 0, points: 0 }, ...includedChoices];
}

function emptyTauSelection(): TauAverageSelection {
  return { units: 0, points: 0, includedSubjectIds: [] };
}

function isBetterTauSelection(
  candidate: TauAverageSelection,
  current: TauAverageSelection,
): boolean {
  return (
    candidate.points > current.points ||
    (candidate.points === current.points &&
      candidate.includedSubjectIds.join(',') < current.includedSubjectIds.join(','))
  );
}

function compareTauAverageSelections(
  left: TauAverageSelection,
  right: TauAverageSelection,
): number {
  const crossProduct = right.points * left.units - left.points * right.units;
  return (
    crossProduct ||
    left.units - right.units ||
    left.includedSubjectIds.join(',').localeCompare(right.includedSubjectIds.join(','))
  );
}

// BGU route advice recomputes the published optional Bagrut average locally,
// then sends bounded finalists through the canonical official score replay.
export const BGU_COMPUTER_SCIENCE_ROUTE_POLICY: ReviewedBagrutPolicy = {
  id: 'bgu-computer-science-quantitative',
  version: 'bgu-computer-science-quantitative-2027-2026-07-20',
  authority: 'official-published-requirement',
  sourceUrl:
    'https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_institution=0&p_year=2027&p_semester=1&p_dep1=232&p_pat1=1&p_spe1=3&p_degree_level=1',
  effectiveFrom: '2026-07-20',
  enabled: true,
};

export interface TauEngineeringExactSciencesBonusResult {
  bonus: 0 | 10;
  qualifies: boolean;
  unmetRequirements: Array<'mathematics_5_units_grade_55' | 'physics_5_units_grade_55'>;
}

/**
 * TAU grants a single ten-point adaptation-score bonus when both Mathematics
 * and Physics are five-unit Bagrut subjects with grades of at least 55.
 *
 * This is a gate/bonus policy only. The official TAU calculator remains the
 * authority for the final adaptation score and admission verdict.
 */
export function evaluateTauEngineeringExactSciencesBonus(
  record: Pick<BagrutSubjectRecord, 'subjects'>,
): TauEngineeringExactSciencesBonusResult {
  const mathematics = record.subjects.find(
    (subject) => subject.subjectId === 'mathematics' && isExamSubject(subject),
  );
  const physics = record.subjects.find(
    (subject) => subject.subjectId === 'physics' && isExamSubject(subject),
  );
  const unmetRequirements: TauEngineeringExactSciencesBonusResult['unmetRequirements'] = [];

  if (!qualifiesForFiveUnitBonus(mathematics)) {
    unmetRequirements.push('mathematics_5_units_grade_55');
  }

  if (!qualifiesForFiveUnitBonus(physics)) {
    unmetRequirements.push('physics_5_units_grade_55');
  }

  return {
    bonus: unmetRequirements.length === 0 ? 10 : 0,
    qualifies: unmetRequirements.length === 0,
    unmetRequirements,
  };
}

function qualifiesForFiveUnitBonus(
  subject: BagrutSubjectRecord['subjects'][number] | undefined,
): boolean {
  return subject?.units === 5 && subject.grade >= 55;
}

function isExamSubject(subject: BagrutSubjectRecord['subjects'][number]): boolean {
  return !('assessmentKind' in subject) || subject.assessmentKind === 'exam';
}

export interface EnglishClassificationPolicy {
  id: string;
  version: string;
  sourceUrl: string;
  bands: Array<{
    level: string;
    minimum: number;
    maximum: number;
  }>;
}

export type EnglishClassificationResult =
  | {
      state: 'classified';
      level: string;
      policyVersion: string;
    }
  | AdmissionsPolicyNeedsInput;

/**
 * Institutions own English placement classifications. The raw PET/AMIRNET
 * score is therefore interpreted only through the pair's reviewed policy.
 */
export function classifyPsychometricEnglishScore(
  score: number | undefined,
  policy: EnglishClassificationPolicy,
): EnglishClassificationResult {
  if (score === undefined) {
    return needsInput(policy.version, ['psychometric_english']);
  }

  const matchingBand = policy.bands.find((band) => score >= band.minimum && score <= band.maximum);
  if (!matchingBand) {
    return needsInput(policy.version, ['psychometric_english']);
  }

  return {
    state: 'classified',
    level: matchingBand.level,
    policyVersion: policy.version,
  };
}

type DirectTrackRequiredInput =
  | 'psychometric_math'
  | 'psychometric_verbal'
  | 'psychometric_english'
  | 'math_units'
  | 'math_grade'
  | 'english_units'
  | 'english_grade'
  | 'physics_units'
  | 'physics_grade'
  | 'cs_units'
  | 'cs_grade';

export interface DirectAdmissionsTrackPolicy {
  id: string;
  version: string;
  sourceUrl: string;
  input: DirectTrackRequiredInput;
  minimum: number;
}

export type DirectAdmissionsTrackResult =
  | {
      state: 'eligible' | 'below';
      actual: number;
      minimum: number;
      policyVersion: string;
    }
  | AdmissionsPolicyNeedsInput;

export function evaluateDirectAdmissionsTrack(
  inputs: AdmissionsExtraInputs,
  policy: DirectAdmissionsTrackPolicy,
): DirectAdmissionsTrackResult {
  const actual = numericAdmissionsInput(inputs, policy.input);
  if (actual === undefined) {
    return needsInput(policy.version, [policy.input]);
  }

  return {
    state: actual >= policy.minimum ? 'eligible' : 'below',
    actual,
    minimum: policy.minimum,
    policyVersion: policy.version,
  };
}

export interface OptimizedBagrutPolicy {
  id: string;
  version: string;
  sourceUrl: string;
  recordSchemaVersion: BagrutSubjectRecord['schemaVersion'];
  requiredSubjectIds: string[];
  optionalSubjectIds: string[];
  subjectBonuses: Array<{
    subjectId: string;
    minimumUnits: number;
    bonus: number;
  }>;
  dropOptionalSubjectsWhenAverageImproves: boolean;
}

export interface AdmissionsPolicyNeedsInput {
  state: 'needs_input';
  missingInputs: string[];
  policyVersion: string;
}

export type OptimizedBagrutResult =
  | {
      state: 'calculated';
      average: number;
      includedSubjectIds: string[];
      excludedSubjectIds: string[];
      policyVersion: string;
    }
  | AdmissionsPolicyNeedsInput;

export function evaluateBagrutRecordReadiness(
  record: BagrutSubjectRecord,
  policy: OptimizedBagrutPolicy,
): { state: 'ready'; policyVersion: string } | AdmissionsPolicyNeedsInput {
  if (record.schemaVersion !== policy.recordSchemaVersion) {
    return needsInput(policy.version, ['bagrut_profile_version']);
  }

  const subjectIds = new Set(record.subjects.map((subject) => subject.subjectId));
  const missingSubjects = policy.requiredSubjectIds
    .filter((subjectId) => !subjectIds.has(subjectId))
    .map((subjectId): `bagrut_subject:${string}` => `bagrut_subject:${subjectId}`);
  if (missingSubjects.length > 0) {
    return needsInput(policy.version, missingSubjects);
  }

  return { state: 'ready', policyVersion: policy.version };
}

export function calculateOptimizedBagrutAverage(
  record: BagrutSubjectRecord,
  policy: OptimizedBagrutPolicy,
): OptimizedBagrutResult {
  const readiness = evaluateBagrutRecordReadiness(record, policy);
  if (readiness.state === 'needs_input') {
    return readiness;
  }

  const includedPolicySubjects = new Set([
    ...policy.requiredSubjectIds,
    ...policy.optionalSubjectIds,
  ]);
  const optionalSubjectIds = new Set(policy.optionalSubjectIds);
  const bonusesBySubjectId = new Map(
    policy.subjectBonuses.map((bonus) => [bonus.subjectId, bonus]),
  );
  const candidates = record.subjects
    .filter((subject) => includedPolicySubjects.has(subject.subjectId))
    .map((subject) => {
      const bonus = bonusesBySubjectId.get(subject.subjectId);
      return {
        ...subject,
        adjustedGrade:
          subject.grade + (bonus && subject.units >= bonus.minimumUnits ? bonus.bonus : 0),
      };
    });

  const included = [...candidates];
  const excludedSubjectIds: string[] = [];
  if (policy.dropOptionalSubjectsWhenAverageImproves) {
    const removable = candidates
      .filter((subject) => optionalSubjectIds.has(subject.subjectId))
      .sort((left, right) => left.adjustedGrade - right.adjustedGrade);

    for (const subject of removable) {
      const currentAverage = weightedAverage(included);
      if (subject.adjustedGrade >= currentAverage) {
        continue;
      }
      included.splice(
        included.findIndex((candidate) => candidate.subjectId === subject.subjectId),
        1,
      );
      excludedSubjectIds.push(subject.subjectId);
    }
  }

  return {
    state: 'calculated',
    average: roundToTwoDecimals(weightedAverage(included)),
    includedSubjectIds: included.map((subject) => subject.subjectId).sort(),
    excludedSubjectIds: excludedSubjectIds.sort(),
    policyVersion: policy.version,
  };
}

function numericAdmissionsInput(
  input: AdmissionsExtraInputs,
  requiredInput: DirectTrackRequiredInput,
): number | undefined {
  switch (requiredInput) {
    case 'psychometric_math':
      return input.psychometricMath;
    case 'psychometric_verbal':
      return input.psychometricVerbal;
    case 'psychometric_english':
      return input.psychometricEnglish;
    case 'math_units':
      return input.mathUnits;
    case 'math_grade':
      return input.mathGrade;
    case 'english_units':
      return input.englishUnits;
    case 'english_grade':
      return input.englishGrade;
    case 'physics_units':
      return input.physicsUnits;
    case 'physics_grade':
      return input.physicsGrade;
    case 'cs_units':
      return input.csUnits;
    case 'cs_grade':
      return input.csGrade;
  }
}

function weightedAverage(
  subjects: Array<BagrutSubjectRecord['subjects'][number] & { adjustedGrade: number }>,
): number {
  const totalUnits = subjects.reduce((sum, subject) => sum + subject.units, 0);
  if (totalUnits === 0) {
    return 0;
  }
  return (
    subjects.reduce((sum, subject) => sum + subject.adjustedGrade * subject.units, 0) / totalUnits
  );
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function needsInput(policyVersion: string, missingInputs: string[]): AdmissionsPolicyNeedsInput {
  return {
    state: 'needs_input',
    missingInputs,
    policyVersion,
  };
}
