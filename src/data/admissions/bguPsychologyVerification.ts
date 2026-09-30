import { createHash } from 'node:crypto';
import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';
import official from '../../../docs/admissions-verification/2026-09-27-bgu-psychology-official.json';
import controlled from '../../../docs/admissions-verification/2026-09-27-bgu-psychology-controlled.json';

export const BGU_PSYCHOLOGY_SOURCE_URL = official.rulesUrl;
export const BGU_PSYCHOLOGY_OFFICIAL_PROGRAM_ID = 'inst0-dep101-pat2-degree1';
export const BGU_GENERAL_CALCULATOR_URL = official.calculatorUrl;
export const BGU_GENERAL_SCORE_URL = official.scoreUrl;

export function normalizeBguPsychologyRule(payload: unknown) {
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('items' in payload) ||
    !Array.isArray(payload.items) ||
    payload.items.length !== 1
  )
    return null;
  const row = payload.items[0];
  if (
    !row ||
    typeof row !== 'object' ||
    row.department !== 101 ||
    row.path !== 2 ||
    row.specialization !== null ||
    row.department_dsc !== 'פסיכולוגיה'
  )
    return null;
  if (
    ![row.psycho_sekem, row.psycho_value, row.bagrut_average].every(
      (x) => typeof x === 'number' && Number.isFinite(x),
    )
  )
    return null;
  const textFields = [
    'department_dsc',
    'path_dsc',
    'psycho_and_or',
    'psycho_info',
    'bagrut_info',
    'bagrut_additional',
    'comments',
    'reg_status',
    'sekem_label',
  ] as const;
  if (!textFields.every((key) => typeof row[key] === 'string' && row[key].trim())) return null;
  return {
    mapping: {
      institution: 0,
      department: 101,
      path: 2,
      specialization: null,
      degree: 1,
      year: 2027,
      semester: 1,
    },
    psychometric: row.psycho_value as number,
    score: row.psycho_sekem as number,
    bagrut: row.bagrut_average as number,
    ...Object.fromEntries(textFields.map((key) => [key, row[key].trim().replace(/\s+/g, ' ')])),
  };
}
export function fingerprintBguPsychologyRule(
  rule: NonNullable<ReturnType<typeof normalizeBguPsychologyRule>>,
) {
  return `sha256:${createHash('sha256').update(JSON.stringify(rule)).digest('hex')}`;
}
const reviewed = normalizeBguPsychologyRule({ items: [official.officialRule] });
if (!reviewed) throw new Error('Missing main-campus Psychology rule evidence');
export const BGU_PSYCHOLOGY_SOURCE_FINGERPRINT = fingerprintBguPsychologyRule(reviewed);

export const BGU_PSYCHOLOGY_METADATA_BY_PAIR_ID = Object.fromEntries(
  ['psychology', 'bgu_psychology'].map((programId) => {
    const pairId = `${programId}__bgu`;
    const captures = official.captures.filter((x) => x.pairId === pairId);
    const fixtures: AdmissionsVerificationFixture[] = captures.map((x) => ({
      id: `${pairId}:${x.kind}:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: x.kind === 'eligible' ? 'eligible_to_apply' : 'below',
      input: x.input,
      expected: { score: x.score, verdict: x.kind === 'eligible' ? 'eligible_to_apply' : 'below' },
      sourceFingerprint: BGU_PSYCHOLOGY_SOURCE_FINGERPRINT,
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
        const match = comparisons.filter((x) => x.fixtureId === f.id);
        return (
          match.length === 1 &&
          match[0].actualScore === f.expected.score &&
          match[0].actualVerdict === f.expected.verdict &&
          match[0].sourceFingerprint === f.sourceFingerprint
        );
      });
    const contract: AdmissionsProgramVerificationContract = {
      pairId,
      programId,
      institutionId: 'bgu',
      officialProgramId: BGU_PSYCHOLOGY_OFFICIAL_PROGRAM_ID,
      admissionCycle: '2026-2027',
      source: { targetId: `bgu-${programId}-live`, url: BGU_PSYCHOLOGY_SOURCE_URL },
      calculation: {
        adapterId: 'bgu',
        mode: 'official_replay',
        formulaFamily: 'bgu_main_campus_psychology_routes',
        requiredInputs: [],
        cutoff: { acceptance: 650, rejection: 650 },
        gates: [
          {
            id: 'combined',
            kind: 'minimum',
            field: 'psychometric_overall',
            minimum: 650,
            description:
              'General score 650 AND psychometric 650; alternative general score OR psychometric 680.',
          },
          {
            id: 'direct',
            kind: 'direct_track',
            field: 'bgu_bagrut_average',
            minimum: 113,
            description:
              'Official BGU Bagrut 113 or completed recognized BGU preparatory programme average 94.',
          },
          {
            id: 'languages',
            kind: 'language',
            field: 'bgu_language_requirements',
            description: 'English Basic, applicable Hebrew E or exemption.',
          },
          {
            id: 'qualification',
            kind: 'manual',
            field: 'bgu_psychology_requirements',
            description:
              'Recognized admission qualification and the second department requirements; current waiting lists.',
          },
        ],
      },
      fixtureIds: fixtures.map((x) => x.id),
      fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
      sourceFingerprint: BGU_PSYCHOLOGY_SOURCE_FINGERPRINT,
      proof: {
        state: verified ? 'verified' : 'unverified',
        comparedScore: verified,
        comparedVerdict: verified,
        sourceFingerprint: BGU_PSYCHOLOGY_SOURCE_FINGERPRINT,
        liveComparedAt: verified ? comparisons[comparisons.length - 1].checkedAt : null,
      },
    };
    return [
      pairId,
      {
        contract,
        fixtures,
        ledgerReason:
          'Main-campus Psychology routes verified against current official programme conditions and independent score/verdict captures; Eilat is excluded.',
      },
    ];
  }),
);

export const BGU_PSYCHOLOGY_OFFICIAL_CAPTURES_BY_TARGET_ID = Object.fromEntries(
  Object.values(BGU_PSYCHOLOGY_METADATA_BY_PAIR_ID).map((x) => [
    x.contract.source.targetId,
    x.fixtures.map((f) => ({
      captureId: `${f.id}:independent`,
      capturedAt: f.capturedAt,
      officialUrl: BGU_GENERAL_SCORE_URL,
      applicant: {
        psychometric: f.input.psychometric,
        bagrutAverage: f.input.bagrut,
        extraInputs: {
          bguBagrutAverage: f.input.bguBagrutAverage as number,
          bguPsychologyRoute: 'score' as const,
          bguPsychologyRequirementsConfirmed: true,
          bguLanguageRequirementsConfirmed: true,
        },
      },
      expected: f.expected,
    })),
  ]),
);
