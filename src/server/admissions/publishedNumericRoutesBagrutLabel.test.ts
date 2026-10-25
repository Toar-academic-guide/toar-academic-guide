import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';

vi.mock('server-only', () => ({}));
vi.mock('@/db/client', () => ({
  getDb: () => {
    throw new Error('Database access is forbidden in this static-catalogue test');
  },
}));

const strongProfile: Omit<AdmissionsEvaluationInput, 'degreeId'> = {
  bagrut: 112,
  psychometric: 740,
  extraInputs: {
    mathUnits: 5,
    mathGrade: 95,
    englishUnits: 5,
    englishGrade: 95,
    physicsUnits: 5,
    physicsGrade: 90,
    bagrutSubjectRecord: {
      schemaVersion: 1,
      sector: 'jewish',
      subjects: [
        { subjectId: 'english', units: 5, grade: 95 },
        { subjectId: 'literature', units: 2, grade: 90 },
        { subjectId: 'mathematics', units: 5, grade: 95 },
        { subjectId: 'bible', units: 2, grade: 89 },
        { subjectId: 'civics', units: 2, grade: 89 },
        { subjectId: 'hebrew_expression', units: 2, grade: 89 },
        { subjectId: 'history', units: 2, grade: 89 },
        { subjectId: 'hebrew', units: 2, grade: 89 },
        { subjectId: 'physics', units: 5, grade: 90 },
      ],
    },
  },
};

describe('published numeric route bagrut label through the evaluator', () => {
  it.each(['ruppin_cs', 'ruppin_marine_bio'])(
    '%s labels the bagrut condition as eligibility',
    async (degreeId) => {
      const program = getStaticCataloguePrograms().find((row) => row.id === degreeId);
      expect(program).toBeDefined();

      const report = await evaluateAdmissionsForProgram({
        program: program!,
        institutions: getStaticCatalogueInstitutions(),
        input: { degreeId, ...strongProfile },
        freshnessStatesBySourceId: new Map(),
        fetcher: async () => {
          throw new Error('Network access is forbidden in this static-catalogue test');
        },
      });
      const result = report.results.find((row) => row.linkedInstitutionId === 'ruppin');

      expect(result).toMatchObject({ decision: 'pending', score: 112, threshold: 100 });
      expect(result?.additionalConditions?.[0]).toEqual({
        id: 'bagrut_average',
        label: 'זכאות לבגרות',
        status: 'unconfirmed',
      });
      const bagrutConditions = report.results
        .flatMap((row) => row.additionalConditions ?? [])
        .filter((condition) => condition.id === 'bagrut_average');
      expect(bagrutConditions.map((condition) => condition.label)).not.toContain(
        'עמידה בדרישות השפה',
      );
    },
  );
});
