import { RiasecDimension, RiasecScores, GeographicRegion, AvoidanceTag } from '@/types';
import { QUIZ_QUESTIONS } from '@/data/questions';
import { MAX_RAW_SCORE } from '@/data/riasecItems';

export { QUIZ_QUESTIONS };

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Convert raw RIASEC exam scores (0–14 per dimension) to the 0–5 scale used
 * by the recommendation engine's dot-product.
 */
export function normalizeRiasecScores(
  rawScores: Record<RiasecDimension, number>
): RiasecScores {
  const dims: RiasecDimension[] = ['R', 'I', 'A', 'S', 'E', 'C'];
  const out = {} as RiasecScores;
  for (const d of dims) {
    out[d] = Math.round((rawScores[d] / MAX_RAW_SCORE) * 5);
  }
  return out;
}

// ── Filter-question extraction ────────────────────────────────────────────────

/**
 * Extract geographic preference and avoidance selections from the two
 * post-exam filter questions ('geography' and 'avoidances').
 * This no longer accumulates RIASEC scores — that is done by RiasecExam.
 */
export function extractFilterAnswers(answers: Record<string, string[]>): {
  geographicPreference: GeographicRegion;
  avoidances: AvoidanceTag[];
} {
  let geographicPreference: GeographicRegion = 'any';
  const avoidances: AvoidanceTag[] = [];

  for (const question of QUIZ_QUESTIONS) {
    const selectedLabels = answers[question.id] ?? [];
    for (const label of selectedLabels) {
      const answer = question.answers.find((a) => a.label === label);
      if (!answer) continue;

      if (question.id === 'geography' && answer.geographicTag) {
        geographicPreference = answer.geographicTag;
      }
      if (question.id === 'avoidances' && answer.avoidanceTag) {
        avoidances.push(answer.avoidanceTag);
      }
    }
  }

  return { geographicPreference, avoidances };
}

// ── Legacy alias ──────────────────────────────────────────────────────────────
// Kept to avoid breaking any future callers; prefer extractFilterAnswers().
export { extractFilterAnswers as calculateRiasecScores };

// ── Dimension display labels ──────────────────────────────────────────────────

export function getTopDimensions(scores: RiasecScores): [RiasecDimension, RiasecDimension] {
  const sorted = (Object.entries(scores) as [RiasecDimension, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  return [sorted[0][0], sorted[1][0]];
}

export const DIMENSION_LABELS: Record<
  RiasecDimension,
  { name: string; nameF: string; trait: string; color: string }
> = {
  R: { name: 'מעשי',   nameF: 'מעשית',   trait: 'בונה ומהנדס',   color: 'bg-orange-100 text-orange-800' },
  I: { name: 'חוקרי',  nameF: 'חוקרית',  trait: 'מנתח ומגלה',    color: 'bg-blue-100 text-blue-800'    },
  A: { name: 'יצירתי', nameF: 'יצירתית', trait: 'אמן ויוצר',      color: 'bg-purple-100 text-purple-800'},
  S: { name: 'חברתי',  nameF: 'חברתית',  trait: 'עוזר ומחבר',     color: 'bg-green-100 text-green-800'  },
  E: { name: 'יזמי',   nameF: 'יזמית',   trait: 'מוביל ומשפיע',   color: 'bg-red-100 text-red-800'      },
  C: { name: 'מסודר',  nameF: 'מסודרת',  trait: 'מארגן ומדויק',   color: 'bg-yellow-100 text-yellow-800'},
};
