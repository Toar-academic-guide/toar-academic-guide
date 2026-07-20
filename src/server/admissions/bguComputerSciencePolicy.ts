import type { BagrutSubject } from '@/types';

export const BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY = {
  id: 'bgu-computer-science-quantitative',
  version: 'bgu-computer-science-quantitative-2027-2026-07-20',
  effectiveFrom: '2026-07-20',
  sourceUrl:
    'https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_institution=0&p_year=2027&p_semester=1&p_dep1=232&p_pat1=1&p_spe1=3&p_degree_level=1',
  calculatorUrl: 'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=4',
  cutoff: 720,
  minimumPsychometric: 600,
  minimumQuantitativeSubscore: 125,
  mathematicsRequirement: '90_at_4_or_80_at_5',
  languageRequirement: 'english_basic_and_hebrew_level_e_when_required',
  // The official calculator can reproduce a score, but no local formula has
  // passed captured-fixture verification and the route action model cannot
  // safely project psychometric subscores or language classification.
  enabledForRoutes: false,
  disabledReason: 'score_model_and_action_inputs_not_yet_reproducible',
} as const;

export type BguComputerScienceUnmetRequirement =
  | 'psychometric_600'
  | 'psychometric_quantitative_125'
  | 'mathematics_90_at_4_or_80_at_5'
  | 'language_classifications';

export function evaluateBguComputerScienceGates(input: {
  psychometric: number;
  quantitativeSubscore: number | undefined;
  subjects: BagrutSubject[];
  languageRequirementsConfirmed: boolean;
}): {
  eligibleForScoreComparison: boolean;
  unmetRequirements: BguComputerScienceUnmetRequirement[];
} {
  const unmetRequirements: BguComputerScienceUnmetRequirement[] = [];

  if (input.psychometric < BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY.minimumPsychometric) {
    unmetRequirements.push('psychometric_600');
  }

  if (
    input.quantitativeSubscore === undefined ||
    input.quantitativeSubscore <
      BGU_COMPUTER_SCIENCE_QUANTITATIVE_POLICY.minimumQuantitativeSubscore
  ) {
    unmetRequirements.push('psychometric_quantitative_125');
  }

  const mathematics = input.subjects.find((subject) => subject.subjectId === 'mathematics');
  const hasQualifiedMathematics =
    mathematics !== undefined &&
    ((mathematics.units >= 4 && mathematics.grade >= 90) ||
      (mathematics.units >= 5 && mathematics.grade >= 80));
  if (!hasQualifiedMathematics) {
    unmetRequirements.push('mathematics_90_at_4_or_80_at_5');
  }

  if (!input.languageRequirementsConfirmed) {
    unmetRequirements.push('language_classifications');
  }

  return {
    eligibleForScoreComparison: unmetRequirements.length === 0,
    unmetRequirements,
  };
}
