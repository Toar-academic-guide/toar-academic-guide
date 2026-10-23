import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '192.0.2.53' }),
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms() }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions() }),
}));
vi.mock('@/db/client', () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where: async () => [] }) }) }),
}));
import { POST } from './route';

const targets = [
  ['telhai_cs', 'telhai', { mathUnits: 5, mathGrade: 75 }],
  ['telhai_biology', 'telhai', { mathUnits: 5, mathGrade: 65, physicsUnits: 5, physicsGrade: 65 }],
  ['ono_cs', 'ono', { mathUnits: 5, mathGrade: 75 }],
  ['ono_business', 'ono', {}],
  ['ruppin_cs', 'ruppin', { mathUnits: 5, mathGrade: 70 }],
  [
    'reichman_business',
    'reichman',
    { mathUnits: 3, mathGrade: 100, englishUnits: 4, psychometricMath: 125 },
  ],
  [
    'reichman_economics',
    'reichman',
    { mathUnits: 5, mathGrade: 65, englishUnits: 4, psychometricMath: 125 },
  ],
  ['colmgmt_accounting', 'colman', {}],
  ['colmgmt_infosystems', 'colman', { mathUnits: 5, mathGrade: 70 }],
] as const;

describe('Batch A API dispatch with the real evaluator', () => {
  beforeEach(() => resetAdmissionsEvaluationRateLimitForTests());
  it.each(targets)(
    '%s weak and strong profiles dispatch to %s',
    async (degreeId, institutionId, strongExtra) => {
      for (const strong of [false, true]) {
        const response = await POST(
          new Request('http://localhost/api/admissions/evaluate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              degreeId,
              psychometric: strong ? 740 : 420,
              bagrut: strong ? 110 : 70,
              extraInputs: strong ? strongExtra : { mathUnits: 3, mathGrade: 70 },
            }),
          }),
        );
        expect(response.status).toBe(200);
        const { data } = await response.json();
        const result = data.results.find(
          (row: AdmissionsEvaluationResult) => row.linkedInstitutionId === institutionId,
        );
        expect(result).toMatchObject({
          decision: strong ? 'pending' : 'below',
          scoreAssessment: strong ? 'meets_threshold' : 'below_threshold',
        });
        expect(result.snapshot).toBeDefined();
        expect(result.requiredInputs).toBeUndefined();
        if (strong)
          expect(result.additionalConditions).toContainEqual(
            expect.objectContaining({ status: 'unconfirmed' }),
          );
      }
    },
  );
  it('asks for ordinary subjects through API, not a composite', async () => {
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ degreeId: 'telhai_cs', bagrut: 100, psychometric: 610 }),
      }),
    );
    const { data } = await response.json();
    expect(
      data.results.find((row: AdmissionsEvaluationResult) => row.linkedInstitutionId === 'telhai'),
    ).toMatchObject({ kind: 'needs_input', requiredInputs: ['math_units', 'math_grade'] });
  });
});
