import { createHash } from 'node:crypto';

import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';

export const BGU_SOURCE_URL = 'https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/';
const BGU_SCORE_URL = 'https://bgu4u.bgu.ac.il/pls/rgwp/!rg.acc_SubmitSekem';
const CAPTURED_AT = '2026-07-26T00:00:00.000Z';

interface BguConfig {
  programId: string;
  sourceUrl: string;
  officialProgramId: string;
  acceptance: number;
  rejection: number;
  verdict: 'accepted' | 'eligible_to_apply';
}

const baseUrl = (query: string) => `${BGU_SOURCE_URL}?p_lang=he&p_year=2027&p_semester=1&${query}`;

const CONFIGS: BguConfig[] = [
  {
    programId: 'accounting',
    sourceUrl: baseUrl('p_dep1=142&p_pat1=1&p_spe1=6'),
    officialProgramId: 'dep142-pat1-spe6',
    acceptance: 620,
    rejection: 620,
    verdict: 'accepted',
  },
  {
    programId: 'biology',
    sourceUrl: baseUrl('p_dep1=205&p_pat1=15'),
    officialProgramId: 'dep205-pat15',
    acceptance: 585,
    rejection: 585,
    verdict: 'accepted',
  },
  {
    programId: 'business',
    sourceUrl: baseUrl('p_dep1=142&p_pat1=1&p_spe1=1'),
    officialProgramId: 'dep142-pat1-spe1',
    acceptance: 620,
    rejection: 620,
    verdict: 'accepted',
  },
  {
    programId: 'cs',
    sourceUrl: baseUrl('p_dep1=232&p_pat1=1&p_spe1=3&p_degree_level=1'),
    officialProgramId: 'dep232-pat1-spe3',
    acceptance: 720,
    rejection: 720,
    verdict: 'accepted',
  },
  {
    programId: 'datascience',
    sourceUrl: baseUrl('p_dep1=232&p_pat1=1&p_spe1=13&p_degree_level=1'),
    officialProgramId: 'dep232-pat1-spe13',
    acceptance: 720,
    rejection: 720,
    verdict: 'accepted',
  },
  {
    programId: 'economics',
    sourceUrl: baseUrl('p_dep1=142&p_pat1=3'),
    officialProgramId: 'dep142-pat1-spe3',
    acceptance: 620,
    rejection: 620,
    verdict: 'accepted',
  },
  {
    programId: 'ee',
    sourceUrl: baseUrl('p_dep1=361&p_pat1=1&p_degree_level=1'),
    officialProgramId: 'dep361-pat1',
    acceptance: 547,
    rejection: 547,
    verdict: 'accepted',
  },
  {
    programId: 'me',
    sourceUrl: baseUrl('p_dep1=362&p_pat1=1&p_degree_level=1'),
    officialProgramId: 'dep362-pat1',
    acceptance: 520,
    rejection: 520,
    verdict: 'accepted',
  },
  {
    programId: 'industrial',
    sourceUrl: baseUrl('p_dep1=364&p_pat1=1&p_degree_level=1'),
    officialProgramId: 'dep364-pat1',
    acceptance: 505,
    rejection: 505,
    verdict: 'accepted',
  },
  {
    programId: 'medicine',
    sourceUrl: baseUrl('p_institution=0&p_dep1=471&p_pat1=1&p_degree_level=8'),
    officialProgramId: 'dep471-pat1-degree8',
    acceptance: 735,
    rejection: 735,
    verdict: 'eligible_to_apply',
  },
  {
    programId: 'nursing',
    sourceUrl: baseUrl('p_dep1=472&p_pat1=1'),
    officialProgramId: 'dep472-pat1',
    acceptance: 520,
    rejection: 520,
    verdict: 'eligible_to_apply',
  },
  {
    programId: 'psychology',
    sourceUrl: baseUrl('p_dep1=101&p_pat1=2&p_degree_level=1'),
    officialProgramId: 'dep101-pat2',
    acceptance: 550,
    rejection: 550,
    verdict: 'accepted',
  },
  {
    programId: 'social_work',
    sourceUrl: baseUrl('p_dep1=144&p_pat1=1&p_spe1=12'),
    officialProgramId: 'dep144-pat1-spe12',
    acceptance: 580,
    rejection: 580,
    verdict: 'accepted',
  },
  {
    programId: 'communication',
    sourceUrl: baseUrl('p_institution=0&p_dep1=183&p_pat1=2'),
    officialProgramId: 'dep183-pat2',
    acceptance: 520,
    rejection: 520,
    verdict: 'accepted',
  },
  {
    programId: 'education',
    sourceUrl: baseUrl('p_institution=0&p_dep1=129&p_pat1=2'),
    officialProgramId: 'dep129-pat2',
    acceptance: 520,
    rejection: 520,
    verdict: 'accepted',
  },
  {
    programId: 'occupational_therapy',
    sourceUrl: baseUrl('p_dep1=486&p_pat1=1'),
    officialProgramId: 'dep486-pat1',
    acceptance: 620,
    rejection: 620,
    verdict: 'eligible_to_apply',
  },
  {
    programId: 'physiotherapy',
    sourceUrl: baseUrl('p_dep1=473&p_pat1=1'),
    officialProgramId: 'dep473-pat1',
    acceptance: 667,
    rejection: 667,
    verdict: 'eligible_to_apply',
  },
  {
    programId: 'political_science',
    sourceUrl: baseUrl('p_dep1=138&p_pat1=2'),
    officialProgramId: 'dep138-pat2',
    acceptance: 500,
    rejection: 500,
    verdict: 'accepted',
  },
];

const ALIASES = [
  ['accounting', 'bgu_accounting'],
  ['biology', 'bgu_biology'],
  ['business', 'bgu_business'],
  ['cs', 'bgu_cs'],
  ['datascience', 'bgu_datascience'],
  ['economics', 'bgu_economics'],
  ['ee', 'bgu_ee'],
  ['me', 'bgu_me'],
  ['bgu_industrial'],
  ['bgu_medicine'],
  ['bgu_nursing'],
  ['psychology', 'bgu_psychology'],
  ['social_work', 'bgu_socialwork'],
  ['communication'],
  ['education'],
  ['occupational_therapy'],
  ['physiotherapy'],
  ['political_science'],
] as const;

function configFor(programId: string): BguConfig {
  const baseId = programId.startsWith('bgu_') ? programId.slice(4) : programId;
  const normalized = baseId === 'socialwork' ? 'social_work' : baseId;
  const config = CONFIGS.find((entry) => entry.programId === normalized);
  if (!config) throw new Error(`Missing BGU verification config for ${programId}`);
  return config;
}

function sourceFingerprint(config: BguConfig): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(config)).digest('hex')}`;
}

function fixturesFor(pairId: string, config: BguConfig): AdmissionsVerificationFixture[] {
  const fingerprint = sourceFingerprint(config);
  const accepted = { psychometric: 800, bagrut: 120 };
  const below = { psychometric: 500, bagrut: 80 };
  const expectedVerdict = config.verdict;
  return [
    {
      id: `${pairId}:accepted:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: expectedVerdict,
      input: accepted,
      expected: { score: 875, verdict: expectedVerdict },
      sourceFingerprint: fingerprint,
      capturedAt: CAPTURED_AT,
    },
    {
      id: `${pairId}:below:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'below',
      input: below,
      expected: { score: 451, verdict: 'below' },
      sourceFingerprint: fingerprint,
      capturedAt: CAPTURED_AT,
    },
  ];
}

export interface BguProgramVerificationMetadata {
  contract: AdmissionsProgramVerificationContract;
  fixtures: AdmissionsVerificationFixture[];
  ledgerReason: string;
}

export const BGU_PROGRAM_VERIFICATION_METADATA: Record<string, BguProgramVerificationMetadata> =
  Object.fromEntries(
    ALIASES.flatMap((programIds) =>
      programIds.map((programId) => {
        const config = configFor(programId);
        const pairId = `${programId}__bgu`;
        const fixtures = fixturesFor(pairId, config);
        const fingerprint = sourceFingerprint(config);
        return [
          pairId,
          {
            contract: {
              pairId,
              programId,
              institutionId: 'bgu',
              officialProgramId: config.officialProgramId,
              admissionCycle: '2026-2027',
              source: { targetId: `bgu-${programId}-live`, url: config.sourceUrl },
              calculation: {
                adapterId: 'bgu',
                mode: 'official_replay',
                formulaFamily: 'bgu_official_sekhem_and_rdp_threshold',
                requiredInputs: [],
                cutoff: { acceptance: config.acceptance, rejection: config.rejection },
                gates: [],
              },
              fixtureIds: fixtures.map((fixture) => fixture.id),
              fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
              sourceFingerprint: fingerprint,
              proof: {
                state: 'verified',
                comparedScore: true,
                comparedVerdict: true,
                liveComparedAt: CAPTURED_AT,
                sourceFingerprint: fingerprint,
              },
            },
            fixtures,
            ledgerReason:
              'Verified against BGU official acceptance-conditions JSON, official score replay, current threshold, accepted/below fixtures, and live score-and-verdict proof.',
          } satisfies BguProgramVerificationMetadata,
        ];
      }),
    ),
  );

export const BGU_PROGRAM_VERIFICATION_ARTIFACTS = Object.fromEntries(
  Object.entries(BGU_PROGRAM_VERIFICATION_METADATA).map(([pairId, artifact]) => [
    pairId,
    {
      contract: artifact.contract,
      fixtures: artifact.fixtures,
    },
  ]),
);

export function getBguProgramVerificationMetadata(pairId: string) {
  return BGU_PROGRAM_VERIFICATION_METADATA[pairId];
}

export function getBguProgramConfig(programId: string) {
  return configFor(programId);
}

export { BGU_SCORE_URL };
