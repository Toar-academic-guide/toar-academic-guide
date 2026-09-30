import { createHash } from 'node:crypto';
import type {
  AdmissionsExtraInputs,
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import type { OfficialProgramProofCapture } from './officialProgramProofCaptures';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';
import { BGU_QUANTITATIVE_PROGRAM_IDS } from '@/lib/calculatorInputRequirements';
import {
  bguQuantitativeProgramme,
  type BguQuantitativeProgramme,
} from '@/server/admissions/bguQuantitativeRoutesPolicy';
import official from '../../../docs/admissions-verification/2026-09-27-bgu-quantitative-routes-official.json';
import controlled from '../../../docs/admissions-verification/2026-09-27-bgu-quantitative-routes-controlled.json';

export const BGU_QUANTITATIVE_ROUTES_CALCULATOR_URL =
  'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=4';
export const BGU_QUANTITATIVE_ROUTES_SCORE_URL =
  'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmiTevaSekem';

export function normalizeBguQuantitativeRouteRule(
  payload: unknown,
  config: BguQuantitativeProgramme,
) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('items' in payload) ||
    !Array.isArray(payload.items)
  )
    return null;
  const matches = payload.items.filter(
    (x: unknown): x is Record<string, unknown> =>
      !!x &&
      typeof x === 'object' &&
      'department' in x &&
      'path' in x &&
      'specialization' in x &&
      x.department === config.department &&
      x.path === config.path &&
      x.specialization === config.specialization,
  );
  if (matches.length !== 1) return null;
  const x = matches[0];
  if (
    typeof x.psycho_value !== 'number' ||
    !Number.isFinite(x.psycho_value) ||
    (x.psycho_sekem !== null &&
      (typeof x.psycho_sekem !== 'number' || !Number.isFinite(x.psycho_sekem))) ||
    (x.bagrut_average !== null &&
      (typeof x.bagrut_average !== 'number' || !Number.isFinite(x.bagrut_average)))
  )
    return null;
  for (const key of [
    'department_dsc',
    'path_dsc',
    'sekem_label',
    'psycho_info',
    'bagrut_info',
    'comments',
  ]) {
    if (typeof x[key] !== 'string' || !x[key].trim()) return null;
  }
  const text = (key: string) =>
    String(x[key] ?? '')
      .trim()
      .replace(/\s+/g, ' ');
  return {
    mapping: {
      department: config.department,
      path: config.path,
      specialization: config.specialization,
      year: 2027,
      semester: 1,
    },
    departmentName: text('department_dsc'),
    pathName: text('path_dsc'),
    label: text('sekem_label'),
    psychometric: x.psycho_value,
    score: x.psycho_sekem,
    bagrut: x.bagrut_average,
    requirements: text('psycho_info'),
    directRequirements: text('bagrut_info'),
    comments: text('comments'),
    preparatoryAndDirectConditions: text('bagrut_additional'),
    registrationStatus: text('reg_status'),
  };
}

export function fingerprintBguQuantitativeRouteRule(
  rule: NonNullable<ReturnType<typeof normalizeBguQuantitativeRouteRule>>,
) {
  return `sha256:${createHash('sha256').update(JSON.stringify(rule)).digest('hex')}`;
}

export const BGU_QUANTITATIVE_METADATA_BY_PAIR_ID = Object.fromEntries(
  BGU_QUANTITATIVE_PROGRAM_IDS.map((programId) => {
    const config = bguQuantitativeProgramme(programId);
    const captures = official.filter((x) => x.pairId === `${programId}__bgu`);
    const rule = normalizeBguQuantitativeRouteRule({ items: [captures[0]?.officialRule] }, config);
    if (!rule || captures.length !== 2)
      throw new Error(`Missing BGU quantitative evidence for ${programId}`);
    const sourceFingerprint = fingerprintBguQuantitativeRouteRule(rule);
    const fixtures: AdmissionsVerificationFixture[] = captures.map((capture) => ({
      id: `${capture.pairId}:${capture.kind}:2026-2027`,
      pairId: capture.pairId,
      admissionCycle: '2026-2027',
      verdict: capture.kind === 'eligible' ? 'eligible_to_apply' : 'below',
      input: {
        ...capture.input,
        bagrutSubjectRecord: {
          schemaVersion: 1,
          sector: 'jewish',
          subjects: capture.input.bagrutSubjectRecord.subjects,
        },
      },
      expected: {
        score: capture.score,
        verdict: capture.kind === 'eligible' ? 'eligible_to_apply' : 'below',
      },
      sourceFingerprint,
      capturedAt: capture.capturedAt,
    }));
    const comparisons = (
      controlled as Array<{
        fixtureId: string;
        pairId: string;
        checkedAt: string;
        sourceFingerprint: string;
        expectedScore: number;
        actualScore: number | null;
        expectedVerdict: string;
        actualVerdict: string | null;
        scoreMatches: boolean;
        verdictMatches: boolean;
      }>
    ).filter((x) => x.pairId === `${programId}__bgu`);
    const verified =
      comparisons.length === fixtures.length &&
      fixtures.every((fixture) => {
        const matching = comparisons.filter((x) => x.fixtureId === fixture.id);
        return (
          matching.length === 1 &&
          matching[0].scoreMatches &&
          matching[0].verdictMatches &&
          matching[0].expectedScore === fixture.expected.score &&
          matching[0].actualScore === fixture.expected.score &&
          matching[0].expectedVerdict === fixture.expected.verdict &&
          matching[0].actualVerdict === fixture.expected.verdict &&
          matching[0].sourceFingerprint === sourceFingerprint
        );
      });
    const contract: AdmissionsProgramVerificationContract = {
      pairId: `${programId}__bgu`,
      programId,
      institutionId: 'bgu',
      officialProgramId: config.officialProgramId,
      admissionCycle: '2026-2027',
      source: { targetId: `bgu-${programId}-live`, url: config.sourceUrl },
      calculation: {
        adapterId: 'bgu',
        mode: 'official_replay',
        formulaFamily: 'bgu_quantitative_sekhem',
        requiredInputs: [
          'psychometric_math',
          'psychometric_verbal',
          'psychometric_english',
          'bgu_bagrut_average',
          'bagrut_subject_record',
          'bgu_language_requirements',
          'bgu_certificate_requirements',
          'bgu_prior_academic_studies',
          'bgu_second_track_requirements',
          ...(config.family === 'biology' ? ['bgu_application_priority' as const] : []),
        ],
        cutoff: { acceptance: config.score, rejection: config.score },
        gates: [
          {
            id: `${programId}:published-routes`,
            kind: 'direct_track',
            field: 'bguQuantitativeRoute',
            description:
              'Published quantitative, alternative-psychometric, Bagrut and recognized BGU preparatory routes; mathematics and current registration conditions remain applicable.',
          },
          {
            id: `${programId}:language`,
            kind: 'language',
            field: 'bguLanguageRequirementsConfirmed',
            description: 'English Basic and applicable Hebrew level E.',
          },
          {
            id: `${programId}:academic-review`,
            kind: 'manual',
            field: 'bguPriorAcademicStudies',
            description:
              'Prior academic study requires department review when specified; threshold eligibility is not final acceptance.',
          },
        ],
      },
      fixtureIds: fixtures.map((x) => x.id),
      fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
      sourceFingerprint,
      proof: {
        state: verified ? 'verified' : 'unverified',
        comparedScore: verified,
        comparedVerdict: verified,
        liveComparedAt: verified ? comparisons[comparisons.length - 1].checkedAt : null,
        sourceFingerprint: verified ? sourceFingerprint : null,
      },
    };
    return [
      contract.pairId,
      {
        contract,
        fixtures,
        rule,
        ledgerReason:
          'Verified current BGU quantitative programme mapping, complete published route conditions, independent calculator score/verdict fixtures and controlled matching replay.',
      },
    ];
  }),
);

export const BGU_QUANTITATIVE_OFFICIAL_CAPTURES_BY_TARGET_ID = Object.fromEntries(
  Object.values(BGU_QUANTITATIVE_METADATA_BY_PAIR_ID).map(({ contract, fixtures }) => [
    contract.source.targetId,
    fixtures.map((fixture) => {
      const { psychometric, bagrut, ...extra } = fixture.input;
      return {
        captureId: fixture.id,
        capturedAt: fixture.capturedAt,
        officialUrl: BGU_QUANTITATIVE_ROUTES_SCORE_URL,
        applicant: {
          psychometric,
          bagrutAverage: bagrut,
          extraInputs: { ...extra, bguQuantitativeRoute: 'quantitative' } as AdmissionsExtraInputs,
        },
        expected: fixture.expected,
      } satisfies OfficialProgramProofCapture;
    }),
  ]),
);
