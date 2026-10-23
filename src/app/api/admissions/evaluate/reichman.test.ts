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
