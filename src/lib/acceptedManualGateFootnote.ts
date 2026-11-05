import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

export function acceptedManualGateFootnote(
  result?: AdmissionsEvaluationResult,
): string | undefined {
  if (
    result?.decision !== 'accepted' ||
    result.kind !== 'manual_gate' ||
    result.scoreAssessment !== 'meets_threshold'
  )
    return undefined;

  const gate = result.additionalConditions?.find(
    (condition) => condition.id === 'admissions_committee' && condition.status === 'unconfirmed',
  );
  if (!gate) return undefined;
  return `השלב הבא: ${gate.label.replace(/ראיון/g, 'ריאיון')}.`;
}
