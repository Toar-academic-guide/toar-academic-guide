import { RiasecDimension, RiasecScores, EnvironmentPreference } from '@/types';
import { QUIZ_QUESTIONS } from '@/data/questions';

export { QUIZ_QUESTIONS };

export function calculateRiasecScores(answers: Record<string, number[]>): {
  scores: RiasecScores;
  environment: EnvironmentPreference;
} {
  const scores: RiasecScores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const environment: EnvironmentPreference = { soloScore: 1, deskScore: 1 };

  for (const question of QUIZ_QUESTIONS) {
    const selectedIndices = answers[question.id] ?? [];
    for (const idx of selectedIndices) {
      const answer = question.answers[idx];
      if (!answer) continue;
      for (const [dim, delta] of Object.entries(answer.riasecDeltas ?? {})) {
        scores[dim as RiasecDimension] += delta as number;
      }
      if (answer.environmentDelta) {
        for (const [key, val] of Object.entries(answer.environmentDelta)) {
          environment[key as keyof EnvironmentPreference] = val as number;
        }
      }
    }
  }

  return { scores, environment };
}

export function getTopDimensions(scores: RiasecScores): [RiasecDimension, RiasecDimension] {
  const sorted = (Object.entries(scores) as [RiasecDimension, number][]).sort(
    (a, b) => b[1] - a[1]
  );
  return [sorted[0][0], sorted[1][0]];
}

export const DIMENSION_LABELS: Record<
  RiasecDimension,
  { name: string; trait: string; color: string }
> = {
  R: { name: 'מעשי',   trait: 'בונה ומהנדס',   color: 'bg-orange-100 text-orange-800' },
  I: { name: 'חוקרי',  trait: 'מנתח ומגלה',    color: 'bg-blue-100 text-blue-800'    },
  A: { name: 'יצירתי', trait: 'אמן ויוצר',      color: 'bg-purple-100 text-purple-800'},
  S: { name: 'חברתי',  trait: 'עוזר ומחבר',     color: 'bg-green-100 text-green-800'  },
  E: { name: 'יזמי',   trait: 'מוביל ומשפיע',   color: 'bg-red-100 text-red-800'      },
  C: { name: 'מסודר',  trait: 'מארגן ומדויק',   color: 'bg-yellow-100 text-yellow-800'},
};
