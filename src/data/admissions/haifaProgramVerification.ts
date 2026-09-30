import { createHash } from 'node:crypto';
import { HAIFA_PROGRAM_ALIASES } from '@/lib/haifaAdmissionsInputs';
import policyEvidence from './haifaProgrammePolicies.json';
import { getHaifaProgrammePolicy } from '@/server/admissions/haifaProgrammePolicy';

import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
  AdmissionsVerificationGate,
} from '@/types/admissionsEvaluation';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';

export const HAIFA_SOURCE_URL =
  'https://applicants.haifa.ac.il/enrollmentChances/CandChancesServlet';
const CAPTURED_AT = '2026-09-28T06:45:06.973290+00:00';

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
    acceptedScore: 806,
    belowScore: 493,
  },
  {
    programId: 'biology',
    hug: 'SC0006',
    officialProgramId: '52255174',
    acceptance: 640,
    rejection: 619,
    acceptedScore: 806,
    belowScore: 493,
  },
  {
    programId: 'communication',
    hug: 'SC0052',
    officialProgramId: '52253864',
    acceptance: 550,
    rejection: 499,
    acceptedScore: 818,
    belowScore: 493,
  },
  {
    programId: 'cs',
    hug: 'SC0021',
    officialProgramId: '52256544',
    acceptance: 700,
    rejection: 679,
    acceptedScore: 806,
    belowScore: 493,
  },
  {
    programId: 'economics',
    hug: 'SC0017',
    officialProgramId: '52261490',
    acceptance: 660,
    rejection: 639,
    acceptedScore: 806,
    belowScore: 493,
  },
  {
    programId: 'infosystems',
    hug: 'SC0026',
    officialProgramId: '52256686',
    acceptance: 680,
    rejection: 649,
    acceptedScore: 806,
    belowScore: 493,
  },
  {
    programId: 'law',
    hug: 'SC0029',
    officialProgramId: '52255476',
    acceptance: 680,
    rejection: 629,
    acceptedScore: 821,
    belowScore: 492,
  },
  {
    programId: 'math',
    hug: 'SC0030',
    officialProgramId: '52257936',
    acceptance: 610,
    rejection: 579,
    acceptedScore: 806,
    belowScore: 493,
  },
  {
    programId: 'nursing',
    hug: 'SC0034',
    officialProgramId: '52257430',
    acceptance: 580,
    rejection: 569,
    acceptedScore: 818,
    belowScore: 493,
  },
  {
    programId: 'occupational_therapy',
    hug: 'SC0046',
    officialProgramId: '52255365',
    acceptance: 610,
    rejection: 594,
    acceptedScore: 818,
    belowScore: 493,
  },
  {
    programId: 'physiotherapy',
    hug: 'SC0040',
    officialProgramId: '52256372',
    acceptance: 680,
    rejection: 639,
    acceptedScore: 818,
    belowScore: 493,
  },
  {
    programId: 'political_science',
    hug: 'SC0020',
    officialProgramId: '52254686',
    acceptance: 580,
    rejection: 519,
    acceptedScore: 818,
    belowScore: 493,
  },
  {
    programId: 'psychology',
    hug: 'SC0042',
    officialProgramId: '52252391',
    acceptance: 650,
    rejection: 629,
    acceptedScore: 818,
    belowScore: 493,
  },
  {
    programId: 'social_work',
    hug: 'SC0037',
    officialProgramId: '52253943',
    acceptance: 615,
    rejection: 579,
    acceptedScore: 818,
    belowScore: 493,
  },
  {
    programId: 'sociology',
    hug: 'SC0032',
    officialProgramId: '52252907',
    acceptance: 540,
    rejection: 539,
    acceptedScore: 818,
    belowScore: 493,
  },
  {
    programId: 'statistics',
    hug: 'SC0033',
    officialProgramId: '52253965',
    acceptance: 630,
    rejection: 599,
    acceptedScore: 806,
    belowScore: 493,
  },
];

function configFor(programId: string): HaifaProgramConfig {
  const baseId = (programId.startsWith('haifa_') ? programId.slice(6) : programId)
    .replace('politicalscience', 'political_science')
    .replace('socialwork', 'social_work');
  const config = CONFIGS.find((entry) => entry.programId === baseId);
  if (!config) throw new Error(`Missing Haifa verification config for ${programId}`);
  return config;
}

function sourceFingerprint(config: HaifaProgramConfig): string {
  return `sha256:${createHash('sha256')
    .update(
      JSON.stringify({
        config,
        inputPolicy: 'official_average_and_actual_years_v1',
        gatePolicy: 'published_programme_requirements_v1',
        programmePolicy: policyEvidence.records.find(
          (record) => record.programme === config.programId,
        ),
        generalRequirements: policyEvidence.generalRequirements,
        deadlineSource: policyEvidence.deadlineSource,
        additionalSources: policyEvidence.additionalSourceReceipts,
      }),
    )
    .digest('hex')}`;
}

function fixturesFor(pairId: string, config: HaifaProgramConfig): AdmissionsVerificationFixture[] {
  const fingerprint = sourceFingerprint(config);
  const qualifications = {
    haifaAdmissionQualification: 'full_bagrut',
    haifaHebrewQualification: 'hebrew_school',
    haifaPsychometricMonth: 4,
    mathUnits: 5,
    mathGrade: 100,
    haifaScienceUnits: 8,
    haifaOtFailedSelectionAttempts: 0,
    haifaOtUnjustifiedAbsence: false,
  };
  const acceptedInput = {
    ...qualifications,
    psychometric: 800,
    bagrut: 120,
    haifaBagrutAverage: 120,
    haifaBagrutYear: 2026,
    haifaPsychometricYear: 2026,
    psychometricMath: 150,
    psychometricVerbal: 150,
    psychometricEnglish: 150,
  };
  const belowInput = {
    ...qualifications,
    psychometric: 500,
    bagrut: 80,
    haifaBagrutAverage: 80,
    haifaBagrutYear: 2026,
    haifaPsychometricYear: 2026,
    psychometricMath: 100,
    psychometricVerbal: 100,
    psychometricEnglish: 100,
  };
  return [
    {
      id: `${pairId}:accepted:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'eligible_to_apply',
      input: acceptedInput,
      expected: { score: config.acceptedScore, verdict: 'eligible_to_apply' },
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

function programmeGates(programId: string): AdmissionsVerificationGate[] {
  const policy = getHaifaProgrammePolicy(programId)!;
  const gates: AdmissionsVerificationGate[] = [
    {
      id: 'qualification',
      kind: 'minimum',
      field: 'haifaAdmissionQualification',
      description: 'Full Bagrut or officially recognized equivalent.',
    },
    {
      id: 'english',
      kind: 'language',
      field: 'haifaEnglishLevel',
      minimum: policy.english.minimumClassificationScore,
      description:
        'Current official classification, or original psychometric English classification when no later level is supplied.',
    },
    {
      id: 'hebrew',
      kind: 'language',
      field: 'haifaHebrewQualification',
      minimum: policy.hebrew.minimumExamScore,
      description:
        'Programme-specific Hebrew score (Yael/Yaelnet with ten-year validity, or Haifa placement), recognized exemption or qualifying degree-Hebrew course; conditional obligations remain explicit.',
    },
  ];
  if (policy.mathAlternatives.length)
    gates.push({
      id: 'mathematics',
      kind: 'subject',
      field: 'mathUnits/mathGrade',
      description: JSON.stringify(policy.mathAlternatives),
    });
  if (policy.minimumScienceUnits !== undefined)
    gates.push({
      id: 'science_units',
      kind: 'subject',
      field: 'haifaScienceUnits',
      minimum: policy.minimumScienceUnits,
      description:
        'Nursing: maths, physics, chemistry, biology, medical sciences or health sciences.',
    });
  if (policy.minimumPsychometricOverall !== undefined)
    gates.push({
      id: 'psychometric_minimum',
      kind: 'minimum',
      field: 'psychometric',
      minimum: policy.minimumPsychometricOverall,
      description: 'Minimum overall psychometric for Nursing, in addition to the score.',
    });
  if (policy.deadlines?.latestPsychometricSession)
    gates.push({
      id: 'exam_session',
      kind: 'minimum',
      field: 'haifaPsychometricYear/haifaPsychometricMonth',
      description: `Latest ordinary-route psychometric session: ${policy.deadlines.latestPsychometricSession}.`,
    });
  for (const [index, description] of policy.manualStages.entries())
    gates.push({
      id: `selection_${index}`,
      kind: 'manual',
      field: 'department_selection',
      description,
    });
  if (policy.latestHebrewExamSession)
    gates.push({
      id: 'hebrew_session',
      kind: 'language',
      field: 'haifaHebrewExamDate',
      description: `Latest Hebrew exam session: ${policy.latestHebrewExamSession}.`,
    });
  return gates;
}

export const HAIFA_PROGRAM_VERIFICATION_METADATA: Record<string, HaifaProgramVerificationMetadata> =
  Object.fromEntries(
    HAIFA_PROGRAM_ALIASES.flatMap((programIds) =>
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
                  'haifa_bagrut_average',
                  'haifa_bagrut_year',
                  'haifa_psychometric_year',
                ],
                cutoff: { acceptance: config.acceptance, rejection: config.rejection },
                gates: programmeGates(programId),
              },
              fixtureIds: fixtures.map((fixture) => fixture.id),
              fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
              sourceFingerprint: fingerprint,
              proof: {
                state: config.programId === 'infosystems' ? 'blocked' : 'verified',
                comparedScore: true,
                comparedVerdict: config.programId !== 'infosystems',
                liveComparedAt: CAPTURED_AT,
                sourceFingerprint: fingerprint,
              },
            },
            fixtures,
            ledgerReason:
              config.programId === 'infosystems'
                ? 'Current single-major calculator mapping remains unresolved: configured ID absent from the current dictionary. Not eligible for activation.'
                : 'Official numeric replay is combined with current programme-page qualification, maths, language, exam-session and selection requirements. Positive verdict establishes eligibility for the stated route, never final discretionary admission. Fresh matching review is required before production activation.',
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
