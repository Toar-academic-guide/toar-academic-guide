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
