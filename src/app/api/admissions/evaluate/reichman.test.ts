import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '192.0.2.42' }),
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms() }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions() }),
}));
vi.mock('@/db/client', () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where: async () => [] }) }) }),
}));

import { POST } from './route';

describe('Reichman API with real admissions evaluator', () => {
  beforeEach(() => resetAdmissionsEvaluationRateLimitForTests());
  it.each(['reichman_cs', 'reichman_law', 'reichman_psychology'])(
    '%s rejects weak scores and calculates strong scores without a coordinated field',
    async (degreeId) => {
      for (const [psychometric, bagrut, decision] of [
        [420, 70, 'below'],
        [740, 110, 'pending'],
      ] as const) {
        const response = await POST(
          new Request('http://localhost/api/admissions/evaluate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              degreeId,
              psychometric,
              bagrut,
              extraInputs: { mathUnits: 5, mathGrade: 90, englishUnits: 5, englishGrade: 95 },
            }),
          }),
        );
        expect(response.status).toBe(200);
        const { data } = await response.json();
        const result = data.results.find(
          (entry: { linkedInstitutionId: string }) => entry.linkedInstitutionId === 'reichman',
        );
        expect(result).toMatchObject({
          decision,
          kind: 'estimated',
          scoreAssessment: decision === 'below' ? 'below_threshold' : 'meets_threshold',
        });
        expect(result.requiredInputs).toBeUndefined();
      }
    },
  );
});

it.each([
  'reichman_cs',
  'reichman_law',
  'reichman_business',
  'reichman_economics',
  'reichman_psychology',
])('%s preserves the estimated source label through API serialization', async (degreeId) => {
  resetAdmissionsEvaluationRateLimitForTests();
  const response = await POST(
    new Request('http://localhost/api/admissions/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        degreeId,
        psychometric: 740,
        bagrut: 110,
        extraInputs: {
          mathUnits: 5,
          mathGrade: 90,
          englishUnits: 5,
          englishGrade: 95,
          psychometricMath: 125,
        },
      }),
    }),
  );
  expect(response.status).toBe(200);
  const { data } = await response.json();
  expect(
    data.results.find(
      (row: { linkedInstitutionId: string }) => row.linkedInstitutionId === 'reichman',
    ),
  ).toMatchObject({
    kind: 'estimated',
    confidence: 'medium',
    sourceLabel: 'הערכה לפי הציונים',
    decision: 'pending',
    scoreAssessment: 'meets_threshold',
  });
});
