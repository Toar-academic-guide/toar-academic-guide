import { expect, it, vi } from 'vitest';
import { normalizeEvaluationInputs } from '@/server/admissions/evaluationInputs';
import { gapApplicant, gapEvaluate, gapPrograms } from './sekhemCalculatorGap.fixture';

vi.mock('server-only', () => ({}));

it('uses the supplied Haifa sitting year or the 2026 default and asks for the month only when relevant', async () => {
  const program = gapPrograms.find((row) => row.id === 'haifa_psychology')!;
  for (const year of [2024, 2026, undefined]) {
    const applicant = {
      ...gapApplicant({
        haifaBagrutYear: 2020,
        haifaHebrewQualification: 'hebrew_school',
        ...(year === undefined ? {} : { haifaPsychometricYear: year }),
      }),
      psychometric: 780,
    };
    const normalized = normalizeEvaluationInputs({ degreeId: program.id, ...applicant });
    expect(normalized.input.extraInputs.haifaPsychometricYear).toBe(year ?? 2026);
    if (year === undefined) {
      expect(normalized.reasons.haifa).toEqual([
        'שנת הפסיכומטרי לא נמסרה; החישוב מניח את מחזור 2026.',
      ]);
    } else {
      expect(normalized.reasons.haifa).toBeUndefined();
    }
    let evaluated = await gapEvaluate(program, 'haifa', applicant);
    if (year !== 2024) {
      expect(evaluated.result).toMatchObject({
        kind: 'needs_input',
        requiredInputs: ['haifa_psychometric_month'],
      });
      evaluated = await gapEvaluate(program, 'haifa', {
        ...applicant,
        extraInputs: { ...applicant.extraInputs, haifaPsychometricMonth: 4 },
      });
    }
    expect(evaluated.result.requiredInputs ?? []).toEqual([]);
    expect(evaluated.result.kind).not.toBe('needs_input');
    expect(evaluated.result.decision).not.toBe('unknown');
    expect(evaluated.result.score).toBeGreaterThan(0);
    expect(evaluated.fetcher).not.toHaveBeenCalled();
  }
});
