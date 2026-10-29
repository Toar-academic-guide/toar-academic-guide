import { describe, expect, it } from 'vitest';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';
import { resultPresentation } from './sekhemResultPresentation';
import { resultVerdict } from './sekhemCalculator';

const below = (
  institutionId: string,
  score: number | null | undefined,
  threshold: number | null | undefined,
): AdmissionsEvaluationResult =>
  ({
    institution: { id: institutionId, name: institutionId, region: 'center' },
    linkedInstitutionId: institutionId,
    kind: 'exact',
    capability: 'exact',
    decision: 'below',
    confidence: 'high',
    sourceLabel: '',
    explanation: '',
    nextAction: '',
    score,
    threshold,
  }) as AdmissionsEvaluationResult;

describe('row 22 sekhem below copy', () => {
  it.each([
    ['tau', 648, 735, '87'],
    ['huji', 21.12, 22.5, '1.38'],
    ['huji', 25.186, 25.5, '0.314'],
    ['reichman', 635.7968000000001, 650, '14'],
    ['reichman', 635.2, 650, '15'],
    ['tau', 0, 1, '1'],
  ] as const)('formats the returned %s gap from %s to %s as %s', (id, score, threshold, gap) => {
    for (const kind of ['exact', 'estimated'] as const) {
      const row = { ...below(id, score, threshold), kind };
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 22)
      expect(resultPresentation(row)).toEqual({
        text: `חסרות לכם ${gap} נקודות לסף`,
        tone: 'negative',
      });
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 22)
      expect(resultVerdict(row)).toBe(`חסרות לכם ${gap} נקודות לסף`);
      expect(row.score).toBe(score);
      expect(row.threshold).toBe(threshold);
      expect(row.decision).toBe('below');
    }
  });

  it.each([
    [undefined, 650],
    [null, 650],
    [640, undefined],
    [640, null],
    [undefined, undefined],
    [NaN, 650],
    [640, NaN],
    [Infinity, 650],
    [640, Infinity],
    [-Infinity, 650],
    [640, -Infinity],
    [650, 650],
    [651, 650],
    [649.9, 650],
    [-Number.MAX_VALUE, Number.MAX_VALUE],
  ])(
    'uses the fallback for missing, non-finite, nonpositive or rounded-to-zero gaps (%s, %s)',
    (score, threshold) => {
      for (const kind of ['exact', 'estimated'] as const) {
        const row = { ...below('reichman', score, threshold), kind };
        // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 22)
        expect(resultPresentation(row)).toEqual({
          text: 'עוד לא בסף. בואו נמצא דרך.',
          tone: 'negative',
        });
        // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 22)
        expect(resultVerdict(row)).toBe('עוד לא בסף. בואו נמצא דרך.');
      }
    },
  );

  it('uses a below score assessment even when the decision is unknown', () => {
    const row = {
      ...below('huji', 21.12, 22.5),
      decision: 'unknown' as const,
      scoreAssessment: 'below_threshold' as const,
    };
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 22)
    expect(resultPresentation(row)).toEqual({
      text: 'חסרות לכם 1.38 נקודות לסף',
      tone: 'negative',
    });
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 22)
    expect(resultVerdict(row)).toBe('חסרות לכם 1.38 נקודות לסף');
  });
});
