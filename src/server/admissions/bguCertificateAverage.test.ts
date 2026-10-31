import { describe, expect, it, vi } from 'vitest';
import { admissionsEvaluationSchema } from '@/lib/admissionsEvaluationSchema';
import { buildSekhemInput } from '@/lib/sekhemCalculator';
import { BGU_COMPUTER_SCIENCE_RULE_CAPTURE } from '@/data/admissions/bguComputerScienceVerification';
import { BGU_DATA_SCIENCE_RULE_CAPTURE } from '@/data/admissions/bguDataScienceVerification';
import quantitativeCaptures from '../../../docs/admissions-verification/2026-09-27-bgu-quantitative-routes-official.json';
import {
  gapEvaluate,
  gapPrograms,
} from '@/app/api/admissions/evaluate/sekhemCalculatorGap.fixture';

vi.mock('server-only', () => ({}));

describe('BGU evaluation from the default sekhem form certificate', () => {
  it.each([
    'cs',
    'datascience',
    'business',
    'economics',
    'accounting',
    'bgu_cs',
    'bgu_datascience',
    'bgu_business',
    'bgu_economics',
    'bgu_accounting',
  ])('returns an exact result for %s without asking for a BGU average', async (degreeId) => {
    const input = admissionsEvaluationSchema.parse({
      degreeId,
      ...buildSekhemInput({
        certificate: 'other',
        sector: 'יהודי',
        psychometric: '680',
        quantitative: '140',
        verbal: '130',
        english: '130',
        rows: [
          { label: 'מתמטיקה', units: 5, grade: 90 },
          { label: 'אנגלית', units: 5, grade: 90 },
          { label: 'פיזיקה', units: 5, grade: 90 },
          { label: 'מדעי המחשב', units: 5, grade: 90 },
          { label: 'הבעה עברית', units: 2, grade: 85 },
          { label: 'היסטוריה', units: 2, grade: 85 },
          { label: 'ספרות', units: 2, grade: 85 },
          { label: 'אזרחות', units: 2, grade: 85 },
          { label: 'תנ״ך', units: 2, grade: 85 },
        ],
      }),
    });
    const program = gapPrograms.find((row) => row.id === degreeId)!;
    const rule = degreeId.includes('datascience')
      ? BGU_DATA_SCIENCE_RULE_CAPTURE
      : ['cs', 'bgu_cs'].includes(degreeId)
        ? BGU_COMPUTER_SCIENCE_RULE_CAPTURE
        : quantitativeCaptures.find((capture) => capture.pairId === `${degreeId}__bgu`)!
            .officialRule;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ items: [rule] }))
      // Transport sentinel for score parsing, not a live score claim for this profile.
      .mockResolvedValueOnce(
        new Response(
          '<script>parent.main.document.getElementById("on_c_val").innerHTML = 700;</script>',
        ),
      );
    // Reuse the existing static catalogue, reviewed fingerprints and frozen freshness.
    const { result } = await gapEvaluate(
      program,
      'bgu',
      { psychometric: input.psychometric!, extraInputs: input.extraInputs! },
      fetcher,
    );

    expect.soft(result.requiredInputs ?? []).not.toContain('bgu_bagrut_average');
    expect.soft(result.requiredInputs ?? []).not.toContain('bgu_preparatory_qualification');
    expect(result).toMatchObject({ kind: 'exact', capability: 'exact' });
    expect(result.score).toBeTypeOf('number');
  });
});
