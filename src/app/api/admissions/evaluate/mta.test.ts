import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '192.0.2.43' }),
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms() }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions() }),
}));
vi.mock('@/db/client', () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where: async () => [] }) }) }),
}));

import { POST } from './route';

async function evaluate(body: object) {
  const response = await POST(
    new Request('http://localhost/api/admissions/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  expect(response.status).toBe(200);
  return (await response.json()).data;
}

describe('MTA API with real admissions evaluator', () => {
  beforeEach(() => resetAdmissionsEvaluationRateLimitForTests());

  it('dispatches both named IDs for weak and strong profiles in the batch endpoint', async () => {
    for (const [bagrut, psychometric, decision] of [
      [70, 420, 'below'],
      [96, 550, 'pending'],
    ] as const) {
      const data = await evaluate({
        degreeIds: ['tlvyaffo_nursing', 'tlvyaffo_business'],
        bagrut,
        psychometric,
        extraInputs: { mathUnits: 4, mathGrade: 80, psychometricEnglish: 85 },
      });
      expect(data.failedDegreeIds).toEqual([]);
      for (const id of ['tlvyaffo_nursing', 'tlvyaffo_business']) {
        expect(
          data.reports[id].results.find(
            (r: { linkedInstitutionId: string }) => r.linkedInstitutionId === 'mta',
          ),
        ).toMatchObject({
          decision,
          kind: 'manual_gate',
          scoreAssessment: decision === 'below' ? 'below_threshold' : 'meets_threshold',
        });
      }
    }
  });

  it('requests only mathematics when English and numeric scores are already supplied', async () => {
    const data = await evaluate({
      degreeId: 'tlvyaffo_business',
      bagrut: 96,
      psychometric: 550,
      extraInputs: { psychometricEnglish: 85 },
    });
    expect(
      data.results.find((r: { linkedInstitutionId: string }) => r.linkedInstitutionId === 'mta'),
    ).toMatchObject({ kind: 'needs_input', requiredInputs: ['math_units', 'math_grade'] });
  });

  it.each([
    { degreeId: 'tlvyaffo_business', bagrut: 96 },
    { degreeId: 'tlvyaffo_business', psychometric: 580 },
    { degreeId: 'tlvyaffo_nursing', psychometric: 520 },
  ])('supports a route without an unnecessary base score: %j', async (scores) => {
    const data = await evaluate({
      ...scores,
      extraInputs: { mathUnits: 5, mathGrade: 55, psychometricEnglish: 85 },
    });
    const result = data.results.find(
      (r: { linkedInstitutionId: string }) => r.linkedInstitutionId === 'mta',
    );
    expect(result).toMatchObject({ decision: 'pending', scoreAssessment: 'meets_threshold' });
    expect(result.requiredInputs).toBeUndefined();
  });
});
