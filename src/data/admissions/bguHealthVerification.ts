import { createHash } from 'node:crypto';
import type {
  AdmissionsExtraInputs,
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';
import official from '../../../docs/admissions-verification/2026-09-28-bgu-health-official.json';
import controlled from '../../../docs/admissions-verification/2026-09-28-bgu-health-controlled.json';

export type BguHealthProgram = keyof typeof official.programmes;
export const BGU_HEALTH_CONFIG = Object.fromEntries(
  Object.entries(official.programmes).map(([id, evidence]) => [
    id,
    {
      url: evidence.rulesUrl,
      department: evidence.officialRule.department,
      name: evidence.officialRule.department_dsc,
      officialProgramId: `inst0-dep${evidence.officialRule.department}-pat1-degree1`,
      threshold: evidence.officialRule.psycho_sekem,
      minimumPsychometric: evidence.officialRule.psycho_value,
    },
  ]),
) as Record<
  BguHealthProgram,
  {
    url: string;
    department: number;
    name: string;
    officialProgramId: string;
    threshold: number;
    minimumPsychometric: number;
  }
>;

export function normalizeBguHealthRule(payload: unknown, programId: BguHealthProgram) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('items' in payload) ||
    !Array.isArray(payload.items) ||
    payload.items.length !== 1
  )
    return null;
  const row = payload.items[0];
  const config = BGU_HEALTH_CONFIG[programId];
  if (
    !row ||
    typeof row !== 'object' ||
    row.department !== config.department ||
    row.path !== 1 ||
    row.specialization !== null ||
    row.department_dsc !== config.name
  )
    return null;
  if (
    ![row.psycho_sekem, row.psycho_value].every((x) => typeof x === 'number' && Number.isFinite(x))
  )
    return null;
  const fields = [
    'department_dsc',
    'path_dsc',
    'psycho_and_or',
    'psycho_info',
    'bagrut_info',
    'comments',
    'reg_status',
    'sekem_label',
  ] as const;
  if (
    !fields.every((key) => typeof row[key] === 'string' && row[key].trim()) ||
    row.bagrut_average !== null ||
    row.bagrut_additional !== null
  )
    return null;
  return {
    mapping: {
      institution: 0,
      department: config.department,
      path: 1,
      specialization: null,
      degree: 1,
      year: 2027,
      semester: 1,
    },
    psychometric: row.psycho_value as number,
    score: row.psycho_sekem as number,
    bagrut: null,
    bagrutAdditional: null,
    ...Object.fromEntries(fields.map((key) => [key, row[key].trim().replace(/\s+/g, ' ')])),
  };
}
export function fingerprintBguHealthRule(
  rule: NonNullable<ReturnType<typeof normalizeBguHealthRule>>,
) {
  return `sha256:${createHash('sha256').update(JSON.stringify(rule)).digest('hex')}`;
}
export const BGU_HEALTH_FINGERPRINTS = Object.fromEntries(
  (Object.keys(official.programmes) as BguHealthProgram[]).map((id) => {
    const rule = normalizeBguHealthRule({ items: [official.programmes[id].officialRule] }, id);
    if (!rule) throw new Error(`Missing reviewed BGU health rule: ${id}`);
    return [id, fingerprintBguHealthRule(rule)];
  }),
) as Record<BguHealthProgram, string>;

export const BGU_HEALTH_METADATA_BY_PAIR_ID = Object.fromEntries(
  (Object.keys(official.programmes) as BguHealthProgram[]).map((programId) => {
    const pairId = `${programId}__bgu`;
    const config = BGU_HEALTH_CONFIG[programId];
    const sourceFingerprint = BGU_HEALTH_FINGERPRINTS[programId];
    const fixtures: AdmissionsVerificationFixture[] = official.captures
      .filter((x) => x.pairId === pairId)
      .map((x) => ({
        id: `${pairId}:${x.kind}:2026-2027`,
        pairId,
        admissionCycle: '2026-2027',
        verdict: x.kind === 'eligible' ? 'eligible_to_apply' : 'below',
        input: x.input,
        expected: {
          score: x.score,
          verdict: x.kind === 'eligible' ? 'eligible_to_apply' : 'below',
        },
        sourceFingerprint,
        capturedAt: x.capturedAt,
      }));
    const comparisons = (
      controlled as Array<{
        fixtureId: string;
        sourceFingerprint: string;
        actualScore: number;
        actualVerdict: string;
        checkedAt: string;
      }>
    ).filter((x) => fixtures.some((f) => f.id === x.fixtureId));
    const verified =
      fixtures.length === 2 &&
      comparisons.length === 2 &&
      fixtures.every((f) => {
        const matches = comparisons.filter((x) => x.fixtureId === f.id);
        return (
          matches.length === 1 &&
          matches[0].sourceFingerprint === sourceFingerprint &&
          matches[0].actualScore === f.expected.score &&
          matches[0].actualVerdict === f.expected.verdict
        );
      });
    const contract: AdmissionsProgramVerificationContract = {
      pairId,
      programId,
      institutionId: 'bgu',
      officialProgramId: config.officialProgramId,
      admissionCycle: '2026-2027',
      source: { targetId: `bgu-${programId}-live`, url: config.url },
      calculation: {
        adapterId: 'bgu',
        mode: 'official_replay',
        formulaFamily: 'bgu_main_campus_health_routes',
        requiredInputs: [],
        cutoff: { acceptance: config.threshold, rejection: config.threshold },
        gates: [
          {
            id: 'combined',
            kind: 'minimum',
            field: 'psychometric_overall',
            minimum: config.minimumPsychometric,
            description: `General score ${config.threshold} AND psychometric ${config.minimumPsychometric}; eligibility for interview consideration only.`,
          },
          {
            id: 'programme',
            kind: 'manual',
            field:
              programId === 'occupational_therapy'
                ? 'bgu_occupational_therapy_requirements'
                : 'bgu_physiotherapy_requirements',
            description:
              programId === 'occupational_therapy'
                ? 'English Advanced A, Hebrew VI/exemption, recognized qualification, priority 1 or priority 2 after Medicine/Physiotherapy, timely registration/documents. Completed degree average 85 allows department review without psychometric; July psychometric/Spring Nativ subject to vacancies; health documents for interview.'
                : 'English Advanced B, Hebrew VI/exemption, recognized qualification, priority 1, timely registration/documents, psychometric by April/Nativ by Autumn. Interview selection by score/psychometric ranking, final admission remains manual. Registration currently closed.',
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
        sourceFingerprint,
        liveComparedAt: verified ? comparisons[comparisons.length - 1].checkedAt : null,
      },
    };
    return [
      pairId,
      {
        contract,
        fixtures,
        ledgerReason:
          'Current main-campus health thresholds, separate psychometric minimum and programme-specific interview/department-review conditions; independent primary calculator captures and controlled replay.',
      },
    ];
  }),
);
export const BGU_HEALTH_OFFICIAL_CAPTURES_BY_TARGET_ID = Object.fromEntries(
  Object.values(BGU_HEALTH_METADATA_BY_PAIR_ID).map((x) => [
    x.contract.source.targetId,
    x.fixtures.map((f) => {
      const { psychometric, bagrut, ...extraInputs } = f.input;
      return {
        captureId: `${f.id}:independent`,
        capturedAt: f.capturedAt,
        officialUrl: official.scoreUrl,
        applicant: {
          psychometric,
          bagrutAverage: bagrut,
          extraInputs: extraInputs as AdmissionsExtraInputs,
        },
        expected: f.expected,
      };
    }),
  ]),
);
