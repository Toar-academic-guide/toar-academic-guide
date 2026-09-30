import type { AdmissionsExtraInputs, AdmissionsRequiredInput } from '@/types/admissionsEvaluation';

export const TECHNION_ARCHITECTURE_REQUIRED_INPUTS: AdmissionsRequiredInput[] = [
  'technion_architecture_bagrut_average',
  'technion_architecture_exam_score',
  'technion_architecture_exam_passed',
  'technion_architecture_requirements',
];

// Form 73, field 5, on the official calculator; tokens retain the official field IDs.
export const TECHNION_ARCHITECTURE_FORMULA = '(0.7*((0.1*D)+(0.09*P)+15))+(0.3*A)';
export const TECHNION_ARCHITECTURE_CUTOFF = 85;
export const TECHNION_ARCHITECTURE_REQUIREMENTS_URL =
  'https://admissions.technion.ac.il/architecture-info/';

export function calculateTechnionArchitectureScore(
  average: number,
  psychometric: number,
  exam: number,
): number {
  if (
    !Number.isFinite(average) ||
    average < 0 ||
    average > 119 ||
    !Number.isFinite(psychometric) ||
    psychometric < 200 ||
    psychometric > 800 ||
    !Number.isFinite(exam) ||
    exam < 0 ||
    exam > 140
  ) {
    throw new Error('Invalid Architecture average, psychometric or entrance examination score');
  }
  return Math.round((0.7 * (0.1 * average + 0.09 * psychometric + 15) + 0.3 * exam) * 10) / 10;
}

export function technionArchitectureUnmetRequirements(inputs: AdmissionsExtraInputs): string[] {
  const unmet: string[] = [];
  if (inputs.technionArchitectureExamPassed !== true)
    unmet.push('תוצאה רשמית של ״עובר״ בבחינת הכניסה לארכיטקטורה');
  if (inputs.technionArchitectureRequirementsConfirmed !== true)
    unmet.push('תנאי ההגשה במסלול הבגרות הרגיל, כולל מקצועות, שפות, הרשמה ותוקף הציונים');
  return unmet;
}
