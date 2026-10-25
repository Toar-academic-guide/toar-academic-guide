import type {
  AdmissionsEvaluationResult,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';

export type AdditionalCondition = NonNullable<
  AdmissionsEvaluationResult['additionalConditions']
>[number];

export function confirmationCondition(
  id: AdmissionsRequiredInput,
  label: string,
  value: boolean | undefined,
): AdditionalCondition {
  return { id, label, status: value === undefined ? 'unconfirmed' : value ? 'confirmed' : 'unmet' };
}

/** A score result never confirms separate conditions or overrides unavailable official evidence. */
export function withScoreAssessment(
  result: AdmissionsEvaluationResult,
  conditions: AdditionalCondition[],
): AdmissionsEvaluationResult {
  if (
    result.score === undefined ||
    !['exact', 'manual_gate'].includes(result.kind) ||
    !['accepted', 'eligible_to_apply', 'below', 'pending'].includes(result.decision)
  )
    return { ...result, additionalConditions: conditions };

  const meets =
    result.scoreAssessment !== undefined
      ? result.scoreAssessment === 'meets_threshold'
      : result.decision === 'accepted' || result.decision === 'eligible_to_apply';
  const unmet = conditions.some((condition) => condition.status === 'unmet');
  const outstanding = conditions.some((condition) => condition.status !== 'confirmed');
  return {
    ...result,
    ...((result.scoreAssessment || result.decision !== 'pending') && {
      scoreAssessment: meets ? ('meets_threshold' as const) : ('below_threshold' as const),
    }),
    additionalConditions: conditions,
    decision:
      unmet || result.decision === 'below'
        ? 'below'
        : outstanding
          ? 'pending'
          : meets
            ? 'eligible_to_apply'
            : result.decision,
    sourceLabel: 'התאמה לפי הציונים',
    ...(outstanding &&
      !result.nextAction && {
        nextAction: unmet
          ? 'לפי הנתונים שהוזנו, תנאים נוספים אינם מתקיימים. אפשר לברר מול המוסד.'
          : 'יש לבדוק את התנאים הנוספים. עמידה בסף הציונים אינה אישור קבלה.',
      }),
  };
}
