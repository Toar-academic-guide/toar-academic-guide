import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

export interface HujiDirectPsychometricThresholds {
  directPsychometric?: number;
  directPsychometricKidum?: number;
  directPsychometric30Plus?: number;
}

// https://info.huji.ac.il/bachelor/Psychology — תשפ״ז, checked 2026-10-26.
const FALLBACK_DIRECT_PET = 725;
const FALLBACK_KIDUM_PET = 690;
const PROGRAM_URL = 'https://info.huji.ac.il/bachelor/Psychology';
const KIDUM_URL = 'https://info.huji.ac.il/reception-channels/Kidum';

export function applyHujiPsychologyDirectRoute(
  result: AdmissionsEvaluationResult,
  psychometric: number | undefined,
  feed: HujiDirectPsychometricThresholds = {},
): AdmissionsEvaluationResult {
  if (result.capability !== 'exact' || psychometric === undefined) return result;

  const direct = feed.directPsychometric ?? FALLBACK_DIRECT_PET;
  const kidum = feed.directPsychometricKidum ?? FALLBACK_KIDUM_PET;
  if (psychometric >= direct) {
    return {
      ...result,
      kind: 'exact',
      decision: 'accepted',
      score: psychometric,
      scoreLabel: 'פסיכומטרי',
      threshold: direct,
      scoreAssessment: 'meets_threshold',
      sourceLabel: 'קבלה ישירה לפי פסיכומטרי',
      explanation: `הציון עומד בסף הקבלה הישירה: ציון ${direct} ומעלה בפסיכומטרי.`,
      nextAction: 'בדקו את פרטי ההרשמה באתר החוג.',
      officialUrls: [PROGRAM_URL],
    };
  }

  if (psychometric >= kidum && result.decision !== 'accepted') {
    return {
      ...result,
      capability: 'manual_gate',
      kind: 'manual_gate',
      decision: 'unknown',
      score: undefined,
      scoreLabel: undefined,
      threshold: undefined,
      scoreAssessment: undefined,
      sourceLabel: 'מסלול ראויים לקידום',
      explanation: `קבלה ישירה מציון ${kidum} בפסיכומטרי מיועדת לראויים לקידום בדירוג של 30 נקודות לפחות מטעם האגודה לקידום החינוך.`,
      nextAction: 'בדקו את הדירוג ואת תנאי מסלול ראויים לקידום באתר האוניברסיטה.',
      officialUrls: [PROGRAM_URL, KIDUM_URL],
    };
  }

  return result;
}
