import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

/** Use returned scores only, with the same display precision as the result. */
export function admissionScoreGap(
  result: Pick<AdmissionsEvaluationResult, 'score' | 'threshold' | 'scoreLabel'>,
  format: (value: number) => string,
): string | undefined {
  if (!Number.isFinite(result.score) || !Number.isFinite(result.threshold)) return undefined;
  if (result.threshold! <= result.score!) return undefined;
  const score = format(result.score!);
  const threshold = format(result.threshold!);
  // Compare the displayed values so rounded scores and their gap agree.
  const gap = Number(threshold.replaceAll(',', '')) - Number(score.replaceAll(',', ''));
  if (!Number.isFinite(gap) || gap <= 0) return undefined;
  // Remove subtraction noise (22.5 - 21.12), preserving the returned scale.
  const displayed = format(Number(gap.toPrecision(12)));
  return /[1-9]/.test(displayed)
    ? `חסרות לכם ${displayed} נקודות ב${result.scoreLabel || 'ציון הקבלה'} לסף (${score} לעומת ${threshold})`
    : undefined;
}
