import { describe, expect, it } from 'vitest';
import { evaluateTelhaiPublishedRoutes } from './telhaiPublishedRoutesEvaluation';
import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
const evaluate = (
  degreeId: string,
  psychometric: number | undefined,
  extraInputs: AdmissionsExtraInputs = {},
) =>
  evaluateTelhaiPublishedRoutes({
    institution: { id: 'telhai', name: 'תל־חי', region: 'north' },
    input: { degreeId, psychometric, bagrut: 70, extraInputs },
  });
const science = { physicsUnits: 5, physicsGrade: 65 };

describe('Tel Hai CS', () => {
  it('rejects weak scores without requesting subjects', () =>
    expect(evaluate('telhai_cs', 420).decision).toBe('below'));
  it.each([
    [610, 4, 85, 610],
    [610, 5, 75, 610],
    [585, 4, 85, 585],
    [570, 5, 75, 570],
  ])(
    'checks inclusive psych %i and math %iu@%i',
    (psychometric, mathUnits, mathGrade, threshold) => {
      const result = evaluate('telhai_cs', psychometric, { mathUnits, mathGrade });
      expect(result).toMatchObject({
        decision: 'pending',
        threshold,
        scoreAssessment: 'meets_threshold',
      });
      // Approved test update, Jorje 2026-10-25: bagrut_average condition removed (option A)
      expect(result.additionalConditions).not.toContainEqual(
        expect.objectContaining({ id: 'bagrut_average' }),
      );
      if (threshold < 610)
        expect(result.additionalConditions).toContainEqual(
          expect.objectContaining({ id: 'admissions_committee' }),
        );
    },
  );
  it.each([
    [584, 4, 85],
    [569, 5, 75],
    [610, 4, 84],
    [610, 5, 74],
    [800, 3, 100],
  ])('rejects below-route boundaries %i %i %i', (psychometric, mathUnits, mathGrade) =>
    expect(evaluate('telhai_cs', psychometric, { mathUnits, mathGrade }).decision).toBe('below'),
  );
  it('asks for math at the lower five-unit committee threshold', () =>
    expect(evaluate('telhai_cs', 570)).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['math_units', 'math_grade'],
    }));
  it('asks for the ordinary psychometric score', () =>
    expect(evaluate('telhai_cs', undefined, { mathUnits: 5, mathGrade: 75 })).toMatchObject({
      requiredInputs: ['psychometric_overall'],
    }));
});

describe('Tel Hai biology', () => {
  it('rejects weak scores even before subjects are entered', () =>
    expect(evaluate('telhai_biology', 420).decision).toBe('below'));
  it.each([
    [570, 4, 75],
    [570, 5, 65],
    [520, 4, 75],
  ])('matches psych %i math %iu@%i', (psychometric, mathUnits, mathGrade) =>
    expect(
      evaluate('telhai_biology', psychometric, { mathUnits, mathGrade, ...science }),
    ).toMatchObject({ decision: 'pending', scoreAssessment: 'meets_threshold' }),
  );
  it.each([
    ['biology', 3, 85],
    ['chemistry', 4, 75],
    ['physics', 5, 65],
  ])('accepts science boundary %s %iu@%i', (subjectId, units, grade) => {
    const extraInputs: AdmissionsExtraInputs = {
      mathUnits: 5,
      mathGrade: 65,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [{ subjectId: String(subjectId), units: Number(units), grade: Number(grade) }],
      },
    };
    expect(evaluate('telhai_biology', 570, extraInputs).decision).toBe('pending');
    extraInputs.bagrutSubjectRecord!.subjects[0].grade--;
    expect(evaluate('telhai_biology', 570, extraInputs).decision).toBe('below');
  });
  it('keeps a three-unit math route pending for summer preparation', () =>
    expect(evaluate('telhai_biology', 570, { mathUnits: 3, ...science })).toMatchObject({
      decision: 'pending',
      additionalConditions: expect.arrayContaining([
        expect.objectContaining({ id: 'math_units', status: 'unconfirmed' }),
      ]),
    }));
  it('asks for a science exam without inventing prep enrollment', () =>
    expect(evaluate('telhai_biology', 570, { mathUnits: 4, mathGrade: 75 })).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['bagrut_subject_record'],
    }));
  it('does not accept science final projects or legacy values over a complete record', () =>
    expect(
      evaluate('telhai_biology', 570, {
        mathUnits: 4,
        mathGrade: 75,
        ...science,
        bagrutSubjectRecord: {
          schemaVersion: 2,
          certificateType: 'internal',
          sector: 'jewish',
          complete: true,
          subjects: [
            { subjectId: 'mathematics', units: 4, grade: 75, assessmentKind: 'exam' },
            { subjectId: 'physics', units: 5, grade: 100, assessmentKind: 'final_project' },
          ],
        },
      }),
    ).toMatchObject({ kind: 'needs_input', requiredInputs: ['bagrut_subject_record'] }));
  it('rejects 519 and known insufficient math', () => {
    expect(
      evaluate('telhai_biology', 519, { mathUnits: 4, mathGrade: 75, ...science }).decision,
    ).toBe('below');
    expect(
      evaluate('telhai_biology', 570, { mathUnits: 4, mathGrade: 74, ...science }).decision,
    ).toBe('below');
  });
});
