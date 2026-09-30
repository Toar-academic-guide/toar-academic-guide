export const TAU_MANAGEMENT_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/management/ba/management?v=requirements';

/** Institutional averages and confirmed conditions must come from the applicant. */
export interface TauManagementApplicant {
  psychometric?: number;
  bagrutAverage?: number;
  managementScore?: number;
  acceptanceThreshold: number;
  rejectionThreshold: number;
  mathUnits?: number;
  mathGrade?: number;
  quantitativeScore?: number;
  englishUnits?: number;
  englishGrade?: number;
  /** General university requirements, permissible academic history, and the second major. */
  requirementsConfirmed?: boolean;
  /** Recognized academic study of at least 30 hours with an average of at least 85. */
  academicRouteConfirmed?: boolean;
  /** Up to two of the four listed courses, each completed at grade 85 or above. */
  qualifyingMoocCount?: 0 | 1 | 2;
  /** Financial Reports and introductory Python, each completed at grade 85 or above. */
  noPsychometricMoocsConfirmed?: boolean;
}

type ApplicantField = keyof TauManagementApplicant;
type ManagementRoute =
  | 'psychometric_680'
  | 'psychometric_bagrut'
  | 'academic_study'
  | 'no_psychometric'
  | 'management_score'
  | 'pma';

interface Condition {
  passed: boolean | undefined;
  missing: ApplicantField[];
}

export interface TauManagementAdmission {
  decision: 'accepted' | 'below' | 'pending' | 'needs_input';
  route?: ManagementRoute;
  missingInputs: ApplicantField[];
  unmetRequirements: Array<'general_requirements' | 'mathematics'>;
  pma?: number;
  adjustedManagementScore?: number;
}

function all(...conditions: Condition[]): Condition {
  if (conditions.some((condition) => condition.passed === false)) {
    return { passed: false, missing: [] };
  }
  const missing = [...new Set(conditions.flatMap((condition) => condition.missing))];
  return { passed: missing.length ? undefined : true, missing };
}

function either(...conditions: Condition[]): Condition {
  if (conditions.some((condition) => condition.passed === true)) {
    return { passed: true, missing: [] };
  }
  const missing = [...new Set(conditions.flatMap((condition) => condition.missing))];
  return { passed: missing.length ? undefined : false, missing };
}

/** All ordinary published routes; discretionary exceptional admission is not predicted. */
export function evaluateTauManagementAdmission(
  input: TauManagementApplicant,
): TauManagementAdmission {
  const result: TauManagementAdmission = {
    decision: 'below',
    missingInputs: [],
    unmetRequirements: [],
  };
  const check = (
    field: ApplicantField,
    predicate: (value: number | boolean) => boolean,
  ): Condition => {
    const value = input[field];
    return value === undefined
      ? { passed: undefined, missing: [field] }
      : { passed: predicate(value), missing: [] };
  };
  const minimum = (field: ApplicantField, value: number) =>
    check(field, (actual) => typeof actual === 'number' && actual >= value);
  const equals = (field: ApplicantField, value: number) =>
    check(field, (actual) => actual === value);
  const confirmed = (field: ApplicantField) => check(field, (actual) => actual === true);

  const commonRequirements = confirmed('requirementsConfirmed');
  if (commonRequirements.passed !== true) {
    return {
      ...result,
      decision: commonRequirements.passed === false ? 'below' : 'needs_input',
      missingInputs: commonRequirements.missing,
      unmetRequirements: commonRequirements.passed === false ? ['general_requirements'] : [],
    };
  }
  const mathematics = either(
    all(minimum('mathUnits', 4), minimum('mathGrade', 55)),
    minimum('quantitativeScore', 140),
  );
  if (mathematics.passed !== true) {
    return {
      ...result,
      decision: mathematics.passed === false ? 'below' : 'needs_input',
      missingInputs: mathematics.missing,
      unmetRequirements: mathematics.passed === false ? ['mathematics'] : [],
    };
  }

  const candidates: Array<{ route: ManagementRoute; condition: Condition }> = [
    { route: 'psychometric_680', condition: minimum('psychometric', 680) },
    {
      route: 'psychometric_bagrut',
      condition: all(minimum('psychometric', 640), minimum('bagrutAverage', 95)),
    },
    {
      route: 'academic_study',
      condition: all(minimum('psychometric', 640), confirmed('academicRouteConfirmed')),
    },
    {
      route: 'no_psychometric',
      condition: all(
        minimum('bagrutAverage', 104),
        equals('englishUnits', 5),
        minimum('englishGrade', 85),
        either(
          all(equals('mathUnits', 5), minimum('mathGrade', 70)),
          all(equals('mathUnits', 4), minimum('mathGrade', 90)),
        ),
        confirmed('noPsychometricMoocsConfirmed'),
      ),
    },
  ];
  const direct = candidates.find((candidate) => candidate.condition.passed === true);
  if (direct) return { ...result, decision: 'accepted', route: direct.route };

  const { psychometric, mathUnits, mathGrade, englishUnits, englishGrade } = input;
  const pmaMissing = (
    ['psychometric', 'mathUnits', 'mathGrade', 'englishUnits', 'englishGrade'] as const
  ).filter((field) => input[field] === undefined);
  if (
    psychometric !== undefined &&
    mathUnits !== undefined &&
    mathGrade !== undefined &&
    englishUnits !== undefined &&
    englishGrade !== undefined
  ) {
    const bonus = (units: number, grade: number, fiveUnitBonus: number) =>
      grade < 60 ? 0 : units === 5 ? fiveUnitBonus : units === 4 ? 12.5 : 0;
    result.pma =
      psychometric +
      mathGrade +
      bonus(mathUnits, mathGrade, 35) +
      englishGrade +
      bonus(englishUnits, englishGrade, 25);
  }
  const pmaEligible: Condition =
    result.pma === undefined
      ? { passed: undefined, missing: [...pmaMissing] }
      : { passed: result.pma >= 835, missing: [] };

  // The two named courses are also in the four-course bonus list.
  const courseCount = input.noPsychometricMoocsConfirmed === true ? 2 : input.qualifyingMoocCount;
  if (input.managementScore !== undefined && courseCount !== undefined) {
    result.adjustedManagementScore = input.managementScore + 5 * courseCount;
  }
  const scoreReaches = (threshold: number, inclusive = true): Condition => {
    const passes = (score: number) => (inclusive ? score >= threshold : score > threshold);
    if (input.managementScore === undefined) {
      return { passed: undefined, missing: ['managementScore'] };
    }
    if (passes(input.managementScore)) return { passed: true, missing: [] };
    if (courseCount !== undefined) {
      return { passed: passes(input.managementScore + 5 * courseCount), missing: [] };
    }
    return !passes(input.managementScore + 10)
      ? { passed: false, missing: [] }
      : { passed: undefined, missing: ['qualifyingMoocCount'] };
  };
  const scoreAccepted = scoreReaches(input.acceptanceThreshold);
  candidates.push(
    { route: 'management_score', condition: all(minimum('psychometric', 620), scoreAccepted) },
    { route: 'pma', condition: all(pmaEligible, scoreAccepted) },
  );
  const accepted = candidates.find((candidate) => candidate.condition.passed === true);
  if (accepted) return { ...result, decision: 'accepted', route: accepted.route };

  const scorePending = scoreReaches(input.rejectionThreshold, false);
  const pending = either(
    all(minimum('psychometric', 620), scorePending),
    all(pmaEligible, scorePending),
  );
  const missingInputs = [
    ...new Set([
      ...candidates.flatMap((candidate) => candidate.condition.missing),
      ...pending.missing,
    ]),
  ];
  if (missingInputs.length) return { ...result, decision: 'needs_input', missingInputs };
  return { ...result, decision: pending.passed === true ? 'pending' : 'below' };
}
