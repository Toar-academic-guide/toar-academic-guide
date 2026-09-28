import { describe, expect, it, vi } from 'vitest';
import {
  resolveBguQuantitativeRoute,
  bguQuantitativeProgramme,
} from './bguQuantitativeRoutesPolicy';
import { runBguQuantitativeRoutesProof } from '@/server/ingestion/adapters/bguQuantitativeRoutes';
import { runBguAdmissionsProof } from '@/server/ingestion/adapters/bguAdmissions';
import {
  BGU_QUANTITATIVE_METADATA_BY_PAIR_ID as artifacts,
  BGU_QUANTITATIVE_ROUTES_SCORE_URL,
} from '@/data/admissions/bguQuantitativeRoutesVerification';
import captures from '../../../docs/admissions-verification/2026-09-27-bgu-quantitative-routes-official.json';
import type {
  AdmissionsEvaluationInput,
  AdmissionsExtraInputs,
} from '@/types/admissionsEvaluation';
import { evaluateAdmissionsForProgram } from './evaluator';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import type { SourceFreshnessStateRow } from '@/db/types';
vi.mock('server-only', () => ({}));

const extra: AdmissionsExtraInputs = {
  bguBagrutAverage: 100,
  psychometricMath: 140,
  psychometricVerbal: 100,
  psychometricEnglish: 100,
  bguLanguageRequirementsConfirmed: true,
  bguCertificateRequirementsConfirmed: true,
  bguPriorAcademicStudies: false,
  bguSecondTrackRequirementsConfirmed: true,
  bguApplicationPriority: 1,
  bguQuantitativeRoute: 'quantitative',
  bagrutSubjectRecord: {
    schemaVersion: 1,
    sector: 'jewish',
    subjects: [{ subjectId: 'mathematics', units: 5, grade: 90 }],
  },
};
function resolve(
  id: string,
  overrides: Partial<AdmissionsExtraInputs> = {},
  psychometric: number | undefined = 600,
) {
  return resolveBguQuantitativeRoute(id, { psychometric, extraInputs: { ...extra, ...overrides } });
}
function math(units: number, grade: number): AdmissionsExtraInputs['bagrutSubjectRecord'] {
  return {
    schemaVersion: 1,
    sector: 'jewish',
    subjects: [{ subjectId: 'mathematics', units, grade }],
  };
}
function context(id: string, score = 879) {
  const config = bguQuantitativeProgramme(id);
  const capture = captures.find((x) => x.pairId === `${id}__bgu` && x.kind === 'eligible')!;
  const { psychometric, bagrut, ...inputs } = capture.input;
  return {
    program: {
      id,
      name: id,
      pairId: `${id}__bgu`,
      externalId: config.officialProgramId,
      searchText: config.sourceUrl,
    },
    applicant: {
      psychometric,
      bagrutAverage: bagrut,
      extraInputs: inputs as AdmissionsExtraInputs,
    },
    fetcher: vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ items: [capture.officialRule] }))
      .mockResolvedValueOnce(
        new Response(
          `<script>parent.main.document.getElementById("on_c_val").innerHTML = ${score};</script>`,
        ),
      ),
  };
}
async function evaluate(id: string, input: AdmissionsEvaluationInput, score = 879) {
  const ctx = context(id, score);
  const contract = artifacts[`${id}__bgu`].contract;
  const now = new Date();
  const state = {
    sourceId: contract.source.targetId,
    sourceClass: 'api_static_json',
    capability: 'decision_capable',
    status: 'fresh',
    proofLevel: 'exact_official',
    decisionProvenance: 'verified_derivation',
    reviewedSourceFingerprint: contract.sourceFingerprint,
    lastCheckedAt: now,
    lastSuccessfulCheckAt: now,
    lastExactCheckAt: now,
    lastChangedAt: null,
    latestFailureReason: null,
    blockedReason: null,
    rawFingerprint: null,
    normalizedFingerprint: contract.sourceFingerprint,
    normalizedDecisionPayload: {},
    latestReviewItemId: null,
    nextAction: null,
    createdAt: now,
    updatedAt: now,
  } satisfies SourceFreshnessStateRow;
  const program = getStaticCataloguePrograms().find((x) => x.id === id)!;
  const report = await evaluateAdmissionsForProgram({
    input,
    program: { ...program, linkedInstitutionIds: ['bgu'] },
    institutions: getStaticCatalogueInstitutions(),
    fetcher: ctx.fetcher,
    freshnessStatesBySourceId: new Map([[contract.source.targetId, state]]),
  });
  return { result: report.results[0], fetcher: ctx.fetcher };
}

describe('current BGU quantitative route conditions', () => {
  it.each([
    ['biology', 585],
    ['economics', 620],
    ['business', 620],
    ['accounting', 620],
  ])('uses the quantitative cutoff for %s', (id, threshold) => {
    expect(resolve(id, {}, 800)).toMatchObject({ kind: 'quantitative', threshold });
  });
  it.each([
    ['economics', 570, 640],
    ['business', 570, 640],
    ['accounting', 580, 660],
  ])('preserves the higher cutoff at the lower psychometric route for %s', (id, p, threshold) => {
    expect(resolve(id, {}, p)).toMatchObject({ kind: 'quantitative', threshold });
    expect(resolve(id, {}, p - 1).kind).toBe('below');
  });
  it('requires mathematics and allows the published quantitative substitution only where stated', () => {
    expect(
      resolve('economics', { psychometricMath: 130, bagrutSubjectRecord: math(4, 55) }),
    ).toMatchObject({ kind: 'quantitative', mathematicsCourseRequired: true });
    expect(
      resolve('economics', { psychometricMath: 129, bagrutSubjectRecord: math(4, 55) }).kind,
    ).toBe('below');
    expect(resolve('economics', { bagrutSubjectRecord: math(5, 65) })).toMatchObject({
      kind: 'quantitative',
      mathematicsCourseRequired: true,
    });
    expect(resolve('economics', { bagrutSubjectRecord: math(5, 75) })).toMatchObject({
      kind: 'quantitative',
      mathematicsCourseRequired: false,
    });
    expect(
      resolve('biology', { psychometricMath: 150, bagrutSubjectRecord: math(5, 59) }).kind,
    ).toBe('below');
    expect(resolve('biology', { bagrutSubjectRecord: math(5, 60) }).kind).toBe('quantitative');
  });
  it.each([
    ['biology', 106, 80],
    ['economics', 107, 75],
    ['business', 107, 75],
  ])('supports the published Bagrut route without psychometric for %s', (id, average, grade) => {
    const inputs = {
      bguQuantitativeRoute: 'bagrut' as const,
      bguBagrutAverage: average,
      bagrutSubjectRecord: math(5, grade),
      psychometricMath: undefined,
      psychometricVerbal: undefined,
      psychometricEnglish: undefined,
    };
    expect(resolveBguQuantitativeRoute(id, { extraInputs: { ...extra, ...inputs } })).toMatchObject(
      { kind: 'direct', route: 'bagrut', score: average, threshold: average },
    );
    expect(
      resolveBguQuantitativeRoute(id, {
        extraInputs: { ...extra, ...inputs, bguBagrutAverage: average - 0.01 },
      }).kind,
    ).toBe('below');
  });
  it('preserves the Business Bagrut/quantitative alternative without applying it to Economics', () => {
    const inputs = {
      bguQuantitativeRoute: 'bagrut' as const,
      bguBagrutAverage: 107,
      psychometricMath: 130,
      bagrutSubjectRecord: math(4, 55),
    };
    expect(resolve('business', inputs)).toMatchObject({
      kind: 'direct',
      route: 'bagrut',
      mathematicsCourseRequired: true,
    });
    expect(resolve('economics', inputs).kind).toBe('below');
    expect(resolve('accounting', { bguQuantitativeRoute: 'bagrut' }).kind).toBe('below');
  });
  it('supports recognized preparatory routes without invented Bagrut or component scores', () => {
    const inputs = {
      bguBagrutAverage: undefined,
      bguQuantitativeRoute: 'bagrut' as const,
      bguPreparatoryAverage: 88,
      bguPreparatoryCompleted: true,
      bguPreparatoryTrack: 'natural_life_sciences' as const,
    };
    expect(
      resolveBguQuantitativeRoute('biology', { extraInputs: { ...extra, ...inputs } }),
    ).toMatchObject({ kind: 'direct', route: 'preparatory', score: 88, threshold: 88 });
    expect(
      resolveBguQuantitativeRoute('economics', {
        extraInputs: { ...extra, ...inputs, bguPreparatoryAverage: 87 },
      }),
    ).toMatchObject({ kind: 'direct', route: 'preparatory', score: 87, threshold: 87 });
    expect(resolve('biology', { ...inputs, bguPreparatoryCompleted: false }).kind).toBe(
      'needs_input',
    );
    expect(resolve('biology', { ...inputs, bguPreparatoryTrack: undefined })).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['bgu_preparatory_qualification'],
    });
  });
  it('supports Biology psychometric 680 / quantitative 125 without mathematics or averages', () => {
    expect(
      resolve(
        'biology',
        {
          bguQuantitativeRoute: 'psychometric',
          psychometricMath: 125,
          bguBagrutAverage: undefined,
          bagrutSubjectRecord: undefined,
          psychometricVerbal: undefined,
          psychometricEnglish: undefined,
        },
        680,
      ),
    ).toMatchObject({ kind: 'direct', route: 'psychometric', score: 680 });
    expect(
      resolve('biology', { bguQuantitativeRoute: 'psychometric', psychometricMath: 124 }, 680).kind,
    ).toBe('below');
    expect(resolve('biology', { bguQuantitativeRoute: 'psychometric' }, 679).kind).toBe('below');
  });
  it('distinguishes incomplete inputs, unmet conditions and prior-study review', () => {
    expect(resolve('biology', { bguApplicationPriority: undefined })).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['bgu_application_priority'],
    });
    expect(resolve('biology', { bguApplicationPriority: 4 }).kind).toBe('below');
    expect(resolve('biology', { bguLanguageRequirementsConfirmed: false }).kind).toBe('below');
    expect(resolve('biology', { bguPriorAcademicStudies: true })).toMatchObject({
      priorAcademicReview: true,
    });
    expect(
      resolve('economics', { bguPriorAcademicStudies: true, bguReturningOrChangingTrack: false }),
    ).toMatchObject({ priorAcademicReview: false });
    expect(
      resolve('economics', { bguPriorAcademicStudies: true, bguReturningOrChangingTrack: true }),
    ).toMatchObject({ priorAcademicReview: true });
    expect(resolve('economics', { bguPriorAcademicStudies: true })).toMatchObject({
      kind: 'needs_input',
      requiredInputs: ['bgu_returning_or_changing_track'],
    });
  });
});

describe('BGU quantitative adapter and public evaluation', () => {
  it.each(Object.keys(artifacts))(
    'matches independent score/verdict fixtures and the controlled proof for %s',
    async (pairId) => {
      const { contract, fixtures } = artifacts[pairId];
      expect(contract.proof.state).toBe('verified');
      for (const fixture of fixtures) {
        const ctx = context(contract.programId, fixture.expected.score);
        const { psychometric, bagrut, ...inputs } = fixture.input;
        ctx.applicant = {
          psychometric,
          bagrutAverage: bagrut,
          extraInputs: inputs as AdmissionsExtraInputs,
        };
        const proof = await runBguAdmissionsProof(ctx);
        expect(proof.normalizedPayload).toMatchObject({
          selectedScore: fixture.expected.score,
          derivedVerdict: fixture.expected.verdict,
          sourceFingerprint: contract.sourceFingerprint,
        });
        expect(ctx.fetcher.mock.calls[1][0]).toBe(BGU_QUANTITATIVE_ROUTES_SCORE_URL);
        const params = new URLSearchParams(ctx.fetcher.mock.calls[1][1]!.body as string);
        expect(params.get('on_grade_other_quantity')).toBe(String(inputs.psychometricMath));
        expect(params.has('on_bagrut_average')).toBe(false);
      }
    },
  );
  it('withholds a changed source and rejects the wrong programme mapping', async () => {
    const ctx = context('economics');
    const capture = captures.find((x) => x.family === 'economics')!;
    ctx.fetcher.mockReset().mockResolvedValueOnce(
      Response.json({
        items: [{ ...capture.officialRule, comments: capture.officialRule.comments + ' Changed.' }],
      }),
    );
    expect((await runBguQuantitativeRoutesProof(ctx)).capability).toBe('score_only');
    expect(ctx.fetcher).toHaveBeenCalledTimes(1);
    expect(
      (
        await runBguQuantitativeRoutesProof({
          ...context('economics'),
          program: { ...ctx.program, externalId: 'dep142-pat1-spe3' },
        })
      ).status,
    ).toBe('blocked');
  });
  it('rejects duplicate score fields instead of choosing an arbitrary result', async () => {
    const ctx = context('biology');
    const rule = captures.find((x) => x.family === 'biology')!.officialRule;
    ctx.fetcher
      .mockReset()
      .mockResolvedValueOnce(Response.json({ items: [rule] }))
      .mockResolvedValueOnce(
        new Response('on_c_val").innerHTML = 879; on_c_val").innerHTML = 486;'),
      );
    expect((await runBguQuantitativeRoutesProof(ctx)).status).toBe('blocked');
  });
  it('returns the corrected 486 below verdict rather than the former 632 acceptance', async () => {
    const { result } = await evaluate(
      'bgu_biology',
      {
        degreeId: 'bgu_biology',
        psychometric: 600,
        extraInputs: {
          ...extra,
          psychometricMath: 50,
          psychometricVerbal: 150,
          psychometricEnglish: 150,
        },
      },
      486,
    );
    expect(result).toMatchObject({
      capability: 'exact',
      decision: 'below',
      score: 486,
      threshold: 585,
      scoreLabel: 'סכם כמותי',
    });
  });
  it('evaluates a preparatory-only route without generic Bagrut or psychometric and makes no score POST', async () => {
    const { result, fetcher } = await evaluate('bgu_economics', {
      degreeId: 'bgu_economics',
      extraInputs: {
        ...extra,
        bguBagrutAverage: undefined,
        bguQuantitativeRoute: 'bagrut',
        bguPreparatoryTrack: 'natural_life_sciences',
        bguPreparatoryCompleted: true,
        bguPreparatoryAverage: 87,
      },
    });
    expect(result).toMatchObject({
      capability: 'exact',
      decision: 'eligible_to_apply',
      score: 87,
      threshold: 87,
    });
    expect(result.explanation).toContain('מכסת המתקבלים מלאה');
    expect(result.explanation).not.toContain('ראיון');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not ask for verbal or English components in the Biology psychometric-only route', async () => {
    const { result } = await evaluate('bgu_biology', {
      degreeId: 'bgu_biology',
      psychometric: 680,
      extraInputs: {
        ...extra,
        bguQuantitativeRoute: 'psychometric',
        psychometricMath: 125,
        psychometricVerbal: undefined,
        psychometricEnglish: undefined,
        bguBagrutAverage: undefined,
        bagrutSubjectRecord: undefined,
      },
    });
    expect(result).toMatchObject({ decision: 'eligible_to_apply', score: 680, threshold: 680 });
  });
});
