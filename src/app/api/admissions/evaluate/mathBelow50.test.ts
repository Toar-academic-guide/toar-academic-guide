import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';
import { tauManagementFreshness } from '@/test/mathBelow50.fixture';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '192.0.2.45' }),
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms() }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions() }),
}));
vi.mock('@/db/client', () => ({
  getDb: () => ({
    select: () => ({ from: () => ({ where: async () => [tauManagementFreshness()] }) }),
  }),
}));

import { POST } from './route';

function request(body: object) {
  return POST(
    new Request('http://localhost/api/admissions/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('math grades below 50 through the real admissions evaluator', () => {
  beforeEach(() => {
    resetAdmissionsEvaluationRateLimitForTests();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('No external requests')));
  });

  it('returns reports for a batch including a published math minimum and open admission', async () => {
    const degreeIds = ['tau_business', 'open_university_cs', 'tlvyaffo_business'];
    const response = await request({
      degreeIds,
      psychometric: 640,
      bagrut: 100,
      extraInputs: { mathUnits: 4, mathGrade: 45 },
    });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.failedDegreeIds).toEqual([]);
    expect(Object.keys(data.reports).sort()).toEqual([...degreeIds].sort());
    for (const degreeId of degreeIds) {
      expect(data.reports[degreeId].input.extraInputs.mathGrade).toBe(45);
      expect(data.reports[degreeId].results.length).toBeGreaterThan(0);
    }
    expect(data.reports.open_university_cs.results[0]).toMatchObject({
      kind: 'open_admission',
      decision: 'accepted',
    });
    // TAU also allows a quantitative-score alternative; unknown input stays unknown.
    expect(data.reports.tau_business.results[0]).toMatchObject({
      kind: 'needs_input',
      requiredInputs: expect.arrayContaining(['psychometric_math']),
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns a single-degree report for math grade zero', async () => {
    const response = await request({
      degreeId: 'open_university_cs',
      psychometric: 640,
      bagrut: 100,
      extraInputs: { mathUnits: 4, mathGrade: 0 },
    });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.input.extraInputs.mathGrade).toBe(0);
    expect(data.results[0].decision).toBe('accepted');
  });

  it.each([101, 45.5])('still returns 400 for invalid math grade %s', async (mathGrade) => {
    const response = await request({
      degreeId: 'tau_business',
      psychometric: 640,
      bagrut: 100,
      extraInputs: { mathUnits: 4, mathGrade },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: 'ADMISSIONS_EVALUATION_PAYLOAD_INVALID' },
    });
  });
});
