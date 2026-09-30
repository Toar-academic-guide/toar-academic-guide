import { createHash } from 'node:crypto';
import { bguSocialScienceProgram } from '@/lib/bguSocialScienceInputs';
import { BGU_SOCIAL_SCIENCE_RULES } from './bguSocialScienceRules';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';
import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import official from '../../../docs/admissions-verification/2026-09-27-bgu-social-sciences-official.json';
import controlled from '../../../docs/admissions-verification/2026-09-27-bgu-social-sciences-controlled.json';

export const BGU_SOCIAL_SCIENCE_SCORE_URL = 'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmitSekem';
export const BGU_SOCIAL_SCIENCE_CALCULATOR_URL =
  'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_CalcMain?type=1';

export function bguSocialScienceSource(programId: string) {
  const programme = bguSocialScienceProgram(programId);
  const source = official.programmes.find((x) => x.programme === programme);
  if (!programme || !source) throw new Error(`Missing reviewed source for ${programId}`);
  const rule = BGU_SOCIAL_SCIENCE_RULES[programme];
  const officialProgramId = `inst0-dep${rule.department}-pat${rule.path}${rule.specialization === null ? '' : `-spe${rule.specialization}`}-degree1`;
  return { programme, source, rule, officialProgramId };
}

export function normalizeBguSocialScienceRule(programId: string, payload: unknown) {
  const { rule } = bguSocialScienceSource(programId);
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('items' in payload) ||
    !Array.isArray(payload.items) ||
    payload.items.length !== 1 ||
    ('hasMore' in payload && payload.hasMore !== false)
  )
    return null;
  const row = payload.items[0] as Record<string, unknown>;
  if (
    !row ||
    row.department !== rule.department ||
    row.path !== rule.path ||
    row.specialization !== rule.specialization ||
    row.department_dsc !== rule.name
  )
    return null;
  const numeric = ['psycho_sekem', 'psycho_value', 'bagrut_average'] as const;
  const textual = [
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
  if (
    !numeric.every((key) => typeof row[key] === 'number' && Number.isFinite(row[key])) ||
    !textual.every((key) => typeof row[key] === 'string' && row[key].trim())
  )
    return null;
  return {
    mapping: {
      institution: 0,
      department: rule.department,
      path: rule.path,
      specialization: rule.specialization,
      degree: 1,
      year: 2027,
      semester: 1,
    },
    ...Object.fromEntries(numeric.map((key) => [key, row[key]])),
    ...Object.fromEntries(
      textual.map((key) => [key, (row[key] as string).trim().replace(/\s+/g, ' ')]),
    ),
  };
}
export function fingerprintBguSocialScienceRule(
  rule: NonNullable<ReturnType<typeof normalizeBguSocialScienceRule>>,
) {
  return `sha256:${createHash('sha256').update(JSON.stringify(rule)).digest('hex')}`;
}

export const BGU_SOCIAL_SCIENCE_METADATA_BY_PAIR_ID = Object.fromEntries(
  official.programmes.flatMap((source) =>
    source.pairs.map((pairId) => {
      const programId = pairId.split('__')[0];
      const { rule, officialProgramId } = bguSocialScienceSource(programId);
      const normalized = normalizeBguSocialScienceRule(programId, source.payload);
      if (!normalized) throw new Error(`Invalid source evidence for ${pairId}`);
      const sourceFingerprint = fingerprintBguSocialScienceRule(normalized);
      const fixtures: AdmissionsVerificationFixture[] = source.calculatorCaptures
        .filter((x) => x.pairId === pairId)
        .map((capture) => ({
          id: `${pairId}:${capture.expectedNumericRouteVerdict === 'below' ? 'below' : 'eligible'}:2026-2027`,
          pairId,
          admissionCycle: '2026-2027',
          verdict: capture.expectedNumericRouteVerdict === 'below' ? 'below' : 'eligible_to_apply',
          input: {
            psychometric: capture.input.psychometric,
            bagrut: capture.input.bguBagrutAverage,
            bguBagrutAverage: capture.input.bguBagrutAverage,
            bguSocialScienceRoute: 'score',
            bguSocialScienceRequirementsConfirmed: true,
            bguSocialScienceLanguageConfirmed: true,
            bguReturningFromStudyBreak: false,
            bguSocialWorkAcademicBackground: 'none',
          },
          expected: {
            score: capture.officialScore,
            verdict:
              capture.expectedNumericRouteVerdict === 'below' ? 'below' : 'eligible_to_apply',
          },
          sourceFingerprint,
          capturedAt: capture.capturedAt,
        }));
      const comparisons = (
        controlled as Array<{
          fixtureId: string;
          actualScore: number;
          actualVerdict: string;
          sourceFingerprint: string;
          checkedAt: string;
        }>
      ).filter((x) => fixtures.some((fixture) => fixture.id === x.fixtureId));
      const verified =
        fixtures.length === 2 &&
        comparisons.length === 2 &&
        fixtures.every((fixture) => {
          const matches = comparisons.filter((x) => x.fixtureId === fixture.id);
          return (
            matches.length === 1 &&
            matches[0].actualScore === fixture.expected.score &&
            matches[0].actualVerdict === fixture.expected.verdict &&
            matches[0].sourceFingerprint === sourceFingerprint
          );
        });
      const contract: AdmissionsProgramVerificationContract = {
        pairId,
        programId,
        institutionId: 'bgu',
        officialProgramId,
        admissionCycle: '2026-2027',
        source: { targetId: `bgu-${programId}-live`, url: source.url },
        calculation: {
          adapterId: 'bgu',
          mode: 'official_replay',
          formulaFamily: 'bgu_main_campus_social_science_routes',
          requiredInputs: [],
          cutoff: { acceptance: rule.score, rejection: rule.score },
          gates: [
            {
              id: 'score_and_psychometric',
              kind: 'minimum',
              field: 'psychometric_overall',
              minimum: rule.psychometric,
              description: `General score ${rule.score} ${rule.operator.toUpperCase()} psychometric ${rule.psychometric}; psychometric-only ${rule.psychometricOnly}.`,
            },
            {
              id: 'direct',
              kind: 'direct_track',
              field: 'bgu_bagrut_average',
              minimum: rule.bagrut,
              description: `Official BGU Bagrut ${rule.bagrut} or completed recognized BGU prep ${rule.preparatory}.${rule.age45 ? ' Age45+ with recognized Bagrut and Basic English.' : ''}`,
            },
            {
              id: 'language',
              kind: 'language',
              field: 'bgu_social_science_language',
              description: `Basic English; Hebrew ${rule.hebrew} when applicable or exemption.${source.programme === 'education' ? ' September22 Bagrut exception requires English5/80, no classification, Hebrew and an approved second department; Basic English due by end semester1.' : ''}`,
            },
            {
              id: 'programme_requirements',
              kind: 'manual',
              field: 'bgu_social_science_requirements',
              description: `Recognized qualification and applicable second department requirements. Returning students require review.${source.programme === 'social_work' ? ' First priority or second after Youth Social Work; prior studies require updated transcript and committee, prior Social Work average85. Capacity full; waiting list only.' : ''}${source.programme === 'communication' ? ' Admissions reopened August6.' : ''} Discretionary exceptions never imply automatic eligibility.`,
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
          liveComparedAt: verified ? comparisons.at(-1)!.checkedAt : null,
        },
      };
      return [
        pairId,
        {
          contract,
          fixtures,
          ledgerReason:
            'Current main-campus programme mappings and complete route conditions; activation requires matching independent captures and controlled score/verdict comparisons.',
        },
      ];
    }),
  ),
);

export const BGU_SOCIAL_SCIENCE_OFFICIAL_CAPTURES_BY_TARGET_ID = Object.fromEntries(
  Object.values(BGU_SOCIAL_SCIENCE_METADATA_BY_PAIR_ID).map((x) => [
    x.contract.source.targetId,
    x.fixtures.map((fixture) => ({
      captureId: `${fixture.id}:independent`,
      capturedAt: fixture.capturedAt,
      officialUrl: BGU_SOCIAL_SCIENCE_SCORE_URL,
      applicant: {
        psychometric: fixture.input.psychometric,
        bagrutAverage: fixture.input.bagrut,
        extraInputs: {
          bguBagrutAverage: fixture.input.bguBagrutAverage as number,
          bguSocialScienceRoute: 'score' as const,
          bguSocialScienceRequirementsConfirmed: true,
          bguSocialScienceLanguageConfirmed: true,
          bguReturningFromStudyBreak: false,
          bguSocialWorkAcademicBackground: 'none' as const,
        },
      },
      expected: fixture.expected,
    })),
  ]),
);
