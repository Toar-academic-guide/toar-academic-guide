import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '192.0.2.58' }),
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(async () => ({
    data: getStaticCataloguePrograms().filter(
      (program) => !['colman_law', 'colman_business'].includes(program.id),
    ),
  })),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions() }),
}));
vi.mock('@/db/client', () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where: async () => [] }) }) }),
}));

import { listCataloguePrograms } from '@/server/catalogue/queries';
import { POST } from './route';

const request = (body: unknown) =>
  POST(
    new Request('http://localhost/api/admissions/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

describe('programme aliases through the evaluate API with the real evaluator', () => {
  beforeEach(() => resetAdmissionsEvaluationRateLimitForTests());

  for (const [canonicalId, aliasId, boundary] of [
    ['colmgmt_law', 'colman_law', 100],
    ['colmgmt_business', 'colman_business', 85],
  ] as const) {
    // Same Bagrut boundary, weak profile and missing-average inputs as the Colman evaluator tests.
    const fixtures: [string, Omit<AdmissionsEvaluationInput, 'degreeId'>][] = [
      [
        'inclusive Bagrut boundary without psychometric',
        {
          extraInputs: {
            colmanBagrutAverage: boundary,
            colmanBagrutCertificateConfirmed: true,
            psychometricMath: 100,
          },
        },
      ],
      [
        'weak profile',
        {
          bagrut: 70,
          psychometric: 420,
          extraInputs: {
            colmanBagrutAverage: 70,
            colmanBagrutCertificateConfirmed: true,
            psychometricMath: 100,
          },
        },
      ],
      ['missing Colman average', { bagrut: 110 }],
    ];

    it.each(fixtures)(`${aliasId} matches ${canonicalId} for %s`, async (label, applicant) => {
      const canonicalResponse = await request({ ...applicant, degreeId: canonicalId });
      const aliasResponse = await request({ ...applicant, degreeId: aliasId });
      expect(canonicalResponse.status).toBe(200);
      expect(aliasResponse.status).toBe(200);
      const { data: canonical } = await canonicalResponse.json();
      const { data: alias } = await aliasResponse.json();
      expect(alias.input).toEqual({ ...applicant, degreeId: canonicalId });
      expect(alias.program).toEqual(canonical.program);
      expect(alias.program.id).toBe(canonicalId);
      expect(alias.inputDigest).toBe(canonical.inputDigest);
      expect(alias.results).toEqual(canonical.results);
      expect(alias.results).toHaveLength(1);
      expect(alias.results[0]).toMatchObject(
        label === 'missing Colman average'
          ? { decision: 'unknown', requiredInputs: ['colman_bagrut_average'] }
          : {
              decision: label === 'weak profile' ? 'below' : 'eligible_to_apply',
              threshold: boundary,
            },
      );
    });
  }

  it('keeps alias and canonical batch keys separate while evaluating the canonical rows', async () => {
    const degreeIds = ['colman_law', 'colmgmt_law', 'colman_business', 'colmgmt_business'];
    const response = await request({
      degreeIds,
      extraInputs: { colmanBagrutAverage: 100, colmanBagrutCertificateConfirmed: true },
    });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(Object.keys(data.reports).sort()).toEqual([...degreeIds].sort());
    expect(data.failedDegreeIds).toEqual([]);
    for (const [aliasId, canonicalId, threshold] of [
      ['colman_law', 'colmgmt_law', 100],
      ['colman_business', 'colmgmt_business', 85],
    ] as const) {
      expect(data.reports[aliasId].input.degreeId).toBe(canonicalId);
      expect(data.reports[aliasId].program.id).toBe(canonicalId);
      expect(data.reports[aliasId].results).toEqual(data.reports[canonicalId].results);
      expect(data.reports[aliasId].results[0]).toMatchObject({
        decision: 'eligible_to_apply',
        threshold,
      });
    }
  });

  it.each(['unknown-program', 'colman_law'])(
    'returns the existing 404 for %s when its canonical row is missing',
    async (degreeId) => {
      vi.mocked(listCataloguePrograms).mockResolvedValueOnce({
        data: getStaticCataloguePrograms().filter((program) => program.id === degreeId),
        meta: {},
      });
      const response = await request({ degreeId });
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: 'ADMISSIONS_PROGRAM_NOT_FOUND' },
      });
    },
  );

  it('reports the requested batch IDs when the canonical rows are missing', async () => {
    vi.mocked(listCataloguePrograms).mockResolvedValueOnce({ data: [], meta: {} });
    const degreeIds = ['colman_law', 'colman_business', 'unknown-program'];
    const response = await request({ degreeIds });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { reports: {}, failedDegreeIds: degreeIds },
    });
  });
});
