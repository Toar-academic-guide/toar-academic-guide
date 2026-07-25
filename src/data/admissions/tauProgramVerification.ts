import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';

const SOURCE_FINGERPRINT =
  'sha256:62a6a2f398b737b2139671f32c48a921083a4966ea43e8135c081870d42e9971';
const CAPTURED_AT = '2026-07-25T20:12:07.000Z';

export const TAU_DIGITAL_SCIENCES_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'tau_datascience__tau:accepted:2026-2027',
    pairId: 'tau_datascience__tau',
    admissionCycle: '2026-2027',
    verdict: 'accepted',
    input: {
      psychometric: 680,
      bagrut: 105,
      psychometricEnglish: 110,
      exactSciencesBonusEligible: true,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 80 },
          { subjectId: 'physics', units: 5, grade: 70 },
          { subjectId: 'history', units: 2, grade: 90 },
          { subjectId: 'bible', units: 2, grade: 88 },
        ],
      },
    },
    expected: {
      score: 664,
      verdict: 'accepted',
    },
    sourceFingerprint: SOURCE_FINGERPRINT,
    capturedAt: CAPTURED_AT,
  },
  {
    id: 'tau_datascience__tau:below:2026-2027',
    pairId: 'tau_datascience__tau',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: {
      psychometric: 620,
      bagrut: 100,
      psychometricEnglish: 100,
      exactSciencesBonusEligible: false,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 4, grade: 85 },
          { subjectId: 'history', units: 2, grade: 90 },
          { subjectId: 'bible', units: 2, grade: 88 },
        ],
      },
    },
    expected: {
      score: 598,
      verdict: 'below',
    },
    sourceFingerprint: SOURCE_FINGERPRINT,
    capturedAt: CAPTURED_AT,
  },
];

export const TAU_DIGITAL_SCIENCES_CONTRACT: AdmissionsProgramVerificationContract = {
  pairId: 'tau_datascience__tau',
  programId: 'tau_datascience',
  institutionId: 'tau',
  officialProgramId: '056011050000',
  admissionCycle: '2026-2027',
  source: {
    targetId: 'tau-digital-sciences-live',
    url: 'https://go.tau.ac.il/graphql',
  },
  calculation: {
    adapterId: 'tau',
    mode: 'official_replay',
    formulaFamily: 'tau_hatama_handasa_with_reali10',
    requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
    cutoff: {
      acceptance: 652,
      rejection: 632,
    },
    gates: [
      {
        id: 'tau-digital-sciences:psychometric-minimum',
        kind: 'minimum',
        field: 'psychometric',
        minimum: 620,
        description: 'General psychometric score must be at least 620.',
      },
      {
        id: 'tau-digital-sciences:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU university admission requires at least English level Advanced A.',
      },
      {
        id: 'tau-digital-sciences:mathematics-route',
        kind: 'subject',
        field: 'bagrutSubjectRecord',
        description: 'Mathematics must be 5 units at grade 75+ or 4 units at grade 85+.',
      },
      {
        id: 'tau-digital-sciences:exact-sciences-bonus',
        kind: 'subject',
        field: 'bagrutSubjectRecord',
        minimum: 55,
        description:
          'Add 10 points only when both mathematics and physics are 5 units with grades of at least 55.',
      },
      {
        id: 'tau-digital-sciences:prior-studies',
        kind: 'manual',
        field: 'priorAcademicHistory',
        description:
          'Prior academic study remains subject to the official programme history check.',
      },
    ],
  },
  fixtureIds: TAU_DIGITAL_SCIENCES_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:ea353e9bd5f5185be870124a3e7c0372679fff3ec2d23fd6b330e9ef32a74687',
  sourceFingerprint: SOURCE_FINGERPRINT,
  proof: {
    state: 'verified',
    comparedScore: true,
    comparedVerdict: true,
    liveComparedAt: CAPTURED_AT,
    sourceFingerprint: SOURCE_FINGERPRINT,
  },
};

export interface ProgramVerificationArtifact {
  contract: AdmissionsProgramVerificationContract;
  fixtures: AdmissionsVerificationFixture[];
}

export const PROGRAM_VERIFICATION_ARTIFACTS: Record<string, ProgramVerificationArtifact> = {
  [TAU_DIGITAL_SCIENCES_CONTRACT.pairId]: {
    contract: TAU_DIGITAL_SCIENCES_CONTRACT,
    fixtures: TAU_DIGITAL_SCIENCES_FIXTURES,
  },
};

export function getProgramVerificationArtifact(
  pairId: string,
): ProgramVerificationArtifact | undefined {
  return PROGRAM_VERIFICATION_ARTIFACTS[pairId];
}
