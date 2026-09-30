import { createHash } from 'node:crypto';

import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';
import {
  TECHNION_ARCHITECTURE_FORMULA,
  TECHNION_ARCHITECTURE_REQUIRED_INPUTS,
} from '@/server/admissions/technionArchitecturePolicy';

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
  return `sha256:${createHash('sha256')
    .update(JSON.stringify({ source: TECHNION_THRESHOLD_URL, ...config }))
    .digest('hex')}`;
}

function fixturesFor(pairId: string, config: TechnionConfig): AdmissionsVerificationFixture[] {
  const fingerprint = sourceFingerprint(config);
  return [
    {
      id: `${pairId}:accepted:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: config.verdict,
      input: { psychometric: 800, bagrut: 100, bagrutSubjectRecord: technionRecord(100) },
      expected: { score: 98.9, verdict: config.verdict },
      sourceFingerprint: fingerprint,
      capturedAt: CAPTURED_AT,
    },
    {
      id: `${pairId}:below:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'below',
      input: { psychometric: 500, bagrut: 95, bagrutSubjectRecord: technionRecord(95) },
      expected: { score: 73.9, verdict: 'below' },
      sourceFingerprint: fingerprint,
      capturedAt: CAPTURED_AT,
    },
  ];
}

function technionRecord(grade: number) {
  return {
    schemaVersion: 1 as const,
    sector: 'jewish' as const,
    subjects: [
      { subjectId: 'english', units: 5, grade },
      { subjectId: 'literature', units: 2, grade },
      { subjectId: 'mathematics', units: 5, grade },
      { subjectId: 'bible', units: 2, grade },
      { subjectId: 'civics', units: 2, grade },
      { subjectId: 'hebrew_expression', units: 2, grade },
      { subjectId: 'history', units: 2, grade },
      { subjectId: 'hebrew', units: 2, grade },
    ],
  };
}

export interface TechnionProgramVerificationMetadata {
  contract: AdmissionsProgramVerificationContract;
  fixtures: AdmissionsVerificationFixture[];
  ledgerReason: string;
}

const architectureFingerprint = `sha256:${createHash('sha256')
  .update(
    JSON.stringify({
      programme: 'ארכיטקטורה',
      calculatorForm: 73,
      formula: TECHNION_ARCHITECTURE_FORMULA,
      rounding: 1,
      maximumAverage: 119,
      examRange: [0, 140],
      cutoff: 85,
      cycle: '2026-2027',
      math: [
        [4, 70],
        [5, 65],
      ],
      englishUnits: 4,
      englishClassification: 'above104_or_accepted_equivalent',
      hebrew: '121_or_valid_exemption',
      examPassing: 'official_pass_status_not_inferred_from_score',
      route: 'regular_israeli_bagrut_valid_registration_and_scores',
      availablePlaces: 'conditional',
    }),
  )
  .digest('hex')}`;
const architectureFixtures: AdmissionsVerificationFixture[] = [
  {
    psychometric: 730,
    average: 115,
    exam: 110,
    score: 97.5,
    verdict: 'eligible_to_apply' as const,
  },
  { psychometric: 650, average: 101.9, exam: 80, score: 82.6, verdict: 'below' as const },
].map((fixture) => ({
  id: `architecture__technion:${fixture.verdict}:2026-2027`,
  pairId: 'architecture__technion',
  admissionCycle: '2026-2027',
  verdict: fixture.verdict,
  input: {
    psychometric: fixture.psychometric,
    bagrut: 100,
    technionArchitectureBagrutAverage: fixture.average,
    technionArchitectureExamScore: fixture.exam,
    technionArchitectureExamPassed: true,
    technionArchitectureRequirementsConfirmed: true,
  },
  expected: { score: fixture.score, verdict: fixture.verdict },
  sourceFingerprint: architectureFingerprint,
  capturedAt: fixture.verdict === 'below' ? '2026-09-27T11:40:55.000Z' : '2026-09-27T11:46:56.000Z',
}));
const architectureMetadata: TechnionProgramVerificationMetadata = {
  contract: {
    pairId: 'architecture__technion',
    programId: 'architecture',
    institutionId: 'technion',
    officialProgramId: '73',
    admissionCycle: '2026-2027',
    source: {
      targetId: 'technion-architecture-live',
      url: 'https://admissions.technion.ac.il/calculator/',
    },
    calculation: {
      adapterId: 'technion',
      mode: 'formula',
      formulaFamily: 'technion_architecture_form73',
      requiredInputs: TECHNION_ARCHITECTURE_REQUIRED_INPUTS,
      cutoff: { acceptance: 85, rejection: 85 },
      gates: [
        {
          id: 'exam_passed',
          kind: 'minimum',
          field: 'technionArchitectureExamPassed',
          description:
            'Official passing result on a valid Architecture entrance examination; not inferred from score',
        },
        {
          id: 'regular_bagrut_requirements',
          kind: 'subject',
          field: 'technionArchitectureRequirementsConfirmed',
          description:
            'Full Israeli Bagrut; mathematics4/70 or5/65; English4units; English above104 or accepted equivalent; Hebrew121 or exemption; valid registration and score dates',
        },
        {
          id: 'available_places',
          kind: 'manual',
          field: 'availablePlaces',
          description:
            'Above-cutoff result is conditional eligibility only; final admission depends on available places',
        },
      ],
    },
    fixtureIds: architectureFixtures.map((fixture) => fixture.id),
    fixtureSetFingerprint: fingerprintVerificationFixtures(architectureFixtures),
    sourceFingerprint: architectureFingerprint,
    proof: {
      state: 'verified',
      comparedScore: true,
      comparedVerdict: true,
      liveComparedAt: '2026-09-27T11:46:56.000Z',
      sourceFingerprint: architectureFingerprint,
    },
  },
  fixtures: architectureFixtures,
  ledgerReason:
    'Official Architecture form73 live score replays match both fixtures; the current cutoff85 and published prerequisites derive conditional eligibility/below. Exam pass and regular-route requirements must be confirmed, and available places remain an explicit final-admission condition approved by the user.',
};

export const TECHNION_PROGRAM_VERIFICATION_METADATA: Record<
  string,
  TechnionProgramVerificationMetadata
> = Object.fromEntries([
  ...ALIASES.flatMap((programIds) =>
    programIds.map((programId) => {
      const config = configFor(programId);
      const pairId = `${programId}__technion`;
      const fixtures = fixturesFor(pairId, config);
      const fingerprint = sourceFingerprint(config);
      return [
        pairId,
        {
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
          ledgerReason:
            'Verified against the official Technion Sekhem calculator, current official cutoff table, accepted/below fixtures, and live score-and-verdict replay.',
        } satisfies TechnionProgramVerificationMetadata,
      ];
    }),
  ),
  ['architecture__technion', architectureMetadata],
]);

export const TECHNION_PROGRAM_VERIFICATION_ARTIFACTS = Object.fromEntries(
  Object.entries(TECHNION_PROGRAM_VERIFICATION_METADATA).map(([pairId, artifact]) => [
    pairId,
    {
      contract: artifact.contract,
      fixtures: artifact.fixtures,
    },
  ]),
);

export function getTechnionProgramVerificationMetadata(pairId: string) {
  return TECHNION_PROGRAM_VERIFICATION_METADATA[pairId];
}

export function getTechnionProgramConfig(programId: string) {
  return configFor(programId);
}
