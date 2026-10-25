import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAdmissionsBatch, fetchAdmissionsEvaluation } from './admissionsEvaluationClient';

const bagrutSubjectRecord = {
  schemaVersion: 2 as const,
  sector: 'jewish' as const,
  certificateType: 'internal' as const,
  complete: false,
  subjects: [
    { subjectId: 'mathematics', units: 5, grade: 90, assessmentKind: 'exam' as const },
    { subjectId: 'english', units: 5, grade: 80, assessmentKind: 'exam' as const },
  ],
};
afterEach(() => vi.unstubAllGlobals());

describe('overall average in admissions API payloads', () => {
  it.each(['single', 'batch'] as const)(
    'sends the derived average and its provenance for a %s request',
    async (mode) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(JSON.stringify({ data: { reports: {}, results: [] } })));
      vi.stubGlobal('fetch', fetcher);
      const input = { psychometric: 650, extraInputs: { bagrutSubjectRecord } };
      const original = structuredClone(input);
      if (mode === 'batch') await fetchAdmissionsBatch({ ...input, degreeIds: ['ono_cs'] });
      else await fetchAdmissionsEvaluation({ ...input, degreeId: 'ono_cs' });
      expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
        bagrut: 85,
        bagrutAverageEstimated: true,
      });
      expect(input).toEqual(original);
    },
  );
  it('preserves an entered average when the subjects have a different unit average', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ data: { reports: {} } })));
    vi.stubGlobal('fetch', fetcher);
    await fetchAdmissionsBatch({
      degreeIds: ['ono_cs'],
      bagrut: 105,
      extraInputs: { bagrutSubjectRecord },
    });
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body.bagrut).toBe(105);
    expect(body.bagrutAverageEstimated).toBeUndefined();
  });
});
