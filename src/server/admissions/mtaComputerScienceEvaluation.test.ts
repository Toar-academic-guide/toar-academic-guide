import { describe, expect, it } from 'vitest';
import { evaluateMtaComputerScience } from './mtaComputerScienceEvaluation';
import type {
  AdmissionsEvaluationInput,
  AdmissionsExtraInputs,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

const institution: CatalogueInstitution = {
  id: 'mta',
  name: 'האקדמית תל־אביב–יפו',
  region: 'center',
};
function evaluate(
  scores: Partial<AdmissionsEvaluationInput> = {},
  extra: Partial<AdmissionsExtraInputs> = {},
) {
  return evaluateMtaComputerScience({
    institution,
    input: {
      degreeId: 'tlvyaffo_cs',
      bagrut: 96,
      psychometric: 600,
      ...scores,
      extraInputs: { mathUnits: 5, mathGrade: 70, psychometricEnglish: 100, ...extra },
    },
  });
}

describe('MTA CS official routes', () => {
  it('matches the combined 630 boundary as an estimate with separate institutional confirmation', () => {
    expect(evaluate()).toMatchObject({
      score: 630,
      threshold: 630,
      decision: 'pending',
      scoreAssessment: 'meets_threshold',
      scoreLabel: 'ציון משולב משוער — מסלול אוטומטי',
    });
    expect(evaluate().additionalConditions).toContainEqual(
      expect.objectContaining({ id: 'bagrut_average', status: 'unconfirmed' }),
    );
  });
  it.each([
    [619, 630, 'meets_threshold'],
    [618, 629, 'below_threshold'],
  ] as const)(
    'rounds psychometric %s at the combined boundary',
    (psychometric, score, scoreAssessment) => {
      expect(evaluate({ bagrut: 94, psychometric })).toMatchObject({ score, scoreAssessment });
    },
  );
  it.each([{ bagrut: 60 }, { bagrut: 130 }, { psychometric: 200 }])(
    'does not calculate a combined score outside the official domain: %j',
    (scores) => {
      const result = evaluate(scores);
      expect(result.scoreLabel).not.toContain('ציון משולב');
    },
  );
  it('checks psychometric 670 without using an absent Bagrut average as proof of eligibility', () => {
    expect(evaluate({ bagrut: undefined, psychometric: 670 })).toMatchObject({
      score: 670,
      threshold: 670,
      decision: 'pending',
      scoreAssessment: 'meets_threshold',
    });
  });
  it.each([
    [5, 80],
    [4, 95],
  ])(
    'matches Bagrut 102 with %s units and grade %s without psychometric',
    (mathUnits, mathGrade) => {
      expect(
        evaluate({ bagrut: 102, psychometric: undefined }, { mathUnits, mathGrade }),
      ).toMatchObject({
        score: 102,
        threshold: 102,
        decision: 'pending',
        scoreAssessment: 'meets_threshold',
      });
    },
  );
  it.each([
    [5, 69],
    [4, 89],
  ])('blocks the automatic route when general math fails (%s/%s)', (mathUnits, mathGrade) => {
    const result = evaluate({ bagrut: 90, psychometric: 800 }, { mathUnits, mathGrade });
    expect(result.decision).toBe('below');
    expect(result.explanation).toContain('דרישת המתמטיקה למסלול האוטומטי אינה מתקיימת');
  });
  it('keeps English below 100 separate from a met numeric route', () => {
    const result = evaluate({}, { psychometricEnglish: 99 });
    expect(result).toMatchObject({ decision: 'below', scoreAssessment: 'meets_threshold' });
    expect(result.additionalConditions).toContainEqual(
      expect.objectContaining({ id: 'psychometric_english', status: 'unmet' }),
    );
  });
  it.each([
    [100, undefined, 4, 80, 100],
    [100, undefined, 5, 60, 100],
    [95, 550, 4, 80, 95],
    [95, 550, 5, 60, 95],
  ] as const)(
    'labels reinforced route %s/%s/%s/%s separately',
    (bagrut, psychometric, mathUnits, mathGrade, threshold) => {
      const result = evaluate({ bagrut, psychometric }, { mathUnits, mathGrade });
      expect(result).toMatchObject({
        decision: 'pending',
        score: bagrut,
        threshold,
        scoreAssessment: 'meets_threshold',
        scoreLabel: 'ממוצע בגרות משוער — מסלול מתוגבר',
      });
      expect(result.explanation).toContain('למסלול המתוגבר בלבד');
    },
  );
  it('reports below every alternative and directs to counselling and preparatory study', () => {
    const result = evaluate({ bagrut: 60, psychometric: 400 });
    expect(result.decision).toBe('below');
    expect(result.explanation).toContain('לא מתקיימת אף חלופה');
    expect(result.nextAction).toContain('מרכז ייעוץ ורישום');
    expect(result.nextAction).toContain('מכינה שמחליפה את הפסיכומטרי');
  });
  it.each([
    [{ mathUnits: undefined }, 'math_units'],
    [{ mathGrade: undefined }, 'math_grade'],
    [{ psychometricEnglish: undefined }, 'psychometric_english'],
  ] as const)('asks for missing math or English: %j', (extra, key) => {
    expect(evaluate({}, extra)).toMatchObject({
      decision: 'unknown',
      kind: 'needs_input',
      requiredInputs: [key],
    });
  });
  it('uses recorded math rather than conflicting loose values', () => {
    expect(
      evaluate(
        { bagrut: 90, psychometric: 800 },
        {
          bagrutSubjectRecord: {
            schemaVersion: 1,
            sector: 'jewish',
            subjects: [{ subjectId: 'mathematics', units: 3, grade: 100 }],
          },
        },
      ).decision,
    ).toBe('below');
  });
  it('never imports the institution-level interview', () => {
    for (const result of [
      evaluate(),
      evaluate({ bagrut: 60, psychometric: 400 }),
      evaluate({}, { mathGrade: undefined }),
    ])
      expect(JSON.stringify(result)).not.toContain('ראיון');
  });
});
