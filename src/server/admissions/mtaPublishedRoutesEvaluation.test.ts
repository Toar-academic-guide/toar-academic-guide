import { describe, expect, it } from 'vitest';
import { evaluateMtaPublishedRoutes } from './mtaPublishedRoutesEvaluation';
import { mtaCombinedScore } from './mtaCombinedScore';
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
  degreeId = 'tlvyaffo_business',
  scores: Partial<AdmissionsEvaluationInput> = {},
  extra: Partial<AdmissionsExtraInputs> = {},
) {
  return evaluateMtaPublishedRoutes({
    institution,
    input: {
      degreeId,
      bagrut: 70,
      psychometric: 420,
      ...scores,
      extraInputs: { mathUnits: 4, mathGrade: 80, psychometricEnglish: 85, ...extra },
    },
  });
}

describe('MTA published nursing and economics-management routes', () => {
  it.each(['tlvyaffo_nursing', 'tlvyaffo_business'])(
    '%s is below every modeled numeric route at 70/420, even without subject inputs',
    (degreeId) => {
      const result = evaluate(
        degreeId,
        {},
        {
          mathUnits: undefined,
          mathGrade: undefined,
          psychometricEnglish: undefined,
        },
      );
      expect(result).toMatchObject({ decision: 'below', scoreAssessment: 'below_threshold' });
      expect(result.requiredInputs).toBeUndefined();
      expect(result.explanation).not.toMatch(/72|440|450|ביולוגיה/);
    },
  );

  it.each([
    [90, 520, 'מסלול אוטומטי'],
    [90, 500, 'ועדת קבלה'],
    [89, 520, 'פסיכומטרי — ועדת קבלה'],
    [85, 480, 'ציון משולב משוער — ועדת קבלה'],
    [90, 430, 'ציון משולב משוער — ועדת קבלה'],
  ])('nursing matches inclusive %s/%s via %s', (bagrut, psychometric, label) => {
    const result = evaluate('tlvyaffo_nursing', { bagrut, psychometric });
    expect(result).toMatchObject({ decision: 'pending', scoreAssessment: 'meets_threshold' });
    expect(result.scoreLabel).toContain(label);
    expect(result.requiredInputs).toBeUndefined();
    expect(result.additionalConditions).toContainEqual(
      expect.objectContaining({
        id: 'bagrut_average',
        status: 'unconfirmed',
      }),
    );
    const interview = result.additionalConditions?.find((c) => c.id === 'mta_nursing_interview');
    if (label.includes('ועדת')) {
      expect(interview).toMatchObject({ status: 'unconfirmed' });
      expect(result.nextAction).toContain('ראיון אישי');
    } else {
      expect(interview).toBeUndefined();
    }
  });

  it('does not turn the nursing automatic route into a committee route when English meets the general floor', () => {
    const result = evaluate('tlvyaffo_nursing', { bagrut: 90, psychometric: 520 });
    expect(result.additionalConditions).toContainEqual(
      expect.objectContaining({
        id: 'psychometric_english',
        status: 'confirmed',
      }),
    );
    expect(result.explanation).toContain('המסלול האוטומטי');
  });

  it.each([
    [90, 519, 'ועדת קבלה'],
    [89.9, 520, 'פסיכומטרי — ועדת קבלה'],
    [89.9, 500, 'ציון משולב משוער'],
    [90, 499, 'ציון משולב משוער'],
  ])(
    'nursing below an individual route at %s/%s uses the remaining alternative',
    (bagrut, psychometric, label) => {
      expect(evaluate('tlvyaffo_nursing', { bagrut, psychometric }).scoreLabel).toContain(label);
    },
  );

  it.each([
    [85, 479, 515, 'pending'],
    [85, 478, 514, 'below'],
    [90, 429, 515, 'below'],
  ])(
    'nursing honors rounding and psychometric floor at %s/%s',
    (bagrut, psychometric, combined, decision) => {
      expect(mtaCombinedScore(bagrut, psychometric)).toBe(combined);
      expect(evaluate('tlvyaffo_nursing', { bagrut, psychometric }).decision).toBe(decision);
    },
  );

  it('nursing psychometric-only route keeps Bagrut eligibility unconfirmed without asking for an average', () => {
    const result = evaluate('tlvyaffo_nursing', { bagrut: undefined, psychometric: 520 });
    expect(result).toMatchObject({ score: 520, threshold: 520, decision: 'pending' });
    expect(result.requiredInputs).toBeUndefined();
  });

  it.each([
    [94, 550, 'ממוצע בגרות משוער', 94],
    [undefined, 580, 'פסיכומטרי', 580],
    [90, 560, 'ציון משולב משוער', 580],
    [96, undefined, 'ממוצע בגרות משוער — ללא פסיכומטרי', 96],
  ])('business matches inclusive %s/%s via %s', (bagrut, psychometric, label, threshold) => {
    const result = evaluate('tlvyaffo_business', { bagrut, psychometric });
    expect(result).toMatchObject({
      decision: 'pending',
      scoreAssessment: 'meets_threshold',
      scoreLabel: label,
      threshold,
    });
    expect(result.requiredInputs).toBeUndefined();
    expect(result.explanation).not.toContain('מתואם');
  });

  it.each([
    [93.9, 550, 'ציון משולב משוער'],
    [94, 549, 'ציון משולב משוער'],
  ])(
    'business below the 94/550 route still evaluates the overlapping combined route at %s/%s',
    (bagrut, psychometric, label) => {
      expect(evaluate('tlvyaffo_business', { bagrut, psychometric }).scoreLabel).toBe(label);
    },
  );

  it.each([
    [90, 559, 'pending'],
    [90, 558, 'below'],
    [70, 580, 'pending'],
    [70, 579, 'below'],
    [96, 420, 'pending'],
    [95.9, 420, 'below'],
  ])('business honors isolated numeric boundaries at %s/%s', (bagrut, psychometric, decision) => {
    expect(evaluate('tlvyaffo_business', { bagrut, psychometric }).decision).toBe(decision);
  });

  it.each([
    [4, 80, 'pending'],
    [4, 79, 'below'],
    [5, 55, 'pending'],
    [5, 54, 'below'],
    [3, 100, 'below'],
  ])(
    'business math gate at %s units / %s preserves the numeric match',
    (mathUnits, mathGrade, decision) => {
      expect(
        evaluate(
          'tlvyaffo_business',
          { bagrut: 96, psychometric: undefined },
          { mathUnits, mathGrade },
        ),
      ).toMatchObject({ decision, scoreAssessment: 'meets_threshold' });
    },
  );

  it.each([
    [94, 600, 4, 65, 'pending'],
    [94, 599, 4, 65, 'below'],
    [93.8, 600, 4, 65, 'below'],
    [94, 600, 4, 64, 'below'],
    [94, 600, 5, 54, 'below'],
  ])(
    'business 600/620 exception checks all gates at %s/%s/%su/%s',
    (bagrut, psychometric, mathUnits, mathGrade, decision) => {
      const result = evaluate(
        'tlvyaffo_business',
        { bagrut, psychometric },
        { mathUnits, mathGrade },
      );
      expect(result).toMatchObject({ decision, scoreAssessment: 'meets_threshold' });
      if (decision === 'pending') {
        expect(result).toMatchObject({ score: 620, threshold: 620 });
        expect(result.scoreLabel).toContain('מתמטיקה 4 יחידות');
      }
    },
  );

  it.each(['tlvyaffo_nursing', 'tlvyaffo_business'])(
    '%s separates English 84/85 from a met score route',
    (degreeId) => {
      for (const [psychometricEnglish, decision, status] of [
        [84, 'below', 'unmet'],
        [85, 'pending', 'confirmed'],
      ] as const) {
        const result = evaluate(
          degreeId,
          { bagrut: 96, psychometric: 550 },
          { psychometricEnglish },
        );
        expect(result).toMatchObject({ decision, scoreAssessment: 'meets_threshold' });
        expect(result.additionalConditions).toContainEqual(
          expect.objectContaining({ id: 'psychometric_english', status }),
        );
      }
    },
  );

  it.each([
    [{ mathUnits: undefined }, ['math_units']],
    [{ mathGrade: undefined }, ['math_grade']],
    [{ mathUnits: undefined, mathGrade: undefined }, ['math_units', 'math_grade']],
    [{ psychometricEnglish: undefined }, ['psychometric_english']],
    [
      { mathUnits: undefined, mathGrade: undefined, psychometricEnglish: undefined },
      ['math_units', 'math_grade', 'psychometric_english'],
    ],
  ])('business requests only missing subject fields: %j', (extra, requiredInputs) => {
    const result = evaluate('tlvyaffo_business', { bagrut: 96, psychometric: undefined }, extra);
    expect(result).toMatchObject({ kind: 'needs_input', decision: 'unknown', requiredInputs });
    expect(result.explanation).not.toMatch(/מתואם|סכם|משולב/);
    if (!requiredInputs.includes('psychometric_english'))
      expect(result.explanation).not.toContain('אנגלית');
    if (!requiredInputs.includes('math_units') && !requiredInputs.includes('math_grade'))
      expect(result.explanation).not.toContain('מתמטיקה');
  });

  it.each([
    ['tlvyaffo_nursing', undefined, 500, ['bagrut_average']],
    ['tlvyaffo_nursing', 70, undefined, ['psychometric_overall']],
    ['tlvyaffo_business', 95.9, undefined, ['psychometric_overall']],
    ['tlvyaffo_business', undefined, 579, ['bagrut_average']],
  ])(
    '%s asks for missing base scores only on viable alternatives',
    (degreeId, bagrut, psychometric, requiredInputs) => {
      expect(evaluate(degreeId, { bagrut, psychometric })).toMatchObject({
        kind: 'needs_input',
        requiredInputs,
      });
    },
  );

  it('uses exact mathematics from the subject record ahead of stale legacy values', () => {
    const result = evaluate(
      'tlvyaffo_business',
      { bagrut: 96 },
      {
        mathUnits: 4,
        mathGrade: 100,
        bagrutSubjectRecord: {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: [{ subjectId: 'mathematics', units: 5, grade: 54 }],
        },
      },
    );
    expect(result).toMatchObject({ decision: 'below', scoreAssessment: 'meets_threshold' });
  });

  it.each([60, 130])(
    'does not extrapolate the combined formula outside its Bagrut domain (%s)',
    (bagrut) => {
      expect(mtaCombinedScore(bagrut, 430)).toBeUndefined();
      expect(evaluate('tlvyaffo_nursing', { bagrut, psychometric: 430 }).scoreLabel).not.toContain(
        'ציון משולב',
      );
    },
  );
});
