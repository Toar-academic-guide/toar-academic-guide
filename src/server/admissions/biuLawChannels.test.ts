import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';
import { evaluateBiuPublishedRoutes } from './biuPublishedRoutesEvaluation';

vi.mock('server-only', () => ({}));
import { evaluateAdmissionsForProgram } from './evaluator';

const institution = getStaticCatalogueInstitutions().find((item) => item.id === 'biu')!;
const program = getStaticCataloguePrograms().find((item) => item.id === 'biu_law')!;
const profiles: {
  name: string;
  input: Omit<AdmissionsEvaluationInput, 'degreeId'>;
  pass: boolean;
  decision: string;
  kind: string;
}[] = [
  {
    name: '105/650 needs the official calculator, never below',
    input: { bagrut: 105, psychometric: 650 },
    pass: false,
    decision: 'unknown',
    kind: 'estimated',
  },
  {
    name: '113 and English 5u92 passes without psychometric',
    input: { bagrut: 113, extraInputs: { englishUnits: 5, englishGrade: 92 } },
    pass: true,
    decision: 'pending',
    kind: 'estimated',
  },
  {
    name: '95/730 passes the psychometric channel',
    input: { bagrut: 95, psychometric: 730 },
    pass: true,
    decision: 'pending',
    kind: 'estimated',
  },
  {
    name: '88/650 fails the combined bagrut floor',
    input: { bagrut: 88, psychometric: 650 },
    pass: false,
    decision: 'below',
    kind: 'estimated',
  },
  {
    name: '105/590 fails the combined psychometric floor',
    input: { bagrut: 105, psychometric: 590 },
    pass: false,
    decision: 'below',
    kind: 'estimated',
  },
  {
    name: '110 and English 5u95 fails without psychometric',
    input: { bagrut: 110, extraInputs: { englishUnits: 5, englishGrade: 95 } },
    pass: false,
    decision: 'below',
    kind: 'estimated',
  },
];

function inputFor(profile: Omit<AdmissionsEvaluationInput, 'degreeId'>): AdmissionsEvaluationInput {
  return {
    ...profile,
    degreeId: 'biu_law',
    extraInputs: { psychometricEnglish: 85, ...profile.extraInputs },
  };
}

function evaluate(profile: Omit<AdmissionsEvaluationInput, 'degreeId'>) {
  return evaluateBiuPublishedRoutes({ institution, input: inputFor(profile) });
}

describe('BIU law official admission channels are OR alternatives', () => {
  it.each(profiles)('$name (direct and full evaluator)', async (profile) => {
    const input = inputFor(profile.input);
    const report = await evaluateAdmissionsForProgram({
      input,
      program,
      institutions: [institution],
      freshnessStatesBySourceId: new Map(),
    });
    for (const result of [
      evaluate(profile.input),
      report.results.find((item) => item.linkedInstitutionId === 'biu')!,
    ]) {
      expect(result).toMatchObject({ decision: profile.decision, kind: profile.kind });
      expect(result.scoreAssessment).toBe(
        profile.pass
          ? 'meets_threshold'
          : profile.decision === 'below'
            ? 'below_threshold'
            : undefined,
      );
      expect(result.requiredInputs ?? []).not.toContain('institution_weighted_score');
      if (profile.decision === 'unknown') {
        expect(result.score).toBeUndefined();
        expect(result.threshold).toBeUndefined();
        expect(result.requiredInputs).toBeUndefined();
        expect(result.officialUrls).toContain('https://shoham.biu.ac.il/kabala/');
        expect(result.nextAction).toContain('מחשבון הקבלה');
      }
    }
  });

  it.each([719, 720, 721])(
    'honors the psychometric 720 boundary at %s, independently of bagrut English',
    (psychometric) => {
      const result = evaluate({
        bagrut: 88,
        psychometric,
        extraInputs: { englishUnits: 4, englishGrade: 50 },
      });
      expect(result.scoreAssessment).toBe(
        psychometric >= 720 ? 'meets_threshold' : 'below_threshold',
      );
      if (psychometric >= 720) {
        expect(result).toMatchObject({ score: psychometric, threshold: 720 });
        // Approved test update, Jorje 2026-10-25: bagrut_average condition removed (option A)
        expect(result.additionalConditions).not.toContainEqual(
          expect.objectContaining({ id: 'bagrut_average', status: 'unconfirmed' }),
        );
      }
    },
  );

  it.each([
    [90, 600, 'unknown'],
    [89.99, 600, 'below'],
    [90, 599, 'below'],
    [90.01, 601, 'unknown'],
  ])('honors combined floors %s/%s without inventing a score', (bagrut, psychometric, decision) => {
    const result = evaluate({ bagrut, psychometric });
    expect(result.decision).toBe(decision);
    expect(result.score).toBeUndefined();
  });

  it('lets a complete bagrut channel win over the combined channel', () => {
    expect(
      evaluate({
        bagrut: 112,
        psychometric: 650,
        extraInputs: { englishUnits: 5, englishGrade: 90 },
      }),
    ).toMatchObject({ scoreAssessment: 'meets_threshold', score: 112, threshold: 112 });
  });

  it.each([650, 720])(
    'requests ordinary bagrut data when absent at psychometric %s',
    (psychometric) => {
      const result = evaluate({ psychometric });
      expect(result).toMatchObject({ kind: 'needs_input', decision: 'unknown' });
      expect(result.requiredInputs).toContain('bagrut_average');
      expect(result.scoreAssessment).toBeUndefined();
      expect(result.requiredInputs).not.toContain('institution_weighted_score');
    },
  );

  it('does not add channels to the general law programme or HOLD/UNKNOWN BIU programmes', () => {
    for (const degreeId of ['law', 'biu_psychology', 'biu_optometry', 'biu_medicine']) {
      expect(
        evaluateBiuPublishedRoutes({
          institution,
          input: { degreeId, bagrut: 95, psychometric: 730 },
        }).decision,
      ).toBe('below');
    }
  });
});
