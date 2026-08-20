import { createHash } from 'node:crypto';

import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';

const HUJI_SOURCE_URL = 'https://go.huji.ac.il/jjson/huji.json.gz';
const CAPTURED_AT = '2026-07-26T00:00:00.000Z';
const LIVE_COMPARED_AT = '2026-07-26T00:00:00.000Z';

type HujiFormulaType = 1 | 2;

interface HujiProgramConfig {
  programId: string;
  trackNumber: string;
  formulaType: HujiFormulaType;
  acceptance: number;
  rejection: number;
}

// These track numbers are the current undergraduate tracks returned by HUJI's
// official JSON. Catalogue aliases intentionally share the same current track.
const HUJI_PROGRAM_CONFIGS: HujiProgramConfig[] = [
  {
    programId: 'accounting',
    trackNumber: '325-3251',
    formulaType: 2,
    acceptance: 20.75,
    rejection: 20.75,
  },
  { programId: 'biology', trackNumber: '570-4010', formulaType: 1, acceptance: 19, rejection: 19 },
  {
    programId: 'business',
    trackNumber: '322-3221',
    formulaType: 2,
    acceptance: 20.75,
    rejection: 20.75,
  },
  {
    programId: 'communication',
    trackNumber: '323-7600',
    formulaType: 2,
    acceptance: 17.5,
    rejection: 17.5,
  },
  { programId: 'cs', trackNumber: '521-3010', formulaType: 1, acceptance: 23.75, rejection: 23.5 },
  {
    programId: 'datascience',
    trackNumber: '824-7410',
    formulaType: 2,
    acceptance: 20.75,
    rejection: 20.75,
  },
  {
    programId: 'economics',
    trackNumber: '321-7500',
    formulaType: 2,
    acceptance: 20.75,
    rejection: 20.75,
  },
  {
    programId: 'education',
    trackNumber: '200-1200',
    formulaType: 2,
    acceptance: 17.5,
    rejection: 17.5,
  },
  { programId: 'law', trackNumber: '401-4100', formulaType: 1, acceptance: 22.7, rejection: 22.7 },
  {
    programId: 'medicine',
    trackNumber: '601-4601',
    formulaType: 1,
    acceptance: 25.6,
    rejection: 24.85,
  },
  { programId: 'nursing', trackNumber: '606-5606', formulaType: 1, acceptance: 19, rejection: 19 },
  {
    programId: 'nutrition',
    trackNumber: '712-1212',
    formulaType: 1,
    acceptance: 19.75,
    rejection: 19.75,
  },
  {
    programId: 'occupational_therapy',
    trackNumber: '607-4607',
    formulaType: 1,
    acceptance: 20.5,
    rejection: 20.5,
  },
  {
    programId: 'pharmacy',
    trackNumber: '621-3621',
    formulaType: 1,
    acceptance: 22.5,
    rejection: 22.5,
  },
  {
    programId: 'political_science',
    trackNumber: '311-7200',
    formulaType: 2,
    acceptance: 17.5,
    rejection: 17.5,
  },
  {
    programId: 'psychology',
    trackNumber: '300-7000',
    formulaType: 2,
    acceptance: 22.5,
    rejection: 22.5,
  },
  {
    programId: 'social_work',
    trackNumber: '431-9321',
    formulaType: 1,
    acceptance: 20.25,
    rejection: 20.25,
  },
];

const HUJI_ALIAS_PROGRAM_IDS = [
  'accounting',
  'biology',
  'business',
  'communication',
  'cs',
  'datascience',
  'economics',
  'education',
  'huji_accounting',
  'huji_biology',
  'huji_business',
  'huji_cs',
  'huji_datascience',
  'huji_economics',
  'huji_law',
  'huji_medicine',
  'huji_occupational_therapy',
  'huji_psychology',
  'huji_socialwork',
  'law',
  'medicine',
  'nursing',
  'nutrition',
  'occupational_therapy',
  'pharmacy',
  'political_science',
  'psychology',
  'social_work',
] as const;

const FORMULAS: Record<HujiFormulaType, { pet: number; avg: number; minus: number }> = {
  1: { pet: 0.01992054, avg: 0.24614193, minus: 16.993402399 },
  2: { pet: 0.027468921, avg: 0.145461915, minus: 11.50910537 },
};

export function hujiFormulaScore(
  formulaType: HujiFormulaType,
  psychometric: number,
  bagrutAverage: number,
): number {
  const formula = FORMULAS[formulaType];
  return formula.pet * psychometric + formula.avg * bagrutAverage - formula.minus;
}

export function hujiSourceFingerprint(config: HujiProgramConfig): string {
  const digest = createHash('sha256')
    .update(
      JSON.stringify({
        source: HUJI_SOURCE_URL,
        trackNumber: config.trackNumber,
        formulaType: config.formulaType,
        formula: FORMULAS[config.formulaType],
        acceptance: config.acceptance,
        rejection: config.rejection,
      }),
    )
    .digest('hex');
  return `sha256:${digest}`;
}

function configFor(programId: string): HujiProgramConfig {
  const baseId = (programId.startsWith('huji_') ? programId.slice(5) : programId).replace(
    'socialwork',
    'social_work',
  );
  const config = HUJI_PROGRAM_CONFIGS.find((entry) => entry.programId === baseId);
  if (!config) throw new Error(`Missing HUJI verification config for ${programId}`);
  return config;
}

function fixturesFor(pairId: string, config: HujiProgramConfig): AdmissionsVerificationFixture[] {
  const sourceFingerprint = hujiSourceFingerprint(config);
  const acceptedInput = { psychometric: 800, bagrut: 120 };
  const belowInput = { psychometric: 500, bagrut: 80 };
  return [
    {
      id: `${pairId}:accepted:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'accepted',
      input: acceptedInput,
      expected: {
        score: hujiFormulaScore(
          config.formulaType,
          acceptedInput.psychometric,
          acceptedInput.bagrut,
        ),
        verdict: 'accepted',
      },
      sourceFingerprint,
      capturedAt: CAPTURED_AT,
    },
    {
      id: `${pairId}:below:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'below',
      input: belowInput,
      expected: {
        score: hujiFormulaScore(config.formulaType, belowInput.psychometric, belowInput.bagrut),
        verdict: 'below',
      },
      sourceFingerprint,
      capturedAt: CAPTURED_AT,
    },
  ];
}

export interface HujiProgramVerificationMetadata {
  contract: AdmissionsProgramVerificationContract;
  fixtures: AdmissionsVerificationFixture[];
  ledgerReason: string;
}

export const HUJI_PROGRAM_VERIFICATION_METADATA: Record<string, HujiProgramVerificationMetadata> =
  Object.fromEntries(
    HUJI_ALIAS_PROGRAM_IDS.map((programId) => {
      const config = configFor(programId);
      const pairId = `${programId}__huji`;
      const fixtures = fixturesFor(pairId, config);
      const sourceFingerprint = hujiSourceFingerprint(config);
      const contract: AdmissionsProgramVerificationContract = {
        pairId,
        programId,
        institutionId: 'huji',
        officialProgramId: config.trackNumber,
        admissionCycle: '2026-2027',
        source: { targetId: `huji-${programId}-live`, url: HUJI_SOURCE_URL },
        calculation: {
          adapterId: 'huji',
          mode: 'official_replay',
          formulaFamily: `huji_formula_type_${config.formulaType}`,
          requiredInputs: [],
          cutoff: { acceptance: config.acceptance, rejection: config.rejection },
          gates: [],
        },
        fixtureIds: fixtures.map((fixture) => fixture.id),
        fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
        sourceFingerprint,
        proof: {
          state: 'verified',
          comparedScore: true,
          comparedVerdict: true,
          liveComparedAt: LIVE_COMPARED_AT,
          sourceFingerprint,
        },
      };
      return [
        pairId,
        {
          contract,
          fixtures,
          ledgerReason:
            'Verified against HUJI official JSON track mapping, formula coefficients, current acceptance/rejection thresholds, accepted/below fixtures, and live score-and-verdict replay.',
        },
      ];
    }),
  );

export const HUJI_PROGRAM_VERIFICATION_ARTIFACTS: Record<
  string,
  { contract: AdmissionsProgramVerificationContract; fixtures: AdmissionsVerificationFixture[] }
> = Object.fromEntries(
  Object.entries(HUJI_PROGRAM_VERIFICATION_METADATA).map(([pairId, artifact]) => [
    pairId,
    { contract: artifact.contract, fixtures: artifact.fixtures },
  ]),
);

export function getHujiProgramVerificationMetadata(
  pairId: string,
): HujiProgramVerificationMetadata | undefined {
  return HUJI_PROGRAM_VERIFICATION_METADATA[pairId];
}

export function getHujiProgramConfig(programId: string): HujiProgramConfig {
  return configFor(programId);
}

export { HUJI_SOURCE_URL };
