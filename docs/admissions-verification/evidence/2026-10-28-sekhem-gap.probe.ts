// Diagnostic specification of Jorje's requested EVERY-programme numeric contract.
// Run explicitly with the temporary include override documented in the gap note.
// Legitimate programme gates and unresolved Haifa integration keep this probe red;
// these assertions are retained unchanged, outside the green regression suite.
import { expect, it, vi } from 'vitest';
import {
  gapSweep,
  gapApplicant,
  gapEvaluate,
  programsFor,
  savedGapPrograms,
} from '../../../src/app/api/admissions/evaluate/sekhemCalculatorGap.fixture';
vi.mock('server-only', () => ({}));

it.each(['technion', 'haifa'])(
  '%s #320 full persona produces a numeric score for EVERY catalogue programme',
  async (institution) => {
    const rows = (await gapSweep(institution)).map((row) => ({ catalogue: 'static', ...row }));
    rows.push(
      ...(await gapSweep(institution, savedGapPrograms)).map((row) => ({
        catalogue: 'saved_audit',
        ...row,
      })),
    );
    const missing = rows.filter((row) => !Number.isFinite(row.score));
    console.log(
      JSON.stringify(
        {
          institution,
          rows,
          thresholds: programsFor(institution).map((p) => ({
            id: p.id,
            threshold: p.thresholds?.[institution],
          })),
        },
        null,
        2,
      ),
    );
    expect(missing, JSON.stringify(missing)).toEqual([]);
  },
);

it('diagnoses Haifa continuation fields without inventing applicant history', async () => {
  for (const extra of [
    { haifaBagrutAverage: 102 },
    {
      haifaBagrutAverage: 102,
      haifaBagrutYear: 2020,
      haifaPsychometricYear: 2025,
      haifaHebrewQualification: 'hebrew_school' as const,
    },
  ]) {
    const rows = [];
    for (const program of programsFor('haifa', savedGapPrograms)) {
      const { result, fetcher } = await gapEvaluate(program, 'haifa', gapApplicant(extra));
      rows.push({
        id: program.id,
        kind: result.kind,
        score: result.score,
        requiredInputs: result.requiredInputs ?? [],
        calls: fetcher.mock.calls.length,
        explanation: result.explanation,
      });
    }
    console.log(JSON.stringify({ extra, rows }, null, 2));
    expect(rows).toHaveLength(27);
  }
});
