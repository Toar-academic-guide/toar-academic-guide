import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { resetAdmissionsEvaluationRateLimitForTests } from '@/server/admissions/rateLimit';
import { evaluateAfekaPublishedRoutes } from '@/server/admissions/afekaPublishedRoutesEvaluation';
import { evaluateReichmanPublishedRoutes } from '@/server/admissions/reichmanPublishedRoutesEvaluation';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '192.0.2.46' }),
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: async () => ({ data: getStaticCataloguePrograms() }),
  listCatalogueInstitutions: async () => ({ data: getStaticCatalogueInstitutions() }),
}));
vi.mock('@/db/client', () => ({
  getDb: () => ({ select: () => ({ from: () => ({ where: async () => [] }) }) }),
}));

import { POST } from './route';

const cases = [
  {
    field: 'englishGrade',
    degreeId: 'reichman_psychology',
    institutionId: 'reichman',
    // Psychology requires English 4 units at 90 in every ordinary route.
    passingGrade: 90,
    passingDecision: 'pending',
    kind: 'estimated',
    extraInputs: { mathUnits: 3, mathGrade: 85, englishUnits: 4 },
  },
  {
    field: 'physicsGrade',
    degreeId: 'afeka_ee',
    institutionId: 'afeka',
    // Engineering requires physics 5 units at 60 in both checked routes.
    passingGrade: 60,
    passingDecision: 'accepted',
    kind: 'exact',
    extraInputs: {
      mathUnits: 5,
      mathGrade: 75,
      englishUnits: 5,
      englishGrade: 60,
      physicsUnits: 5,
      psychometricMath: 115,
    },
  },
  {
    field: 'csGrade',
    degreeId: 'afeka_cs',
    institutionId: 'afeka',
    // Isolate the 5-unit CS >= 60 alternative: other routes miss their floors.
    passingGrade: 60,
    passingDecision: 'accepted',
    kind: 'exact',
    extraInputs: {
      mathUnits: 5,
      mathGrade: 75,
      englishUnits: 5,
      englishGrade: 60,
      physicsUnits: 4,
      physicsGrade: 60,
      csUnits: 5,
      psychometricMath: 100,
    },
  },
] as const;

function request(body: object) {
  return POST(
    new Request('http://localhost/api/admissions/evaluate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  resetAdmissionsEvaluationRateLimitForTests();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('No external requests')));
});
afterEach(() => vi.unstubAllGlobals());

describe.each(cases)('$field below 50', (testCase) => {
  const applicant = (grade: number) => ({
    psychometric: 640,
    bagrut: 100,
    extraInputs: { ...testCase.extraInputs, [testCase.field]: grade },
  });

  it('uses the existing below-minimum decision without inventing score or threshold', () => {
    const institution = getStaticCatalogueInstitutions().find(
      (row) => row.id === testCase.institutionId,
    )!;
    const evaluate = (grade: number) => {
      const args = {
        institution,
        input: { degreeId: testCase.degreeId, ...applicant(grade) },
      };
      return testCase.institutionId === 'reichman'
        ? evaluateReichmanPublishedRoutes(args)
        : evaluateAfekaPublishedRoutes(args);
    };
    const low = evaluate(45);
    expect(low).toMatchObject({
      kind: testCase.kind,
      decision: 'below',
      scoreAssessment: 'below_threshold',
    });
    expect(low.score).toBeUndefined();
    expect(low.threshold).toBeUndefined();
    // Changing only this subject to its existing minimum clears the route.
    expect(evaluate(testCase.passingGrade).decision).toBe(testCase.passingDecision);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns HTTP 200 with honest reports for the subject-minimum and open-admission programmes', async () => {
    const degreeIds = [testCase.degreeId, 'open_university_cs'];
    const response = await request({ degreeIds, ...applicant(45) });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.failedDegreeIds).toEqual([]);
    expect(Object.keys(data.reports).sort()).toEqual([...degreeIds].sort());
    const report = data.reports[testCase.degreeId];
    expect(report.input.extraInputs[testCase.field]).toBe(45);
    expect(report.results).toContainEqual(
      expect.objectContaining({
        linkedInstitutionId: testCase.institutionId,
        kind: testCase.kind,
        decision: 'below',
        scoreAssessment: 'below_threshold',
      }),
    );
    for (const result of report.results) {
      expect(result.score).toBeUndefined();
      expect(result.threshold).toBeUndefined();
    }
    expect(data.reports.open_university_cs.results[0]).toMatchObject({
      kind: 'open_admission',
      decision: 'accepted',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([-1, 101, 45.5])('still returns HTTP 400 for invalid grade %s', async (grade) => {
    const extraInputs: AdmissionsExtraInputs = applicant(grade).extraInputs;
    const response = await request({
      degreeId: testCase.degreeId,
      psychometric: 640,
      bagrut: 100,
      extraInputs,
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: 'ADMISSIONS_EVALUATION_PAYLOAD_INVALID' },
    });
  });
});
