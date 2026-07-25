import type { BagrutSubjectRecord } from '@/types';
import type { AdmissionsExtraInputs, AdmissionsRequiredInput } from '@/types/admissionsEvaluation';

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

// BGU publishes the CS cutoff and minimum gates, but its official quantitative
// calculator has not yet been reproduced as a local, fixture-backed score
// model. Keep the generic calculator shortcut out of route advice.
export const BGU_COMPUTER_SCIENCE_ROUTE_POLICY: ReviewedBagrutPolicy = {
  id: 'bgu-computer-science-quantitative',
  version: 'bgu-computer-science-quantitative-2027-2026-07-20',
  authority: 'official-published-requirement',
  sourceUrl:
    'https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_institution=0&p_year=2027&p_semester=1&p_dep1=232&p_pat1=1&p_spe1=3&p_degree_level=1',
  effectiveFrom: '2026-07-20',
  enabled: false,
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
  const mathematics = record.subjects.find((subject) => subject.subjectId === 'mathematics');
  const physics = record.subjects.find((subject) => subject.subjectId === 'physics');
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

function needsInput(
  policyVersion: string,
  missingInputs: Array<AdmissionsRequiredInput | `bagrut_subject:${string}`>,
): AdmissionsPolicyNeedsInput {
  return {
    state: 'needs_input',
    missingInputs,
    policyVersion,
  };
}
