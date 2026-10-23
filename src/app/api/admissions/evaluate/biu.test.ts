import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BIU_PUBLISHED_ROUTE_PROGRAM_IDS } from '@/data/admissions/biuPublishedRoutes';
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

async function evaluate(degreeId: string, scores: Record<string, unknown>) {
  const response = await POST(
    new Request('http://localhost/api/admissions/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ degreeId, ...scores }),
    }),
  );
  expect(response.status).toBe(200);
  const { data } = await response.json();
  return data.results.find(
    (result: { linkedInstitutionId: string }) => result.linkedInstitutionId === 'biu',
  );
}

describe('BIU API with real evaluator', () => {
  beforeEach(() => resetAdmissionsEvaluationRateLimitForTests());
  it.each(BIU_PUBLISHED_ROUTE_PROGRAM_IDS)(
    '%s checks published routes without composite prompts',
    async (degreeId) => {
      const bagrut =
        degreeId.includes('law') || degreeId === 'biu_computational_bio'
          ? 112
          : degreeId.includes('criminology')
            ? 98
            : 108;
      const extraInputs = {
        mathUnits: 5,
        mathGrade: 95,
        englishUnits: 5,
        englishGrade: 90,
        physicsUnits: 5,
        physicsGrade: 80,
        psychometricEnglish: 85,
      };
      const boundary = await evaluate(degreeId, { bagrut, extraInputs });
      expect(boundary).toMatchObject({
        decision: 'pending',
        kind: 'estimated',
        scoreAssessment: 'meets_threshold',
        score: bagrut,
        threshold: bagrut,
      });
      expect(boundary.requiredInputs).toBeUndefined();
      expect(boundary.explanation).not.toMatch(/סכם|מתואם|מצרף/);
      const weak = await evaluate(degreeId, { bagrut: 70, psychometric: 420 });
      expect(weak).toMatchObject({ decision: 'below', scoreAssessment: 'below_threshold' });
      const missing = await evaluate(degreeId, {});
      expect(missing).toMatchObject({ kind: 'needs_input', decision: 'unknown' });
      expect(missing.requiredInputs).toContain('bagrut_average');
      expect(missing.requiredInputs).not.toContain('institution_weighted_score');
    },
  );

  it('requests missing subject grades at the law boundary', async () => {
    expect(
      await evaluate('biu_law', { bagrut: 112, extraInputs: { psychometricEnglish: 85 } }),
    ).toMatchObject({ kind: 'needs_input', requiredInputs: ['english_units', 'english_grade'] });
  });

  it.each([
    'biu_cs',
    'biu_psychology',
    'biu_ee',
    'biu_medicine',
    'biu_socialwork',
    'biu_optometry',
  ])('%s stays deferred rather than gaining invented eligibility', async (degreeId) => {
    const result = await evaluate(degreeId, { bagrut: 120, psychometric: 800 });
    expect(['pending', 'unknown']).toContain(result.decision);
    expect(result.score).toBeUndefined();
    expect(result.scoreAssessment).toBeUndefined();
  });
});
