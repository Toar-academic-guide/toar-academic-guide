import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';

export const TAU_LAW_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/law/ba/law?v=admission-requirements';

export function evaluateTauLawGates(
  input: AdmissionsEvaluationInput,
):
  | { state: 'pass'; unmetRequirements: [] }
  | { state: 'below'; unmetRequirements: string[] }
  | { state: 'needs_input'; requiredInputs: 'psychometric_english'[] } {
  const psychometricEnglish = input.extraInputs?.psychometricEnglish;
  if (typeof psychometricEnglish !== 'number') {
    return { state: 'needs_input', requiredInputs: ['psychometric_english'] };
  }

  const unmetRequirements: string[] = [];
  if (input.psychometric < 600) {
    unmetRequirements.push('פסיכומטרי 600 ומעלה');
  }
  if (psychometricEnglish < 100) {
    unmetRequirements.push('אנגלית בפסיכומטרי ברמת 100 ומעלה');
  }

  return unmetRequirements.length > 0
    ? { state: 'below', unmetRequirements }
    : { state: 'pass', unmetRequirements: [] };
}
