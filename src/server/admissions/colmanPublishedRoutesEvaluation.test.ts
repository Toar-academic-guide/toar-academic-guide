import { describe, expect, it, vi } from 'vitest';
import { evaluateColmanPublishedRoutes } from './colmanPublishedRoutesEvaluation';
import { evaluateAdmissionsForProgram } from './evaluator';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import type {
  AdmissionsEvaluationInput,
  AdmissionsExtraInputs,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution } from '@/types/catalogue';

vi.mock('server-only', () => ({}));

const institution: CatalogueInstitution = { id: 'colman', name: 'המכללה למינהל', region: 'center' };
const programs = getStaticCataloguePrograms();
for (const [degreeId, aliasId, boundary, psychometric] of [
  ['colmgmt_law', 'colman_law', 100, 540],
  ['colmgmt_business', 'colman_business', 85, 555],
] as const) {
  const inputFor = (
    extra: Partial<AdmissionsExtraInputs> = {},
    scores: Partial<AdmissionsEvaluationInput> = {},
  ): AdmissionsEvaluationInput => ({
    degreeId,
    psychometric: psychometric - 1,
    ...scores,
    extraInputs: {
      colmanBagrutAverage: boundary,
      colmanBagrutCertificateConfirmed: true,
      psychometricMath: 100,
      ...extra,
    },
  });
  const evaluate = (
    extra: Partial<AdmissionsExtraInputs> = {},
    scores: Partial<AdmissionsEvaluationInput> = {},
  ) => evaluateColmanPublishedRoutes({ institution, input: inputFor(extra, scores) });

  describe(`${aliasId} parity with ${degreeId}`, () => {
    const fixtures = [
      ['weak profile', inputFor({ colmanBagrutAverage: 70 }, { bagrut: 70, psychometric: 420 })],
      ['inclusive Bagrut boundary', inputFor({}, { psychometric: undefined })],
      ['missing Colman average', inputFor({ colmanBagrutAverage: undefined }, { bagrut: 110 })],
      ['unconfirmed certificate', inputFor({ colmanBagrutCertificateConfirmed: undefined })],
      ['unmet certificate', inputFor({ colmanBagrutCertificateConfirmed: false })],
      ['Bagrut match without quantitative', inputFor({ psychometricMath: undefined })],
      [
        'psychometric boundary',
        inputFor({ colmanBagrutAverage: boundary - 0.1 }, { psychometric }),
      ],
      ['just below both boundaries', inputFor({ colmanBagrutAverage: boundary - 0.1 })],
      [
        'missing psychometric',
        inputFor({ colmanBagrutAverage: boundary - 0.1 }, { psychometric: undefined }),
      ],
      [
        'missing quantitative',
        inputFor(
          { colmanBagrutAverage: boundary - 0.1, psychometricMath: undefined },
          { psychometric },
        ),
      ],
      [
        'below quantitative with strong psychometric',
        inputFor(
          { colmanBagrutAverage: boundary - 0.1, psychometricMath: 99 },
          { psychometric: 800 },
        ),
      ],
      ['empty profile', { degreeId }],
    ] as const;

    it.each(fixtures)('reuses the published route for %s', (_label, input) => {
      expect(
        evaluateColmanPublishedRoutes({ institution, input: { ...input, degreeId: aliasId } }),
      ).toEqual(evaluateColmanPublishedRoutes({ institution, input }));
    });

    it.each(fixtures)('dispatches the same evaluator for %s', async (_label, input) => {
      const program = programs.find((candidate) => candidate.id === degreeId)!;
      const run = (id: string) =>
        evaluateAdmissionsForProgram({
          input: { ...input, degreeId: id },
          // Persisted legacy aliases are absent from the assembled static catalogue.
          program: { ...program, id },
          institutions: [institution],
          freshnessStatesBySourceId: new Map(),
        });
      const canonical = await run(degreeId);
      const alias = await run(aliasId);
      expect(alias.results).toHaveLength(1);
      // Snapshots deliberately retain the requested ID for saved references.
      const { snapshot: canonicalSnapshot, ...canonicalResult } = canonical.results[0];
      const { snapshot: aliasSnapshot, ...aliasResult } = alias.results[0];
      expect(aliasResult).toEqual(canonicalResult);
      expect(alias.program.id).toBe(aliasId);
      expect(alias.input.degreeId).toBe(aliasId);
      expect(aliasSnapshot?.inputDigest).not.toBe(canonicalSnapshot?.inputDigest);
    });
  });
  describe(degreeId, () => {
    it('matches the inclusive Bagrut boundary without psychometric or general average', () => {
      expect(evaluate({}, { psychometric: undefined })).toMatchObject({
        // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
        decision: 'accepted',
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
          // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
          decision: 'accepted',
          scoreAssessment: 'meets_threshold',
        });
    });
    it('lets the met Bagrut route win even with missing quantitative input', () => {
      expect(evaluate({ psychometricMath: undefined })).toMatchObject({
        // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
        decision: 'accepted',
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
        // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
        decision: 'accepted',
        scoreAssessment: 'meets_threshold',
      });
      // Amit ruling 2026-10-25 via Jorje: full bagrut assumed when grades entered
      expect(result.additionalConditions ?? []).not.toContainEqual(
        expect.objectContaining({ id: 'colman_bagrut_certificate' }),
      );
    }
  });
});

describe('Batch A accounting and information systems', () => {
  const extra = { mathUnits: 5, mathGrade: 70 };
  const run = (
    degreeId: string,
    bagrut: number | undefined,
    psychometric: number | undefined,
    extraInputs = {},
  ) =>
    evaluateColmanPublishedRoutes({
      institution,
      input: { degreeId, bagrut, psychometric, extraInputs },
    });
  it.each(['colmgmt_accounting', 'colmgmt_infosystems'])('%s weak profile is below', (degreeId) =>
    expect(run(degreeId, 70, 420, extra).decision).toBe('below'),
  );
  it('uses ordinary average as an estimate without asking for an institutional composite', () =>
    expect(run('colmgmt_accounting', 100, undefined)).toMatchObject({
      decision: 'pending',
      kind: 'estimated',
      scoreAssessment: 'meets_threshold',
    }));
  it('retains the unknown combined score as an unconfirmed condition', () => {
    expect(run('colmgmt_accounting', 70, 555, { psychometricMath: 100 })).toMatchObject({
      decision: 'pending',
      additionalConditions: expect.arrayContaining([
        expect.objectContaining({ id: 'institution_weighted_score', status: 'unconfirmed' }),
      ]),
    });
    expect(run('colmgmt_accounting', 70, 554, { psychometricMath: 100 }).decision).toBe('below');
    expect(run('colmgmt_accounting', 70, 555, { psychometricMath: 99 }).decision).toBe('below');
    expect(run('colmgmt_accounting', 70, 555)).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['psychometric_math'],
    });
  });
  it.each([
    [95, 5, 70],
    [95, 4, 80],
    [85, 5, 70],
    [94.4, 4, 80],
  ])('checks Bagrut %i and math %iu@%i', (bagrut, mathUnits, mathGrade) =>
    expect(run('colmgmt_infosystems', bagrut, 420, { mathUnits, mathGrade })).toMatchObject({
      decision: 'pending',
      scoreAssessment: 'meets_threshold',
    }),
  );
  it('keeps conditional admission separate and does not invent an unpublished composite', () => {
    expect(run('colmgmt_infosystems', 85, 420, extra).additionalConditions).toContainEqual(
      expect.objectContaining({ id: 'admissions_committee', status: 'unconfirmed' }),
    );
    expect(run('colmgmt_infosystems', 84.9, 420, extra).decision).toBe('below');
    expect(run('colmgmt_infosystems', 94.5, 420, extra).decision).toBe('below');
    expect(run('colmgmt_infosystems', 95, 420, { ...extra, mathGrade: 69 }).decision).toBe('below');
    expect(run('colmgmt_infosystems', 95, 420)).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['math_units', 'math_grade'],
    });
  });
});
