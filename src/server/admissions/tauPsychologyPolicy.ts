import type {
  AdmissionsEvaluationInput,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';

export const TAU_PSYCHOLOGY_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/social-sciences/ba/psychology?v=admission-requirements';

export const TAU_PSYCHOLOGY_POLICY = {
  admissionCycle: '2026-2027',
  officialNodeId: 8275,
  officialProgramId: '107111050000',
  acceptanceCutoff: 660,
  rejectionCutoff: 659,
  minimumEnglish: 100,
} as const;

export type TauPsychologyGateResult =
  | { state: 'needs_input'; requiredInputs: AdmissionsRequiredInput[] }
  | { state: 'below'; unmetRequirements: string[] }
  | { state: 'pass' };

export function evaluateTauPsychologyGates(
  input: AdmissionsEvaluationInput,
): TauPsychologyGateResult {
  const psychometricEnglish = input.extraInputs?.psychometricEnglish;
  if (psychometricEnglish === undefined) {
    return {
      state: 'needs_input',
      requiredInputs: ['psychometric_english'],
    };
  }

  return psychometricEnglish < TAU_PSYCHOLOGY_POLICY.minimumEnglish
    ? {
        state: 'below',
        unmetRequirements: [
          `רמת מתקדמים א׳ באנגלית (${TAU_PSYCHOLOGY_POLICY.minimumEnglish} ומעלה)`,
        ],
      }
    : { state: 'pass' };
}
