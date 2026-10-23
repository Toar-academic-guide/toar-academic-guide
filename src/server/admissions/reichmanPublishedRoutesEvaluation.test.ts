import { describe, expect, it } from 'vitest';
import { evaluateReichmanPublishedRoutes } from './reichmanPublishedRoutesEvaluation';
import { calculateReichmanCoordinatedScore, calculateSekhem } from '@/utils/sekhemCalculators';
import type {
  AdmissionsEvaluationInput,
  AdmissionsExtraInputs,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';
import type { University } from '@/types';
import type { Program } from '@/data/degrees/types';

const institution: CatalogueInstitution = {
  id: 'reichman',
  name: 'אוניברסיטת רייכמן',
  region: 'center',
};
const evaluate = (
  degreeId: string,
  scores: Partial<AdmissionsEvaluationInput>,
  extraInputs: AdmissionsExtraInputs = {},
) => evaluateReichmanPublishedRoutes({ institution, input: { degreeId, ...scores, extraInputs } });
const math = { mathUnits: 5, mathGrade: 85 };
const psychology = { mathUnits: 3, mathGrade: 85, englishUnits: 4, englishGrade: 90 };

for (const [degreeId, bagrut, psychometric, coordinatedPsy, extra] of [
  ['reichman_cs', 108, 720, 700, math],
  ['reichman_law', 100, 700, 660, {}],
  ['reichman_psychology', 100, 640, 600, psychology],
] as const) {
  describe(degreeId, () => {
    it('rejects weak profiles even when subject inputs are missing', () => {
      expect(evaluate(degreeId, { bagrut: 70, psychometric: 420 })).toMatchObject({
        decision: 'below',
        kind: 'estimated',
        scoreAssessment: 'below_threshold',
      });
    });
    it('matches a coordinated route from ordinary profile scores', () => {
      expect(
        evaluate(degreeId, { bagrut: bagrut - 1, psychometric: coordinatedPsy }, extra),
      ).toMatchObject({
        decision: 'pending',
        kind: 'estimated',
        capability: 'estimated',
        scoreAssessment: 'meets_threshold',
        scoreLabel: 'ציון מתואם',
        additionalConditions: [{ id: 'reichman_application_requirements', status: 'unconfirmed' }],
      });
    });
    it('matches the inclusive Bagrut boundary without any psychometric input', () => {
      const result = evaluate(
        degreeId,
        { bagrut },
        { ...extra, physicsUnits: 5, physicsGrade: 85 },
      );
      expect(result).toMatchObject({
        decision: 'pending',
        scoreAssessment: 'meets_threshold',
        scoreLabel: 'מסלול בגרות',
        score: bagrut,
        threshold: bagrut,
      });
      expect(result.requiredInputs).toBeUndefined();
    });
    it('matches the inclusive psychometric boundary without an average', () => {
      expect(evaluate(degreeId, { psychometric }, extra)).toMatchObject({
        decision: 'pending',
        scoreAssessment: 'meets_threshold',
        scoreLabel: 'מסלול פסיכומטרי',
        threshold: psychometric,
      });
    });
    it('returns below just under both standalone thresholds when the coordinated route is also below', () => {
      expect(
        evaluate(degreeId, { bagrut: 70, psychometric: psychometric - 1 }, extra).decision,
      ).toBe('below');
    });
    it('requests a missing score rather than a precomputed coordinated score', () => {
      const result = evaluate(degreeId, { bagrut: 70 }, extra);
      expect(result).toMatchObject({
        kind: 'needs_input',
        decision: 'unknown',
        requiredInputs: ['psychometric_overall'],
      });
    });
  });
}

describe('Reichman subject gates', () => {
  it('requests missing CS math units and grade for a numerically passing route', () => {
    expect(evaluate('reichman_cs', { psychometric: 720 })).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['math_units', 'math_grade'],
    });
  });
  it('accepts CS psychometric math at 80 and rejects 79', () => {
    expect(
      evaluate('reichman_cs', { bagrut: 70, psychometric: 720 }, { mathUnits: 5, mathGrade: 80 })
        .decision,
    ).toBe('pending');
    expect(
      evaluate('reichman_cs', { bagrut: 70, psychometric: 720 }, { mathUnits: 5, mathGrade: 79 })
        .decision,
    ).toBe('below');
  });
  it('asks for science only when the Bagrut route needs it', () => {
    expect(evaluate('reichman_cs', { bagrut: 108 }, math)).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['bagrut_subject_record'],
    });
    expect(evaluate('reichman_cs', { bagrut: 107, psychometric: 700 }, math)).toMatchObject({
      decision: 'pending',
      scoreLabel: 'ציון מתואם',
    });
  });
  it.each(['physics', 'chemistry', 'biology', 'computer_science'])(
    'accepts the published science alternative %s from an exam record',
    (subjectId) => {
      expect(
        evaluate(
          'reichman_cs',
          { bagrut: 108 },
          {
            ...math,
            bagrutSubjectRecord: {
              schemaVersion: 1,
              sector: 'jewish',
              subjects: [{ subjectId, units: 5, grade: 85 }],
            },
          },
        ).decision,
      ).toBe('pending');
    },
  );
  it('does not count final projects or systems design as a qualifying science', () => {
    for (const subject of [
      {
        subjectId: 'computer_science',
        units: 5,
        grade: 100,
        assessmentKind: 'final_project' as const,
      },
      { subjectId: 'systems_design', units: 5, grade: 100, assessmentKind: 'exam' as const },
      { subjectId: 'physics', units: 5, grade: 84, assessmentKind: 'exam' as const },
    ])
      expect(
        evaluate(
          'reichman_cs',
          { bagrut: 108, psychometric: 420 },
          {
            ...math,
            csUnits: 5,
            csGrade: 100,
            bagrutSubjectRecord: {
              schemaVersion: 2,
              sector: 'jewish',
              certificateType: 'internal',
              complete: true,
              subjects: [subject],
            },
          },
        ).decision,
      ).not.toBe('pending');
  });
  it('enforces the coordinated minimum psychometric even when its score clears 705', () => {
    expect(
      evaluate(
        'reichman_cs',
        { bagrut: 120, psychometric: 659 },
        {
          ...math,
          bagrutSubjectRecord: {
            schemaVersion: 2,
            sector: 'jewish',
            certificateType: 'internal',
            complete: true,
            subjects: [],
          },
        },
      ),
    ).toMatchObject({ decision: 'below' });
  });
  it('uses recorded math rather than a contradictory legacy grade', () => {
    expect(
      evaluate(
        'reichman_cs',
        { bagrut: 70, psychometric: 720 },
        {
          ...math,
          bagrutSubjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [{ subjectId: 'mathematics', units: 4, grade: 100 }],
          },
        },
      ).decision,
    ).toBe('below');
  });
  it('does not substitute legacy math for a recorded final project', () => {
    expect(
      evaluate(
        'reichman_cs',
        { bagrut: 70, psychometric: 720 },
        {
          ...math,
          bagrutSubjectRecord: {
            schemaVersion: 2,
            sector: 'jewish',
            certificateType: 'internal',
            complete: false,
            subjects: [
              { subjectId: 'mathematics', units: 5, grade: 100, assessmentKind: 'final_project' },
            ],
          },
        },
      ),
    ).toMatchObject({ kind: 'needs_input', requiredInputs: ['math_units', 'math_grade'] });
  });
  it('requires psychology math and English rather than inventing grades', () => {
    expect(evaluate('reichman_psychology', { psychometric: 640 })).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['math_units', 'math_grade', 'english_units', 'english_grade'],
    });
    expect(
      evaluate(
        'reichman_psychology',
        { psychometric: 640, bagrut: 70 },
        { ...psychology, englishGrade: 89 },
      ).decision,
    ).toBe('below');
    expect(
      evaluate(
        'reichman_psychology',
        { psychometric: 640, bagrut: 70 },
        { ...psychology, mathGrade: 84 },
      ).decision,
    ).toBe('below');
  });
});

describe('Reichman shared formula', () => {
  it.each([
    [70, 420, 389.152],
    [100, 650, 651.525],
    [110, 700, 725.3],
  ])(
    'calculates Bagrut %s / psychometric %s without rounding before comparison',
    (bagrut, psychometric, expected) => {
      expect(calculateReichmanCoordinatedScore(bagrut, psychometric)).toBeCloseTo(expected, 8);
      expect(
        calculateSekhem({ id: 'reichman' } as University, { bagrut, psychometric }, {} as Program, {
          hasMath5: false,
          hasPhysics5: false,
        }),
      ).toBeCloseTo(expected, 8);
    },
  );
});
