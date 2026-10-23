import { describe, expect, it } from 'vitest';
import { evaluateOnoPublishedRoutes } from './onoPublishedRoutesEvaluation';
import type {
  AdmissionsEvaluationInput,
  AdmissionsExtraInputs,
} from '@/types/admissionsEvaluation';
const evaluate = (
  degreeId: string,
  scores: Partial<AdmissionsEvaluationInput>,
  extraInputs: AdmissionsExtraInputs = {},
) =>
  evaluateOnoPublishedRoutes({
    institution: { id: 'ono', name: 'אונו', region: 'center' },
    input: { degreeId, ...scores, extraInputs },
  });

describe('Ono published alternatives', () => {
  it.each(['ono_cs', 'ono_business'])('%s rejects a complete weak profile', (degreeId) =>
    expect(
      evaluate(degreeId, { psychometric: 420, bagrut: 70 }, { mathUnits: 3, mathGrade: 70 })
        .decision,
    ).toBe('below'),
  );
  it.each([
    ['ono_cs', 100, 650],
    ['ono_business', 95, 600],
  ])('%s standalone boundaries remain pending', (degreeId, bagrut, psychometric) => {
    for (const scores of [{ bagrut: Number(bagrut) }, { psychometric: Number(psychometric) }])
      expect(evaluate(String(degreeId), scores)).toMatchObject({
        decision: 'pending',
        scoreAssessment: 'meets_threshold',
        additionalConditions: expect.arrayContaining([
          expect.objectContaining({ status: 'unconfirmed' }),
        ]),
      });
  });
  it.each([
    [5, 75],
    [4, 95],
  ])('CS math-only boundary %iu@%i', (mathUnits, mathGrade) => {
    expect(
      evaluate('ono_cs', { bagrut: 70, psychometric: 420 }, { mathUnits, mathGrade }),
    ).toMatchObject({ decision: 'pending', scoreLabel: 'מתמטיקה', threshold: mathGrade });
    expect(
      evaluate('ono_cs', { bagrut: 70, psychometric: 420 }, { mathUnits, mathGrade: mathGrade - 1 })
        .decision,
    ).toBe('below');
  });
  it('asks for missing math if it can independently qualify', () =>
    expect(evaluate('ono_cs', { bagrut: 70, psychometric: 420 })).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['math_units', 'math_grade'],
    }));
  it.each([
    { bagrut: 80, psychometric: 420 },
    { bagrut: 94, psychometric: 420 },
    { bagrut: 70, psychometric: 550 },
  ])('business interview bands are manual pending: %o', (scores) =>
    expect(evaluate('ono_business', scores)).toMatchObject({
      decision: 'pending',
      kind: 'manual_gate',
      additionalConditions: expect.arrayContaining([
        expect.objectContaining({ id: 'admissions_committee', status: 'unconfirmed' }),
      ]),
    }),
  );
  it('business rejects below both interview boundaries', () =>
    expect(evaluate('ono_business', { bagrut: 79.9, psychometric: 549 }).decision).toBe('below'));
  it('does not request any institutional composite', () => {
    for (const degreeId of ['ono_cs', 'ono_business'])
      expect(evaluate(degreeId, {}).requiredInputs).toEqual(
        expect.arrayContaining(['bagrut_average']),
      );
  });
});
