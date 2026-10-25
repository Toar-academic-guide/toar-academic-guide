import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { BATCH_C_PROGRAMS } from '@/server/admissions/batchCUnsupportedPathEvaluation';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';
import type { AdmissionsEvaluationResult } from '@/types/admissionsEvaluation';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '192.0.2.54' }),
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms() }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions() }),
}));
vi.mock('@/db/client', () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where: async () => [] }) }) }),
}));
import { POST } from './route';

describe('Batch C API dispatch', () => {
  beforeEach(() => resetAdmissionsEvaluationRateLimitForTests());

  it.each(Object.entries(BATCH_C_PROGRAMS))(
    '%s cannot become score eligible via API',
    async (degreeId, config) => {
      for (const scores of [
        {},
        { bagrut: 60, psychometric: 200 },
        { bagrut: 120, psychometric: 800 },
      ]) {
        const response = await POST(
          new Request('http://localhost/api/admissions/evaluate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ degreeId, ...scores }),
          }),
        );
        expect(response.status).toBe(200);
        const { data } = await response.json();
        const result = data.results.find(
          (row: AdmissionsEvaluationResult) => row.linkedInstitutionId === config.institutionId,
        );
        expect(result).toMatchObject({
          capability: 'unsupported',
          kind: 'unsupported',
          decision: 'unknown',
          explanation: config.explanationHe,
          nextAction: config.nextActionHe,
        });
        expect(result.requiredInputs).toBeUndefined();
        expect(result.scoreAssessment).toBeUndefined();
        expect(result.score).toBeUndefined();
        expect(result.threshold).toBeUndefined();
        expect(result.explanation).not.toMatch(/מתואם|סכם|מצרף|[a-zA-Z]/);
      }
    },
  );

  it('returns C alongside unchanged A numeric and B manual outcomes in one batch', async () => {
    const response = await POST(
      new Request('http://localhost/api/admissions/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          degreeIds: ['ariel_cs', 'sports_science', 'ono_cs', 'bezalel_industrial_design'],
          bagrut: 120,
          psychometric: 800,
        }),
      }),
    );
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.failedDegreeIds).toEqual([]);
    expect(data.reports.ariel_cs.results[0]).toMatchObject({
      kind: 'unsupported',
      decision: 'unknown',
    });
    expect(data.reports.sports_science.results[0]).toMatchObject({
      kind: 'unsupported',
      decision: 'unknown',
    });
    expect(data.reports.ono_cs.results[0]).toMatchObject({
      decision: 'pending',
      scoreAssessment: 'meets_threshold',
    });
    expect(data.reports.bezalel_industrial_design.results[0]).toMatchObject({
      kind: 'manual_gate',
      decision: 'eligible_to_apply',
    });
  });
});
