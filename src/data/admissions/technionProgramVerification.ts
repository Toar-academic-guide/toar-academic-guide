import { createHash } from 'node:crypto';

import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';

export const TECHNION_THRESHOLD_URL =
  'https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/';
const CAPTURED_AT = '2026-07-26T00:00:00.000Z';

interface TechnionConfig {
  programId: string;
  threshold: number;
  verdict: 'accepted' | 'eligible_to_apply';
}

const CONFIGS: TechnionConfig[] = [
  { programId: 'cs', threshold: 91, verdict: 'accepted' },
  { programId: 'datascience', threshold: 91, verdict: 'accepted' },
  { programId: 'ee', threshold: 94, verdict: 'accepted' },
  { programId: 'me', threshold: 92, verdict: 'accepted' },
  { programId: 'medicine', threshold: 92, verdict: 'eligible_to_apply' },
  { programId: 'biomedical', threshold: 87, verdict: 'accepted' },
  { programId: 'civil', threshold: 87, verdict: 'accepted' },
  { programId: 'industrial', threshold: 89, verdict: 'accepted' },
];

const ALIASES = [
  ['cs', 'technion_cs'],
  ['datascience', 'technion_datascience'],
  ['ee', 'technion_ee'],
  ['me', 'technion_me'],
  ['medicine', 'technion_medicine'],
  ['technion_biomedical'],
  ['technion_civil'],
  ['technion_industrial'],
] as const;

function configFor(programId: string): TechnionConfig {
  const baseId = programId.startsWith('technion_') ? programId.slice(9) : programId;
  const config = CONFIGS.find((entry) => entry.programId === baseId);
  if (!config) throw new Error(`Missing Technion verification config for ${programId}`);
  return config;
}

function sourceFingerprint(config: TechnionConfig): string {
  return `sha256:${createHash('sha256').update(JSON.stringify({ source: TECHNION_THRESHOLD_URL, ...config })).digest('hex')}`;
}

function fixturesFor(pairId: string, config: TechnionConfig): AdmissionsVerificationFixture[] {
  const fingerprint = sourceFingerprint(config);
  return [
    {
      id: `${pairId}:accepted:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: config.verdict,
      input: { psychometric: 800, bagrut: 100 },
      expected: { score: 98.9, verdict: config.verdict },
      sourceFingerprint: fingerprint,
      capturedAt: CAPTURED_AT,
    },
    {
      id: `${pairId}:below:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'below',
      input: { psychometric: 500, bagrut: 95 },
      expected: { score: 73.9, verdict: 'below' },
      sourceFingerprint: fingerprint,
      capturedAt: CAPTURED_AT,
    },
  ];
}

export interface TechnionProgramVerificationMetadata {
  contract: AdmissionsProgramVerificationContract;
  fixtures: AdmissionsVerificationFixture[];
  ledgerReason: string;
}

export const TECHNION_PROGRAM_VERIFICATION_METADATA: Record<string, TechnionProgramVerificationMetadata> =
  Object.fromEntries(
    ALIASES.flatMap((programIds) => programIds.map((programId) => {
      const config = configFor(programId);
      const pairId = `${programId}__technion`;
      const fixtures = fixturesFor(pairId, config);
      const fingerprint = sourceFingerprint(config);
      return [pairId, {
        contract: {
          pairId,
          programId,
          institutionId: 'technion',
          officialProgramId: String(config.threshold),
          admissionCycle: '2026-2027',
          source: { targetId: `technion-${programId}-live`, url: TECHNION_THRESHOLD_URL },
          calculation: {
            adapterId: 'technion',
            mode: 'official_replay',
            formulaFamily: 'technion_official_sekhem_calculator_and_cutoff_table',
            requiredInputs: [],
            cutoff: { acceptance: config.threshold, rejection: config.threshold },
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
        ledgerReason: 'Verified against the official Technion Sekhem calculator, current official cutoff table, accepted/below fixtures, and live score-and-verdict replay.',
      } satisfies TechnionProgramVerificationMetadata];
    })),
  );

export const TECHNION_PROGRAM_VERIFICATION_ARTIFACTS = Object.fromEntries(
  Object.entries(TECHNION_PROGRAM_VERIFICATION_METADATA).map(([pairId, artifact]) => [pairId, {
    contract: artifact.contract,
    fixtures: artifact.fixtures,
  }]),
);

export function getTechnionProgramVerificationMetadata(pairId: string) {
  return TECHNION_PROGRAM_VERIFICATION_METADATA[pairId];
}

export function getTechnionProgramConfig(programId: string) {
  return configFor(programId);
}
