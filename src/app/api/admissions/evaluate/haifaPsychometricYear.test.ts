import { expect, it, vi } from 'vitest';
import { normalizeEvaluationInputs } from '@/server/admissions/evaluationInputs';
import { gapApplicant, gapEvaluate, gapPrograms } from './sekhemCalculatorGap.fixture';

vi.mock('server-only', () => ({}));

it.each([2024, 2026])(
  'resolves the real Haifa evaluator follow-up for sitting year %s, asking for month only when relevant',
  async (year) => {
    const program = gapPrograms.find((row) => row.id === 'haifa_psychology')!;
    const applicant = {
      ...gapApplicant({ haifaBagrutYear: 2020, haifaHebrewQualification: 'hebrew_school' }),
      psychometric: 780,
    };
    const missing = await gapEvaluate(program, 'haifa', applicant);
    expect(missing.result).toMatchObject({
      kind: 'needs_input',
      decision: 'unknown',
      requiredInputs: ['haifa_psychometric_year'],
    });
    expect(missing.result.score).toBeUndefined();

    const answered = {
      ...applicant,
      extraInputs: { ...applicant.extraInputs, haifaPsychometricYear: year },
    };
    const normalized = normalizeEvaluationInputs({ degreeId: program.id, ...answered });
    expect(normalized.input.extraInputs.haifaPsychometricYear).toBe(year);
    expect(normalized.reasons.haifa).toBeUndefined();
    let evaluated = await gapEvaluate(program, 'haifa', answered);
    if (year === 2026) {
      expect(evaluated.result).toMatchObject({
        kind: 'needs_input',
        requiredInputs: ['haifa_psychometric_month'],
      });
      evaluated = await gapEvaluate(program, 'haifa', {
        ...answered,
        extraInputs: { ...answered.extraInputs, haifaPsychometricMonth: 4 },
      });
    }
    expect(evaluated.result.requiredInputs ?? []).toEqual([]);
    expect(evaluated.result.kind).not.toBe('needs_input');
    expect(evaluated.result.decision).not.toBe('unknown');
    expect(evaluated.result.score).toBeGreaterThan(0);
    expect(evaluated.result.estimationReason ?? '').not.toContain('שנת הפסיכומטרי לא נמסרה');
    expect(evaluated.fetcher).not.toHaveBeenCalled();
  },
);
