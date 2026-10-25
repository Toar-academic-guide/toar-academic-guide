import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import { evaluatePublishedNumericRoutes } from './publishedNumericRoutes';
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

describe('published numeric route bagrut condition through the evaluator', () => {
  it.each(['ruppin_cs', 'ruppin_marine_bio'])(
    '%s meets the threshold without an assumed-bagrut condition',
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

      expect(result).toMatchObject({
        kind: 'estimated',
        decision: 'pending',
        score: 112,
        threshold: 100,
        scoreLabel: 'ממוצע בגרות',
        scoreAssessment: 'meets_threshold',
      });
      expect(result?.additionalConditions).not.toContainEqual(
        expect.objectContaining({ id: 'bagrut_average' }),
      );
      expect(result?.additionalConditions).toEqual([]);
    },
  );

  it('passes through route conditions without adding an assumed-bagrut condition', () => {
    const conditions = [
      { id: 'admissions_committee' as const, label: 'ראיון אישי', status: 'unconfirmed' as const },
    ];
    const result = evaluatePublishedNumericRoutes({
      institution: getStaticCatalogueInstitutions().find((row) => row.id === 'ruppin')!,
      routes: [
        {
          below: false,
          missing: [],
          label: 'ממוצע בגרות',
          score: 112,
          threshold: 100,
          requirements: 'ממוצע בגרות 100 לפחות',
          conditions,
        },
      ],
      officialUrls: [],
    });

    expect(result.additionalConditions).not.toContainEqual(
      expect.objectContaining({ id: 'bagrut_average' }),
    );
    expect(result.additionalConditions).toEqual(conditions);
  });
});
