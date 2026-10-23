import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '192.0.2.99' }),
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms() }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions() }),
}));
vi.mock('@/db/client', () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where: async () => [] }) }) }),
}));
import { POST } from './route';

const degrees = [
  'telhai_cs',
  'telhai_biology',
  'ono_cs',
  'ono_business',
  'ruppin_cs',
  'reichman_business',
  'reichman_economics',
  'colmgmt_accounting',
  'colmgmt_infosystems',
  'tlvyaffo_cs',
  'mta_cs',
] as const;

describe('Batch A never asks for composites', () => {
  beforeEach(() => resetAdmissionsEvaluationRateLimitForTests());
  it.each(degrees)('%s requiredInputs stay ordinary', async (degreeId) => {
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ degreeId }),
      }),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    for (const row of data.results) {
      for (const input of row.requiredInputs ?? []) {
        expect(String(input)).not.toMatch(/מתואם|סכם|מצרף|coordinated|combined_score|ציון_קבלה/i);
      }
      // Auto-computed notice is fine; solicitation is not.
      expect(`${row.explanation ?? ''}`).not.toMatch(/הזינו את (הציון )?(המתואם|הסכם|המצרף)/);
    }
  });
});
