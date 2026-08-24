import { createHash } from 'node:crypto';

import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';

export const HAIFA_SOURCE_URL =
  'https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet';
const CAPTURED_AT = '2026-07-26T00:00:00.000Z';

interface HaifaProgramConfig {
  programId: string;
  hug: string;
  officialProgramId: string;
  acceptance: number;
  rejection: number;
  acceptedScore: number;
  belowScore: number;
}

const CONFIGS: HaifaProgramConfig[] = [
  {
    programId: 'accounting',
    hug: 'SC0017',
    officialProgramId: '52261493',
    acceptance: 680,
    rejection: 659,
    acceptedScore: 848,
    belowScore: 493,
  },
  {
    programId: 'biology',
    hug: 'SC0006',
    officialProgramId: '52255174',
    acceptance: 640,
    rejection: 619,
    acceptedScore: 848,
    belowScore: 493,
  },
  {
    programId: 'communication',
    hug: 'SC0052',
    officialProgramId: '52253864',
    acceptance: 550,
    rejection: 499,
    acceptedScore: 881,
    belowScore: 493,
  },
  {
    programId: 'cs',
    hug: 'SC0021',
    officialProgramId: '52256544',
    acceptance: 700,
    rejection: 679,
    acceptedScore: 848,
    belowScore: 493,
  },
  {
    programId: 'economics',
    hug: 'SC0017',
    officialProgramId: '52261490',
    acceptance: 660,
    rejection: 639,
    acceptedScore: 848,
    belowScore: 493,
  },
  {
    programId: 'infosystems',
    hug: 'SC0026',
    officialProgramId: '52256686',
    acceptance: 680,
    rejection: 649,
    acceptedScore: 848,
    belowScore: 493,
  },
  {
    programId: 'law',
    hug: 'SC0029',
    officialProgramId: '52255476',
    acceptance: 680,
    rejection: 629,
    acceptedScore: 881,
    belowScore: 492,
  },
  {
    programId: 'math',
    hug: 'SC0030',
    officialProgramId: '52257936',
    acceptance: 610,
    rejection: 579,
    acceptedScore: 848,
    belowScore: 493,
  },
  {
    programId: 'nursing',
    hug: 'SC0034',
    officialProgramId: '52257430',
    acceptance: 580,
    rejection: 569,
    acceptedScore: 881,
    belowScore: 493,
  },
  {
    programId: 'occupational_therapy',
    hug: 'SC0046',
    officialProgramId: '52255365',
    acceptance: 610,
    rejection: 594,
    acceptedScore: 881,
    belowScore: 493,
  },
  {
    programId: 'physiotherapy',
    hug: 'SC0040',
    officialProgramId: '52256372',
    acceptance: 680,
    rejection: 639,
    acceptedScore: 881,
    belowScore: 493,
  },
  {
    programId: 'political_science',
    hug: 'SC0020',
    officialProgramId: '52254686',
    acceptance: 580,
    rejection: 519,
    acceptedScore: 881,
    belowScore: 493,
  },
  {
    programId: 'psychology',
    hug: 'SC0042',
    officialProgramId: '52252391',
    acceptance: 650,
    rejection: 629,
    acceptedScore: 881,
    belowScore: 493,
  },
  {
    programId: 'social_work',
    hug: 'SC0037',
    officialProgramId: '52253943',
    acceptance: 615,
    rejection: 579,
    acceptedScore: 881,
    belowScore: 493,
  },
  {
    programId: 'sociology',
    hug: 'SC0032',
    officialProgramId: '52252907',
    acceptance: 540,
    rejection: 539,
    acceptedScore: 881,
    belowScore: 493,
  },
  {
    programId: 'statistics',
    hug: 'SC0033',
    officialProgramId: '52253965',
    acceptance: 630,
    rejection: 599,
    acceptedScore: 848,
    belowScore: 493,
  },
];

const ALIASES = [
  ['accounting', 'haifa_accounting'],
  ['biology', 'haifa_biology'],
  ['communication', 'haifa_communication'],
  ['cs', 'haifa_cs'],
  ['economics', 'haifa_economics'],
  ['haifa_infosystems'],
  ['law', 'haifa_law'],
  ['haifa_math'],
  ['nursing', 'haifa_nursing'],
  ['occupational_therapy'],
  ['physiotherapy', 'haifa_physiotherapy'],
  ['political_science', 'haifa_politicalscience'],
  ['psychology', 'haifa_psychology'],
  ['social_work', 'haifa_socialwork'],
  ['haifa_sociology'],
  ['haifa_statistics'],
] as const;

function configFor(programId: string): HaifaProgramConfig {
  const baseId = (programId.startsWith('haifa_') ? programId.slice(6) : programId)
    .replace('politicalscience', 'political_science')
    .replace('socialwork', 'social_work');
  const config = CONFIGS.find((entry) => entry.programId === baseId);
  if (!config) throw new Error(`Missing Haifa verification config for ${programId}`);
  return config;
}

function sourceFingerprint(config: HaifaProgramConfig): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(config)).digest('hex')}`;
}

function fixturesFor(pairId: string, config: HaifaProgramConfig): AdmissionsVerificationFixture[] {
  const fingerprint = sourceFingerprint(config);
  const acceptedInput = {
    psychometric: 800,
    bagrut: 120,
    psychometricMath: 160,
    psychometricVerbal: 160,
    psychometricEnglish: 160,
  };
  const belowInput = {
    psychometric: 500,
    bagrut: 80,
    psychometricMath: 100,
    psychometricVerbal: 100,
    psychometricEnglish: 100,
  };
  return [
    {
      id: `${pairId}:accepted:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'accepted',
      input: acceptedInput,
      expected: { score: config.acceptedScore, verdict: 'accepted' },
      sourceFingerprint: fingerprint,
      capturedAt: CAPTURED_AT,
    },
    {
      id: `${pairId}:below:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'below',
      input: belowInput,
      expected: { score: config.belowScore, verdict: 'below' },
      sourceFingerprint: fingerprint,
      capturedAt: CAPTURED_AT,
    },
  ];
}

export interface HaifaProgramVerificationMetadata {
  contract: AdmissionsProgramVerificationContract;
  fixtures: AdmissionsVerificationFixture[];
  ledgerReason: string;
}

export const HAIFA_PROGRAM_VERIFICATION_METADATA: Record<string, HaifaProgramVerificationMetadata> =
  Object.fromEntries(
    ALIASES.flatMap((programIds) =>
      programIds.map((programId) => {
        const config = configFor(programId);
        const pairId = `${programId}__haifa`;
        const fixtures = fixturesFor(pairId, config);
        const fingerprint = sourceFingerprint(config);
        return [
          pairId,
          {
            contract: {
              pairId,
              programId,
              institutionId: 'haifa',
              officialProgramId: config.officialProgramId,
              admissionCycle: '2026-2027',
              source: { targetId: `haifa-${programId}-live`, url: HAIFA_SOURCE_URL },
              calculation: {
                adapterId: 'haifa',
                mode: 'official_replay',
                formulaFamily: 'haifa_official_calculator',
                requiredInputs: [
                  'psychometric_math',
                  'psychometric_verbal',
                  'psychometric_english',
                ],
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
              'Verified against the current University of Haifa enrollment-chances calculator program mapping, score, acceptance/rejection cutoffs, accepted/below fixtures, and live score-and-verdict proof.',
          } satisfies HaifaProgramVerificationMetadata,
        ];
      }),
    ),
  );

export const HAIFA_PROGRAM_VERIFICATION_ARTIFACTS = Object.fromEntries(
  Object.entries(HAIFA_PROGRAM_VERIFICATION_METADATA).map(([pairId, artifact]) => [
    pairId,
    { contract: artifact.contract, fixtures: artifact.fixtures },
  ]),
);

export function getHaifaProgramVerificationMetadata(pairId: string) {
  return HAIFA_PROGRAM_VERIFICATION_METADATA[pairId];
}

export function getHaifaProgramConfig(programId: string) {
  return configFor(programId);
}
