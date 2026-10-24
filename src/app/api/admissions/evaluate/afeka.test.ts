import { AFEKA_EVALUATOR_IDS, afekaCases } from '@/test/afekaAdmissions';
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

describe.each(AFEKA_EVALUATOR_IDS)('%s API serialization with real evaluator', (degreeId) => {
  beforeEach(() => resetAdmissionsEvaluationRateLimitForTests());
  it.each(afekaCases(degreeId))('$name', async ({ input, decision, missing }) => {
    const data = await evaluate({ degreeId, ...input });
    const result = data.results.find(
      (row: { linkedInstitutionId: string }) => row.linkedInstitutionId === 'afeka',
    );
    expect(result).toMatchObject({
      decision,
      kind: decision === 'unknown' ? 'needs_input' : 'exact',
    });
    expect(result.requiredInputs).toEqual(missing);
    expect(result).not.toHaveProperty('score');
    expect(result).not.toHaveProperty('threshold');
    expect(result.snapshot.inputDigest).toBe(data.inputDigest);
    expect(result.explanation).not.toMatch(/550|מתואם|סכם|undefined/);
    if (missing?.includes('psychometric_math')) expect(result.explanation).toContain('ציון כמותי');
    if (missing?.includes('physics_grade')) expect(result.explanation).toContain('ציון בפיזיקה');
  });
});

it('serializes all three IDs in one batch', async () => {
  resetAdmissionsEvaluationRateLimitForTests();
  const data = await evaluate({
    degreeIds: AFEKA_EVALUATOR_IDS,
    extraInputs: {
      mathUnits: 5,
      mathGrade: 75,
      englishUnits: 5,
      englishGrade: 60,
      physicsUnits: 5,
      physicsGrade: 60,
    },
  });
  expect(data.failedDegreeIds).toEqual([]);
  for (const id of AFEKA_EVALUATOR_IDS)
    expect(
      data.reports[id].results.find(
        (row: { linkedInstitutionId: string }) => row.linkedInstitutionId === 'afeka',
      ),
    ).toMatchObject({ decision: 'accepted' });
});
