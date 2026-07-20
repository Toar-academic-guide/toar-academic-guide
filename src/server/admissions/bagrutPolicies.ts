import type { BagrutSubjectRecord } from '@/types';

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

// The existing BGU source adapter can reproduce a score, but it does not yet
// provide the program-specific gates and changing cutoff required to verify a
// route. Keeping this policy explicit and disabled prevents the old generic
// weighted-score shortcut from being promoted into route advice.
export const BGU_COMPUTER_SCIENCE_ROUTE_POLICY: ReviewedBagrutPolicy = {
  id: 'bgu-computer-science-quantitative',
  version: 'bgu-computer-science-quantitative-pending-evidence',
  authority: 'evidence-incomplete',
  sourceUrl: 'https://bgu4u.bgu.ac.il/html/average_calc/index.php',
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
