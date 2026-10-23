import { describe, expect, it } from 'vitest';
import { evaluateColmanPublishedRoutes } from './colmanPublishedRoutesEvaluation';
import type {
  AdmissionsEvaluationInput,
  AdmissionsExtraInputs,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

const institution: CatalogueInstitution = { id: 'colman', name: 'המכללה למינהל', region: 'center' };
for (const [degreeId, boundary, psychometric] of [
  ['colmgmt_law', 100, 540],
  ['colmgmt_business', 85, 555],
] as const) {
  const evaluate = (
    extra: Partial<AdmissionsExtraInputs> = {},
    scores: Partial<AdmissionsEvaluationInput> = {},
  ) =>
    evaluateColmanPublishedRoutes({
      institution,
      input: {
        degreeId,
        psychometric: psychometric - 1,
        ...scores,
        extraInputs: {
          colmanBagrutAverage: boundary,
          colmanBagrutCertificateConfirmed: true,
          psychometricMath: 100,
          ...extra,
        },
      },
    });
  describe(degreeId, () => {
    it('matches the inclusive Bagrut boundary without psychometric or general average', () => {
      expect(evaluate({}, { psychometric: undefined })).toMatchObject({
        decision: 'eligible_to_apply',
        score: boundary,
        threshold: boundary,
        scoreAssessment: 'meets_threshold',
      });
    });
    it('does not replace a missing Colman average with the profile average', () => {
      expect(evaluate({ colmanBagrutAverage: undefined }, { bagrut: 110 })).toMatchObject({
        kind: 'needs_input',
        decision: 'unknown',
        requiredInputs: ['colman_bagrut_average'],
      });
    });
    it('keeps a numeric match separate from an unconfirmed or unmet certificate', () => {
      for (const certificate of [undefined, false])
        expect(evaluate({ colmanBagrutCertificateConfirmed: certificate })).toMatchObject({
          decision: certificate === false ? 'below' : 'pending',
          scoreAssessment: 'meets_threshold',
        });
    });
    it('lets the met Bagrut route win even with missing quantitative input', () => {
      expect(evaluate({ psychometricMath: undefined })).toMatchObject({
        decision: 'eligible_to_apply',
      });
    });
    it('reports the college-decides state at the psychometric boundary when Bagrut is below', () => {
      const result = evaluate({ colmanBagrutAverage: boundary - 0.1 }, { psychometric });
      expect(result.decision).toBe('unknown');
      expect(result.explanation).toContain('ההחלטה היא של המכללה');
      expect(result.explanation).toContain('לא מפרסמת את הציון המשוקלל');
      expect(result.scoreAssessment).toBeUndefined();
    });
    it('shows Shchakim when both routes are below their published minima', () => {
      const result = evaluate({ colmanBagrutAverage: boundary - 0.1 });
      expect(result).toMatchObject({ decision: 'below', scoreAssessment: 'below_threshold' });
      expect(result.nextAction).toContain('מכינת שחקים');
      expect(result.explanation).toContain(`פסיכומטרי ${psychometric}`);
    });
    it('asks for an absent psychometric score when the Bagrut route is below', () => {
      expect(
        evaluate({ colmanBagrutAverage: boundary - 0.1 }, { psychometric: undefined }),
      ).toMatchObject({ kind: 'needs_input', requiredInputs: ['psychometric_overall'] });
    });
    if (degreeId === 'colmgmt_business') {
      it('requires the quantitative score instead of assuming its minimum', () => {
        expect(
          evaluate(
            { colmanBagrutAverage: 84.9, psychometricMath: undefined },
            { psychometric: 555 },
          ),
        ).toMatchObject({
          kind: 'needs_input',
          decision: 'unknown',
          requiredInputs: ['psychometric_math'],
        });
      });
      it('reports quantitative 99 as below even with psychometric 800', () => {
        const result = evaluate(
          { colmanBagrutAverage: 84.9, psychometricMath: 99 },
          { psychometric: 800 },
        );
        expect(result.decision).toBe('below');
        expect(result.explanation).toContain('כמותי 100');
        expect(result.nextAction).toContain('מכינת שחקים');
      });
    }
  });
}

describe('economics certificate confirmation', () => {
  it.each([86, 80])('keeps the numeric match separate at average %s', (average) => {
    for (const confirmed of [undefined, false, true]) {
      const result = evaluateColmanPublishedRoutes({
        institution,
        input: {
          degreeId: 'colmgmt_economics',
          psychometric: 560,
          extraInputs: {
            colmanBagrutAverage: average,
            psychometricMath: 115,
            colmanBagrutCertificateConfirmed: confirmed,
          },
        },
      });
      expect(result).toMatchObject({
        decision: confirmed === undefined ? 'pending' : confirmed ? 'eligible_to_apply' : 'below',
        scoreAssessment: 'meets_threshold',
        additionalConditions: [
          {
            id: 'colman_bagrut_certificate',
            status: confirmed === undefined ? 'unconfirmed' : confirmed ? 'confirmed' : 'unmet',
          },
        ],
      });
    }
  });
});
