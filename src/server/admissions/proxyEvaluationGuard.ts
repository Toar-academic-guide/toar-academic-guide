import type {
  AdmissionsEvaluationInput,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';
import { isBguPsychologyProgram } from '@/lib/bguPsychologyInputs';
import { resolveBguPsychologyScores } from './bguPsychologyPolicy';
import { colmanProxyChannelAssessment } from './colmanPublishedRoutesEvaluation';

/** Direct scores, preparatory averages and age routes do not use the institution-average proxy. */
export function usesInstitutionAverageProxy(
  result: AdmissionsEvaluationResult,
  input: AdmissionsEvaluationInput,
) {
  // The legacy general BGU adapter reads applicant.bagrutAverage, not extra.bguBagrutAverage.
  if (
    result.linkedInstitutionId === 'bgu' &&
    ['bgu_nursing', 'bgu_medicine'].includes(input.degreeId)
  )
    return false;
  return !/^(פסיכומטרי|ממוצע מכינה|ממוצע תואר|גיל)/.test(result.scoreLabel ?? '');
}

function otherBguPsychologyChannelsFailed(input: AdmissionsEvaluationInput) {
  const extra = input.extraInputs ?? {};
  if (extra.bguPsychologyRoute === 'bagrut') return false;
  const psychometric = resolveBguPsychologyScores({
    ...input,
    extraInputs: { ...extra, bguPsychologyRoute: 'psychometric' },
  });
  // An unspecified preparatory history cannot establish failure of that channel.
  const preparatoryKnown =
    extra.bguPreparatoryCompleted === false ||
    (extra.bguPreparatoryTrack !== undefined &&
      extra.bguPreparatoryCompleted === true &&
      extra.bguPreparatoryAverage !== undefined);
  const bagrut = resolveBguPsychologyScores({
    ...input,
    extraInputs: { ...extra, bguPsychologyRoute: 'bagrut' },
  });
  return (
    psychometric.kind === 'below' &&
    preparatoryKnown &&
    bagrut.kind === 'below' &&
    bagrut.score !== undefined &&
    bagrut.threshold !== undefined &&
    !isBorderlineProxyScore(bagrut.score, bagrut.threshold)
  );
}

function isBorderlineProxyScore(score: number, floor: number) {
  // Ruling G2: /workspace/codex-tasks/r1-pr278-rulings-2026-10-25.md.
  // Inclusive band: |score - floor| <= 0.02 * floor, only for a proxy-derived score.
  // Scale-relative tolerance preserves decimal boundaries in binary floating point.
  return floor > 0 && Math.abs(score - floor) <= (0.02 + Number.EPSILON * 4) * floor;
}

export function guardProxyEvaluation(
  result: AdmissionsEvaluationResult,
  input: AdmissionsEvaluationInput,
): AdmissionsEvaluationResult {
  if (['degraded', 'unsupported', 'authority_unavailable'].includes(result.kind)) return result;
  const colman =
    result.linkedInstitutionId === 'colman' ? colmanProxyChannelAssessment(input) : undefined;
  const usesProxyScore = usesInstitutionAverageProxy(result, input);
  const borderline =
    usesProxyScore &&
    result.score !== undefined &&
    typeof result.threshold === 'number' &&
    isBorderlineProxyScore(result.score, result.threshold);
  const proxyBelow =
    (usesProxyScore && result.score !== undefined && result.decision === 'below') ||
    colman?.bagrutBelow;
  if (!borderline && !proxyBelow) return result;
  const allOtherChannelsFailed =
    proxyBelow &&
    (colman?.otherChannelsFailed ??
      (result.linkedInstitutionId === 'bgu' && isBguPsychologyProgram(input.degreeId)
        ? otherBguPsychologyChannelsFailed(input)
        : false));
  if (!borderline && allOtherChannelsFailed) return result;
  return {
    ...result,
    ...(result.linkedInstitutionId === 'bgu' && isBguPsychologyProgram(input.degreeId)
      ? { score: undefined, deltaNeeded: undefined }
      : {}),
    capability: 'needs_input',
    kind: 'needs_input',
    decision: 'unknown',
    requiredInputs: ['bagrut_subject_record'],
    scoreAssessment: undefined,
    explanation: 'נדרשים מקצועות הבגרות לחישוב הממוצע המוסדי ולבדיקת תנאי הקבלה.',
    nextAction: [result.nextAction, 'השלימו את מקצועות הבגרות בפרופיל האקדמי.']
      .filter(Boolean)
      .join(' '),
  };
}
