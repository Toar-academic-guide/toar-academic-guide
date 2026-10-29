import { calculateHaifaAdmissionScore } from '@/data/admissions/haifaAdmissionFormula';
import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import bguQuantitativeCaptures from '../../../../../docs/admissions-verification/2026-09-27-bgu-quantitative-routes-official.json';
import { BGU_COMPUTER_SCIENCE_RULE_CAPTURE } from '@/data/admissions/bguComputerScienceVerification';
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
import { runTechnionAdmissionsProof } from '@/server/ingestion/adapters/technionAdmissions';
import { resultLabel } from '@/lib/studyJourney';
import type { BagrutSubjectRecord } from '@/types';
import type {
  AdmissionsEvaluationInput,
  AdmissionsExtraInputs,
} from '@/types/admissionsEvaluation';
import type { SourceFreshnessStateRow } from '@/db/types';

vi.mock('server-only', () => ({}));

const programs = getStaticCataloguePrograms();
const institutions = getStaticCatalogueInstitutions();
const auditRecord: BagrutSubjectRecord = {
  schemaVersion: 2,
  sector: 'jewish',
  certificateType: 'external_1977_or_later',
  complete: true,
  subjects: [
    ['mathematics', 5, 90],
    ['english', 5, 85],
    ['physics', 5, 80],
    ['computer_science', 5, 95],
    ['hebrew_expression', 2, 85],
    ['history', 2, 80],
    ['civics', 2, 85],
    ['literature', 2, 85],
    ['bible', 2, 80],
  ].map(([subjectId, units, grade]) => ({
    subjectId: String(subjectId),
    units: Number(units),
    grade: Number(grade),
    assessmentKind: 'exam',
  })),
};
const auditExtra: AdmissionsExtraInputs = {
  bagrutSubjectRecord: auditRecord,
  mathUnits: 5,
  mathGrade: 90,
  englishUnits: 5,
  englishGrade: 85,
  physicsUnits: 5,
  physicsGrade: 80,
  csUnits: 5,
  csGrade: 95,
  psychometricMath: 140,
  psychometricVerbal: 130,
  psychometricEnglish: 135,
  bguBagrutAverage: 104,
  haifaBagrutAverage: 104,
  haifaHebrewQualification: 'hebrew_school',
};

function evaluate(
  degreeId: string,
  institutionId: string,
  scores: Omit<AdmissionsEvaluationInput, 'degreeId'>,
  fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('No live calls in regression tests')),
  withFreshness = true,
) {
  const program = programs.find((p) => p.id === degreeId)!;
  const artifact = getProgramVerificationArtifact(`${degreeId}__${institutionId}`);
  const now = new Date();
  const sourceId = artifact?.contract.source.targetId;
  const freshnessStatesBySourceId = new Map<string, SourceFreshnessStateRow>();
  if (withFreshness && sourceId && artifact)
    freshnessStatesBySourceId.set(sourceId, {
      sourceId,
      sourceClass: 'api_static_json',
      capability: 'decision_capable',
      status: 'fresh',
      proofLevel: 'exact_official',
      decisionProvenance: 'verified_derivation',
      reviewedSourceFingerprint: artifact.contract.sourceFingerprint,
      normalizedFingerprint: artifact.contract.sourceFingerprint,
      normalizedDecisionPayload: {},
      lastCheckedAt: now,
      lastSuccessfulCheckAt: now,
      lastExactCheckAt: now,
      lastChangedAt: null,
      latestFailureReason: null,
      blockedReason: null,
      rawFingerprint: null,
      latestReviewItemId: null,
      nextAction: null,
      createdAt: now,
      updatedAt: now,
    });
  return evaluateAdmissionsForProgram({
    program: {
      ...program,
      linkedInstitutionIds: [institutionId],
      ...(institutionId === 'technion' && artifact
        ? { thresholds: { technion: artifact.contract.calculation.cutoff.acceptance } }
        : {}),
    },
    institutions,
    input: { ...scores, degreeId },
    fetcher,
    freshnessStatesBySourceId,
  }).then((report) => report.results.find((r) => r.linkedInstitutionId === institutionId)!);
}

const technionFetcher = () =>
  vi
    .fn<typeof fetch>()
    .mockImplementation(
      async (url) =>
        new Response(
          String(url).includes('technion-calculators-sum.php')
            ? 'הסכם לדיוני הקבלה הוא:84.4'
            : '<table id="tablepress-485"><tr><td class="column-1">מדעי המחשב</td><td class="column-2">91</td></tr><tr><td class="column-1">הנדסה אזרחית</td><td class="column-2">87</td></tr></table>',
        ),
    );

describe('Technion Hebrew-expression-only audit certificate', () => {
  it.each(['technion_cs', 'technion_civil'])(
    '%s evaluates exactly without a separate Hebrew row',
    async (degreeId) => {
      const result = await evaluate(
        degreeId,
        'technion',
        { bagrut: 92.1, psychometric: 700, extraInputs: auditExtra },
        technionFetcher(),
      );
      expect(result).toMatchObject({ kind: 'exact', score: 84.4, decision: 'below' });
    },
  );
  it('serializes absent Arabic-speaker Hebrew as zero units and an empty grade', async () => {
    const fetcher = technionFetcher();
    await runTechnionAdmissionsProof({
      fetcher,
      program: { id: 'cs', name: 'Computer Science' },
      applicant: { bagrutAverage: 92.1, psychometric: 700, bagrutSubjectRecord: auditRecord },
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const body = new URLSearchParams(String(fetcher.mock.calls[0][1]?.body));
    expect(Object.fromEntries(body)).toMatchObject({
      yHabaa: '2',
      habaa: '85',
      yHebrew: '0',
      hebrew: '',
    });
  });
});

// Discover generic/institution-specific duplicates without retiring any saved ID.
const pairs = ['haifa', 'biu', 'tau'].flatMap((institution) =>
  programs
    .filter((p) => p.id.startsWith(`${institution}_`))
    .flatMap((specific) => {
      const generic = programs.find(
        (p) =>
          !p.institutionId &&
          p.linkedInstitutionIds.includes(institution) &&
          (p.name === specific.name ||
            p.id.replaceAll('_', '') === specific.id.slice(institution.length + 1)),
      );
      return generic ? [{ institution, generic: generic.id, specific: specific.id }] : [];
    }),
);
const answer = (r: Awaited<ReturnType<typeof evaluate>>) => ({
  kind: r.kind,
  capability: r.capability,
  decision: r.decision,
  score: r.score,
  threshold: r.threshold,
  requiredInputs: r.requiredInputs,
  scoreAssessment: r.scoreAssessment,
  floorChecks: r.floorChecks,
});

describe.each(pairs)(
  '$institution $generic / $specific agreement',
  ({ institution, generic, specific }) => {
    it.each([
      ['missing inputs', {}],
      [
        'weak profile',
        {
          bagrut: 70,
          psychometric: 400,
          extraInputs: { ...auditExtra, bguBagrutAverage: 70, haifaBagrutAverage: 70 },
        },
      ],
      ['audit profile', { bagrut: 92.1, psychometric: 700, extraInputs: auditExtra }],
    ] as const)('%s selects the same verified path', async (_label, scores) => {
      expect(answer(await evaluate(generic, institution, scores))).toEqual(
        answer(await evaluate(specific, institution, scores)),
      );
    });
  },
);

it.each(['psychology', 'haifa_psychology'])(
  '%s asks for the actual psychometric month and retains the official NITE total',
  async (degreeId) => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await evaluate(
      degreeId,
      'haifa',
      { bagrut: 92.1, psychometric: 700, extraInputs: auditExtra },
      fetcher,
    );
    expect(result).toMatchObject({
      // Approved test update: Jorje 2026-10-29, ruling (a): real NITE input; sibling asserts Haifa calculator value via its own general score, capture in docs/admissions-verification/evidence/2026-10-29-haifa-formula/calculator/rulingsHaifaTau-saved104-nite700-psychology.json
      kind: 'needs_input',
      decision: 'unknown',
      // Approved test update: Jorje 2026-10-29, ruling (a): real NITE input; sibling asserts Haifa calculator value via its own general score, capture in docs/admissions-verification/evidence/2026-10-29-haifa-formula/calculator/rulingsHaifaTau-saved104-nite700-psychology.json
      requiredInputs: ['haifa_psychometric_month'],
    });
    const formulaInput = {
      programme: 'psychology',
      bagrutAverage: 104,
      bagrutYear: 2026,
      psychometricYear: 2026,
      psychometric: 700,
    };
    // Approved test update: Jorje 2026-10-29, ruling (a): real NITE input; sibling asserts Haifa calculator value via its own general score, capture in docs/admissions-verification/evidence/2026-10-29-haifa-formula/calculator/rulingsHaifaTau-saved104-nite700-psychology.json
    expect(calculateHaifaAdmissionScore(formulaInput)).toEqual({ kind: 'calculated', score: 703 });
    // Haifa's exact saved104 capture shows PC699 and weighted702 for these same sections.
    expect(calculateHaifaAdmissionScore({ ...formulaInput, psychometric: 699 })).toEqual({
      kind: 'calculated',
      score: 702,
    });
    expect(result.degradationReason).toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

it.each([720, 730])(
  'BGU CS score %s meeting the published 720 cutoff stays green without a waiting-band explanation',
  async (score) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(BGU_COMPUTER_SCIENCE_RULE_CAPTURE)))
      .mockResolvedValueOnce(
        new Response(
          `<script>parent.main.document.getElementById("on_c_val").innerHTML = ${score};</script>`,
        ),
      );
    const result = await evaluate(
      'bgu_cs',
      'bgu',
      { bagrut: 92.1, psychometric: 700, extraInputs: auditExtra },
      fetcher,
    );
    expect(result).toMatchObject({
      kind: 'exact',
      decision: 'pending',
      score,
      threshold: 720,
      scoreAssessment: 'meets_threshold',
    });
    expect(resultLabel(result)).toEqual({ label: 'הציונים עומדים בסף', group: 'match' });
    expect(result.explanation).toContain('עומד בסף');
    expect(result.explanation).not.toContain('בין סף הדחייה לסף הקבלה');
  },
);

it.each([
  [609, 'below'],
  [610, 'accepted'],
] as const)('TAU accounting duplicates replay the same score %s', async (score, decision) => {
  const results = [];
  for (const degreeId of ['accounting', 'tau_accounting']) {
    const artifact = getProgramVerificationArtifact(`${degreeId}__tau`)!;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      return Response.json(
        request.operationName === 'getLastScore'
          ? { data: { getLastScore: { body: { hatama_nihul: score } } } }
          : {
              data: {
                getProgramByIdAndLang: {
                  receipt_threshol: [610],
                  rejection_thresh: [609],
                  field_plain_id_programs: [artifact.contract.officialProgramId],
                },
              },
            },
      );
    });
    const result = await evaluate(
      degreeId,
      'tau',
      { bagrut: 92.1, psychometric: 700, extraInputs: auditExtra },
      fetcher,
    );
    expect(result).toMatchObject({ kind: 'exact', decision, score, threshold: 610 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    results.push(answer(result));
  }
  expect(results[0]).toEqual(results[1]);
});

it.each(['biology', 'economics', 'business', 'accounting'])(
  '%s BGU requires a current source attestation even with stored thresholds',
  async (degreeId) => {
    const fetcher = vi.fn<typeof fetch>();
    expect(
      await evaluate(
        degreeId,
        'bgu',
        { bagrut: 92.1, psychometric: 700, extraInputs: auditExtra },
        fetcher,
        false,
      ),
    ).toMatchObject({
      kind: 'authority_unavailable',
      decision: 'unknown',
      degradationReason: 'pair_verification_incomplete',
    });
    expect(fetcher).not.toHaveBeenCalled();

    const capture = bguQuantitativeCaptures.find(
      (x) => x.pairId === `${degreeId}__bgu` && x.kind === 'eligible',
    )!;
    fetcher
      .mockResolvedValueOnce(Response.json({ items: [capture.officialRule] }))
      .mockResolvedValueOnce(
        new Response(
          '<script>parent.main.document.getElementById("on_c_val").innerHTML = 730;</script>',
        ),
      );
    expect(
      await evaluate(
        degreeId,
        'bgu',
        {
          bagrut: 92.1,
          psychometric: 700,
          extraInputs: { ...auditExtra, bguQuantitativeRoute: 'quantitative' },
        },
        fetcher,
      ),
    ).toMatchObject({
      kind: 'exact',
      score: 730,
      threshold: degreeId === 'biology' ? 585 : 620,
      scoreAssessment: 'meets_threshold',
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  },
);
