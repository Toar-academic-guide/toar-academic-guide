import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

/** Shared API/UI scope: missing-input and unavailable results are never calculations. */
export function isCalculatedAdmissionResult(
  result: Pick<AdmissionsEvaluationResult, 'kind' | 'decision' | 'score'>,
): boolean {
  if (
    [
      'needs_input',
      'unsupported',
      'requirements_only',
      'degraded',
      'authority_unavailable',
      'tracked_missing_rule',
    ].includes(result.kind)
  )
    return false;
  return (
    (typeof result.score === 'number' && Number.isFinite(result.score)) ||
    ['accepted', 'pending', 'below', 'eligible_to_apply'].includes(result.decision)
  );
}
