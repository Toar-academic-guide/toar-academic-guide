import type {
  AdmissionsEvaluationInput,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';

export const TAU_NURSING_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/med/ba/nursing?v=admission-requirements';

export const TAU_NURSING_POLICY = {
  admissionCycle: '2026-2027',
  officialProgramId: '016211010000',
  acceptanceCutoff: 530,
  rejectionCutoff: 520,
  minimumPsychometric: 520,
  minimumEnglish: 100,
} as const;

export type TauNursingGateResult =
  | { state: 'needs_input'; requiredInputs: AdmissionsRequiredInput[] }
  | { state: 'below'; unmetRequirements: string[] }
  | { state: 'pass' };

export function evaluateTauNursingGates(input: AdmissionsEvaluationInput): TauNursingGateResult {
  const psychometricEnglish = input.extraInputs?.psychometricEnglish;
  if (psychometricEnglish === undefined) {
    return {
      state: 'needs_input',
      requiredInputs: ['psychometric_english'],
    };
  }

  const unmetRequirements: string[] = [];
  if (input.psychometric < TAU_NURSING_POLICY.minimumPsychometric) {
    unmetRequirements.push(`ציון פסיכומטרי ${TAU_NURSING_POLICY.minimumPsychometric} ומעלה`);
  }
  if (psychometricEnglish < TAU_NURSING_POLICY.minimumEnglish) {
    unmetRequirements.push(`רמת מתקדמים א׳ באנגלית (${TAU_NURSING_POLICY.minimumEnglish} ומעלה)`);
  }

  return unmetRequirements.length > 0 ? { state: 'below', unmetRequirements } : { state: 'pass' };
}
