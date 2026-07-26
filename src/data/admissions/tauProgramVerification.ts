import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';
import { HUJI_PROGRAM_VERIFICATION_ARTIFACTS } from './hujiProgramVerification';
import { BGU_PROGRAM_VERIFICATION_ARTIFACTS } from './bguProgramVerification';
import { TECHNION_PROGRAM_VERIFICATION_ARTIFACTS } from './technionProgramVerification';
import { HAIFA_PROGRAM_VERIFICATION_ARTIFACTS } from './haifaProgramVerification';
import { MANUAL_PROGRAM_VERIFICATION_ARTIFACTS } from './manualProgramVerification';

const SOURCE_FINGERPRINT =
  'sha256:62a6a2f398b737b2139671f32c48a921083a4966ea43e8135c081870d42e9971';
const FIXTURE_CAPTURED_AT = '2026-07-25T20:12:07.000Z';
const LIVE_COMPARED_AT = '2026-07-25T20:22:40.576Z';
export const TAU_DIGITAL_SCIENCES_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/engineering/ba/high-tech-plus?v=admission-requirements';
export const TAU_NURSING_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/med/ba/nursing?v=admission-requirements';
export const TAU_PSYCHOLOGY_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/social-sciences/ba/psychology?v=admission-requirements';
export const TAU_SOCIAL_WORK_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/social-sciences/ba/social-work?v=admission-requirements';
export const TAU_LAW_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/law/ba/law?v=admission-requirements';
export const TAU_ACCOUNTING_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/management/ba/accounting?v=admission-requirements';
export const TAU_ARCHITECTURE_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/engineering/ba/architecture?v=admission-requirements';

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
    capturedAt: FIXTURE_CAPTURED_AT,
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
    capturedAt: FIXTURE_CAPTURED_AT,
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
    liveComparedAt: LIVE_COMPARED_AT,
    sourceFingerprint: SOURCE_FINGERPRINT,
  },
};

const TAU_NURSING_SOURCE_FINGERPRINT =
  'sha256:724371d9ec8e64416be17fabae91ff1b20ad587c032b317e56bafa3e539348b9';
const TAU_NURSING_CAPTURED_AT = '2026-07-25T20:30:39.000Z';
const TAU_NURSING_LIVE_COMPARED_AT = '2026-07-25T20:38:27.543Z';

export const TAU_NURSING_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'nursing__tau:eligible-to-apply:2026-2027',
    pairId: 'nursing__tau',
    admissionCycle: '2026-2027',
    verdict: 'eligible_to_apply',
    input: {
      psychometric: 520,
      bagrut: 100,
      psychometricEnglish: 110,
    },
    expected: {
      score: 546,
      verdict: 'eligible_to_apply',
    },
    sourceFingerprint: TAU_NURSING_SOURCE_FINGERPRINT,
    capturedAt: TAU_NURSING_CAPTURED_AT,
  },
  {
    id: 'nursing__tau:below:2026-2027',
    pairId: 'nursing__tau',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: {
      psychometric: 520,
      bagrut: 90,
      psychometricEnglish: 110,
    },
    expected: {
      score: 496,
      verdict: 'below',
    },
    sourceFingerprint: TAU_NURSING_SOURCE_FINGERPRINT,
    capturedAt: TAU_NURSING_CAPTURED_AT,
  },
];

export const TAU_NURSING_CONTRACT: AdmissionsProgramVerificationContract = {
  pairId: 'nursing__tau',
  programId: 'nursing',
  institutionId: 'tau',
  officialProgramId: '016211010000',
  admissionCycle: '2026-2027',
  source: {
    targetId: 'tau-nursing-live',
    url: 'https://go.tau.ac.il/graphql',
  },
  calculation: {
    adapterId: 'tau',
    mode: 'official_replay',
    formulaFamily: 'tau_hatama_with_manual_suitability',
    requiredInputs: ['psychometric_english'],
    cutoff: {
      acceptance: 530,
      rejection: 520,
    },
    gates: [
      {
        id: 'tau-nursing:psychometric-minimum',
        kind: 'minimum',
        field: 'psychometric',
        minimum: 520,
        description: 'Psychometric score must be at least 520 for the score route.',
      },
      {
        id: 'tau-nursing:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-nursing:suitability-assessment',
        kind: 'manual',
        field: 'suitabilityAssessment',
        description:
          'Every candidate must complete the therapeutic-profession suitability assessment.',
      },
      {
        id: 'tau-nursing:possible-interview',
        kind: 'manual',
        field: 'interview',
        description: 'The admissions committee may invite the candidate to a personal interview.',
      },
      {
        id: 'tau-nursing:prior-study-history',
        kind: 'manual',
        field: 'priorAcademicHistory',
        description:
          'Previous Nursing study must not have ended for academic or disciplinary reasons.',
      },
    ],
  },
  fixtureIds: TAU_NURSING_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:24825838e34c0a91cbe7b6e68f010768221159ada9f4ac218480d1b40d82596c',
  sourceFingerprint: TAU_NURSING_SOURCE_FINGERPRINT,
  proof: {
    state: 'verified',
    comparedScore: true,
    comparedVerdict: true,
    liveComparedAt: TAU_NURSING_LIVE_COMPARED_AT,
    sourceFingerprint: TAU_NURSING_SOURCE_FINGERPRINT,
  },
};

const TAU_MEDICINE_SOURCE_FINGERPRINT =
  'sha256:e7fd95005004c24802c77d50a8c5d422d4dcd65fdfadf055178181025a548cbd';
const TAU_MEDICINE_CAPTURED_AT = '2026-07-26T07:20:00.000Z';

export const TAU_MEDICINE_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'medicine__tau:eligible-to-apply:2026-2027',
    pairId: 'medicine__tau',
    admissionCycle: '2026-2027',
    verdict: 'eligible_to_apply',
    input: {
      psychometric: 760,
      bagrut: 115,
      psychometricEnglish: 130,
      mathUnits: 4,
      mathGrade: 70,
    },
    expected: {
      score: 745.43,
      verdict: 'eligible_to_apply',
    },
    sourceFingerprint: TAU_MEDICINE_SOURCE_FINGERPRINT,
    capturedAt: TAU_MEDICINE_CAPTURED_AT,
  },
  {
    id: 'medicine__tau:below:2026-2027',
    pairId: 'medicine__tau',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: {
      psychometric: 680,
      bagrut: 100,
      psychometricEnglish: 130,
      mathUnits: 4,
      mathGrade: 70,
    },
    expected: {
      score: 628.79,
      verdict: 'below',
    },
    sourceFingerprint: TAU_MEDICINE_SOURCE_FINGERPRINT,
    capturedAt: TAU_MEDICINE_CAPTURED_AT,
  },
];

export const TAU_MEDICINE_CONTRACT: AdmissionsProgramVerificationContract = {
  pairId: 'medicine__tau',
  programId: 'medicine',
  institutionId: 'tau',
  officialProgramId: '011167010000',
  admissionCycle: '2026-2027',
  source: {
    targetId: 'tau-medicine-live',
    url: 'https://go.tau.ac.il/graphql',
  },
  calculation: {
    adapterId: 'tau',
    mode: 'official_replay',
    formulaFamily: 'tau_hatama_medical_preliminary',
    requiredInputs: ['psychometric_english', 'math_units', 'math_grade'],
    cutoff: {
      acceptance: 726.44,
      rejection: null,
    },
    gates: [
      {
        id: 'tau-medicine:psychometric-minimum',
        kind: 'minimum',
        field: 'psychometric',
        minimum: 700,
        description: 'Psychometric score must be at least 700 to apply to TAU medicine.',
      },
      {
        id: 'tau-medicine:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 120,
        description: 'TAU medicine requires English level 120 or higher.',
      },
      {
        id: 'tau-medicine:mathematics-minimum',
        kind: 'subject',
        field: 'mathUnits',
        minimum: 4,
        description: 'TAU medicine requires passing mathematics at four units or higher.',
      },
      {
        id: 'tau-medicine:non-cognitive-stage',
        kind: 'manual',
        field: 'nonCognitiveAssessment',
        description:
          'The numeric threshold only qualifies an applicant for the non-cognitive selection stage; it is not final admission.',
      },
    ],
  },
  fixtureIds: TAU_MEDICINE_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: fingerprintVerificationFixtures(TAU_MEDICINE_FIXTURES),
  sourceFingerprint: TAU_MEDICINE_SOURCE_FINGERPRINT,
  proof: {
    state: 'verified',
    comparedScore: true,
    comparedVerdict: true,
    liveComparedAt: TAU_MEDICINE_CAPTURED_AT,
    sourceFingerprint: TAU_MEDICINE_SOURCE_FINGERPRINT,
  },
};

export const TAU_LEGACY_MEDICINE_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_MEDICINE_FIXTURES.map((fixture) => ({
    ...fixture,
    id: fixture.id.replace('medicine__tau', 'tau_medicine__tau'),
    pairId: 'tau_medicine__tau',
  }));

export const TAU_LEGACY_MEDICINE_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_MEDICINE_CONTRACT,
  pairId: 'tau_medicine__tau',
  programId: 'tau_medicine',
  source: { ...TAU_MEDICINE_CONTRACT.source, targetId: 'tau-medicine-legacy-live' },
  fixtureIds: TAU_LEGACY_MEDICINE_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: fingerprintVerificationFixtures(TAU_LEGACY_MEDICINE_FIXTURES),
};

const TAU_PHYSIOTHERAPY_SOURCE_FINGERPRINT =
  'sha256:5f289a01703300c51a4d38eb8267186b72571895f8d4584933154a2adda4bb83';
const TAU_PHYSIOTHERAPY_CAPTURED_AT = '2026-07-26T07:35:00.000Z';
export const TAU_PHYSIOTHERAPY_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/med/ba/phys?v=important-info';

export const TAU_PHYSIOTHERAPY_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'physiotherapy__tau:eligible-to-apply:2026-2027',
    pairId: 'physiotherapy__tau',
    admissionCycle: '2026-2027',
    verdict: 'eligible_to_apply',
    input: {
      psychometric: 700,
      bagrut: 110,
      psychometricEnglish: 130,
    },
    expected: { score: 689.22, verdict: 'eligible_to_apply' },
    sourceFingerprint: TAU_PHYSIOTHERAPY_SOURCE_FINGERPRINT,
    capturedAt: TAU_PHYSIOTHERAPY_CAPTURED_AT,
  },
  {
    id: 'physiotherapy__tau:below:2026-2027',
    pairId: 'physiotherapy__tau',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: {
      psychometric: 700,
      bagrut: 100,
      psychometricEnglish: 130,
    },
    expected: { score: 639.19, verdict: 'below' },
    sourceFingerprint: TAU_PHYSIOTHERAPY_SOURCE_FINGERPRINT,
    capturedAt: TAU_PHYSIOTHERAPY_CAPTURED_AT,
  },
];

export const TAU_PHYSIOTHERAPY_CONTRACT: AdmissionsProgramVerificationContract = {
  pairId: 'physiotherapy__tau',
  programId: 'physiotherapy',
  institutionId: 'tau',
  officialProgramId: '016411010000',
  admissionCycle: '2026-2027',
  source: { targetId: 'tau-physiotherapy-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    adapterId: 'tau',
    mode: 'official_replay',
    formulaFamily: 'tau_hatama_with_manual_interview',
    requiredInputs: ['psychometric_english'],
    cutoff: { acceptance: 664.92, rejection: 640 },
    gates: [
      {
        id: 'tau-physiotherapy:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-physiotherapy:personal-interview',
        kind: 'manual',
        field: 'interview',
        description:
          'The published score is a route to the personal interview; final admission remains based on the interview and suitability ranking.',
      },
    ],
  },
  fixtureIds: TAU_PHYSIOTHERAPY_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: fingerprintVerificationFixtures(TAU_PHYSIOTHERAPY_FIXTURES),
  sourceFingerprint: TAU_PHYSIOTHERAPY_SOURCE_FINGERPRINT,
  proof: {
    state: 'verified',
    comparedScore: true,
    comparedVerdict: true,
    liveComparedAt: TAU_PHYSIOTHERAPY_CAPTURED_AT,
    sourceFingerprint: TAU_PHYSIOTHERAPY_SOURCE_FINGERPRINT,
  },
};

const TAU_INFORMATION_SYSTEMS_SOURCE_FINGERPRINT =
  'sha256:7d9abc718b0ec303e17e802278649728a7eec5faa3569e3bd4a9510aa6e6c8a3';
const TAU_INFORMATION_SYSTEMS_CAPTURED_AT = '2026-07-26T08:10:00.000Z';
export const TAU_INFORMATION_SYSTEMS_REQUIREMENTS_URL =
  'https://go.tau.ac.il/he/management/ba/management?v=requirements';

export const TAU_INFORMATION_SYSTEMS_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'tau_infosystems__tau:accepted:2026-2027',
    pairId: 'tau_infosystems__tau',
    admissionCycle: '2026-2027',
    verdict: 'accepted',
    input: { psychometric: 700, bagrut: 110 },
    expected: { score: 691, verdict: 'accepted' },
    sourceFingerprint: TAU_INFORMATION_SYSTEMS_SOURCE_FINGERPRINT,
    capturedAt: TAU_INFORMATION_SYSTEMS_CAPTURED_AT,
  },
  {
    id: 'tau_infosystems__tau:below:2026-2027',
    pairId: 'tau_infosystems__tau',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: { psychometric: 600, bagrut: 100 },
    expected: { score: 592, verdict: 'below' },
    sourceFingerprint: TAU_INFORMATION_SYSTEMS_SOURCE_FINGERPRINT,
    capturedAt: TAU_INFORMATION_SYSTEMS_CAPTURED_AT,
  },
];

export const TAU_INFORMATION_SYSTEMS_CONTRACT: AdmissionsProgramVerificationContract = {
  pairId: 'tau_infosystems__tau',
  programId: 'tau_infosystems',
  institutionId: 'tau',
  officialProgramId: '122111050000',
  admissionCycle: '2026-2027',
  source: { targetId: 'tau-information-systems-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    adapterId: 'tau',
    mode: 'official_replay',
    formulaFamily: 'tau_hatama_management_current_information_systems_route',
    requiredInputs: [],
    cutoff: { acceptance: 610, rejection: 609 },
    gates: [
      {
        id: 'tau-information-systems:current-route-alias',
        kind: 'manual',
        field: 'currentManagementRoute',
        description:
          'The current TAU catalogue publishes this route as the Management degree, which includes information-systems coursework; the legacy catalogue label is retained as an alias.',
      },
    ],
  },
  fixtureIds: TAU_INFORMATION_SYSTEMS_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: fingerprintVerificationFixtures(TAU_INFORMATION_SYSTEMS_FIXTURES),
  sourceFingerprint: TAU_INFORMATION_SYSTEMS_SOURCE_FINGERPRINT,
  proof: {
    state: 'verified',
    comparedScore: true,
    comparedVerdict: true,
    liveComparedAt: TAU_INFORMATION_SYSTEMS_CAPTURED_AT,
    sourceFingerprint: TAU_INFORMATION_SYSTEMS_SOURCE_FINGERPRINT,
  },
};

const TAU_PSYCHOLOGY_SOURCE_FINGERPRINT =
  'sha256:22e53cbeca846bffb02a0993384180ca8c47a4b5035a3d82304c7a449a7779ca';
const TAU_PSYCHOLOGY_CAPTURED_AT = '2026-07-25T20:47:06.248Z';
const TAU_PSYCHOLOGY_LIVE_COMPARED_AT = '2026-07-25T20:52:12.799Z';

export const TAU_PSYCHOLOGY_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'tau_psychology__tau:accepted:2026-2027',
    pairId: 'tau_psychology__tau',
    admissionCycle: '2026-2027',
    verdict: 'accepted',
    input: {
      psychometric: 680,
      bagrut: 110,
      psychometricEnglish: 110,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 82 },
          { subjectId: 'english', units: 5, grade: 90 },
          { subjectId: 'history', units: 2, grade: 92 },
          { subjectId: 'bible', units: 2, grade: 88 },
        ],
      },
    },
    expected: {
      score: 679,
      verdict: 'accepted',
    },
    sourceFingerprint: TAU_PSYCHOLOGY_SOURCE_FINGERPRINT,
    capturedAt: TAU_PSYCHOLOGY_CAPTURED_AT,
  },
  {
    id: 'tau_psychology__tau:below:2026-2027',
    pairId: 'tau_psychology__tau',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: {
      psychometric: 680,
      bagrut: 105,
      psychometricEnglish: 110,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 4, grade: 80 },
          { subjectId: 'english', units: 5, grade: 88 },
          { subjectId: 'history', units: 2, grade: 90 },
          { subjectId: 'bible', units: 2, grade: 86 },
        ],
      },
    },
    expected: {
      score: 654,
      verdict: 'below',
    },
    sourceFingerprint: TAU_PSYCHOLOGY_SOURCE_FINGERPRINT,
    capturedAt: TAU_PSYCHOLOGY_CAPTURED_AT,
  },
];

export const TAU_PSYCHOLOGY_CONTRACT: AdmissionsProgramVerificationContract = {
  pairId: 'tau_psychology__tau',
  programId: 'tau_psychology',
  institutionId: 'tau',
  officialProgramId: '107111050000',
  admissionCycle: '2026-2027',
  source: {
    targetId: 'tau-psychology-live',
    url: 'https://go.tau.ac.il/graphql',
  },
  calculation: {
    adapterId: 'tau',
    mode: 'official_replay',
    formulaFamily: 'tau_hatama',
    requiredInputs: ['psychometric_english'],
    cutoff: {
      acceptance: 660,
      rejection: 659,
    },
    gates: [
      {
        id: 'tau-psychology:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
    ],
  },
  fixtureIds: TAU_PSYCHOLOGY_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:3861406b343786992b2fb3e922254a266cda96b1351bfce86db80121fe87a8f7',
  sourceFingerprint: TAU_PSYCHOLOGY_SOURCE_FINGERPRINT,
  proof: {
    state: 'verified',
    comparedScore: true,
    comparedVerdict: true,
    liveComparedAt: TAU_PSYCHOLOGY_LIVE_COMPARED_AT,
    sourceFingerprint: TAU_PSYCHOLOGY_SOURCE_FINGERPRINT,
  },
};

const TAU_SOCIAL_WORK_SOURCE_FINGERPRINT =
  'sha256:b6009b7b44e677b42fd1e23a8bdd2c6ba690c80f82c0ec7831f44550ec02db14';
const TAU_SOCIAL_WORK_CAPTURED_AT = '2026-07-25T21:41:00.000Z';
const TAU_SOCIAL_WORK_LIVE_COMPARED_AT = '2026-07-25T21:42:10.000Z';

export const TAU_SOCIAL_WORK_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'social_work__tau:accepted:2026-2027',
    pairId: 'social_work__tau',
    admissionCycle: '2026-2027',
    verdict: 'accepted',
    input: {
      psychometric: 680,
      bagrut: 110,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 80 },
          { subjectId: 'english', units: 5, grade: 88 },
          { subjectId: 'history', units: 2, grade: 90 },
          { subjectId: 'bible', units: 2, grade: 86 },
        ],
      },
    },
    expected: {
      score: 679,
      verdict: 'accepted',
    },
    sourceFingerprint: TAU_SOCIAL_WORK_SOURCE_FINGERPRINT,
    capturedAt: TAU_SOCIAL_WORK_CAPTURED_AT,
  },
  {
    id: 'social_work__tau:below:2026-2027',
    pairId: 'social_work__tau',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: {
      psychometric: 520,
      bagrut: 90,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 4, grade: 80 },
          { subjectId: 'english', units: 5, grade: 88 },
          { subjectId: 'history', units: 2, grade: 90 },
          { subjectId: 'bible', units: 2, grade: 86 },
        ],
      },
    },
    expected: {
      score: 496,
      verdict: 'below',
    },
    sourceFingerprint: TAU_SOCIAL_WORK_SOURCE_FINGERPRINT,
    capturedAt: TAU_SOCIAL_WORK_CAPTURED_AT,
  },
];

export const TAU_SOCIAL_WORK_CONTRACT: AdmissionsProgramVerificationContract = {
  pairId: 'social_work__tau',
  programId: 'social_work',
  institutionId: 'tau',
  officialProgramId: '111011010000',
  admissionCycle: '2026-2027',
  source: {
    targetId: 'tau-social-work-live',
    url: 'https://go.tau.ac.il/graphql',
  },
  calculation: {
    adapterId: 'tau',
    mode: 'official_replay',
    formulaFamily: 'tau_hatama',
    requiredInputs: [],
    cutoff: {
      acceptance: 580,
      rejection: 569,
    },
    gates: [
      {
        id: 'tau-social-work:priority',
        kind: 'manual',
        field: 'registrationPriority',
        description: 'Registration is permitted as a first or second preference.',
      },
      {
        id: 'tau-social-work:online-course-bonus',
        kind: 'direct_track',
        field: 'onlineCourseGrades',
        minimum: 82,
        description:
          'Each qualifying TAU online course adds five score points, to a maximum of ten points for two courses.',
      },
      {
        id: 'tau-social-work:interview',
        kind: 'manual',
        field: 'interview',
        description: 'The school may invite candidates to a personal or group interview.',
      },
    ],
  },
  fixtureIds: TAU_SOCIAL_WORK_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:e3a32901bf3f17adf065e5f606a08a9f5e5bc6c66f78f8dee69861f263596d61',
  sourceFingerprint: TAU_SOCIAL_WORK_SOURCE_FINGERPRINT,
  proof: {
    state: 'verified',
    comparedScore: true,
    comparedVerdict: true,
    liveComparedAt: TAU_SOCIAL_WORK_LIVE_COMPARED_AT,
    sourceFingerprint: TAU_SOCIAL_WORK_SOURCE_FINGERPRINT,
  },
};

export const TAU_LEGACY_SOCIAL_WORK_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_SOCIAL_WORK_FIXTURES.map((fixture) => ({
    ...fixture,
    id: fixture.id.replace('social_work__tau', 'tau_socialwork__tau'),
    pairId: 'tau_socialwork__tau',
  }));

export const TAU_LEGACY_SOCIAL_WORK_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_SOCIAL_WORK_CONTRACT,
  pairId: 'tau_socialwork__tau',
  programId: 'tau_socialwork',
  source: {
    ...TAU_SOCIAL_WORK_CONTRACT.source,
    targetId: 'tau-social-work-legacy-live',
  },
  fixtureIds: TAU_LEGACY_SOCIAL_WORK_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:e7511029cf4da3346b5e9dba1c9c0d59c24871148a5ba169f17483a80860b732',
};

export const TAU_LEGACY_PSYCHOLOGY_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_PSYCHOLOGY_FIXTURES.map((fixture) => ({
    ...fixture,
    id: fixture.id.replace('tau_psychology__tau', 'psychology__tau'),
    pairId: 'psychology__tau',
  }));

export const TAU_LEGACY_PSYCHOLOGY_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_PSYCHOLOGY_CONTRACT,
  pairId: 'psychology__tau',
  programId: 'psychology',
  source: {
    ...TAU_PSYCHOLOGY_CONTRACT.source,
    targetId: 'tau-psychology-legacy-live',
  },
  fixtureIds: TAU_LEGACY_PSYCHOLOGY_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:fd2fe2e1356c75bc6487b46d7d4a2b6ea69d159dc8de95705049351655dde708',
};

export const TAU_GENERIC_DATASCIENCE_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_DIGITAL_SCIENCES_FIXTURES.map((fixture) => ({
    ...fixture,
    id: fixture.id.replace('tau_datascience__tau', 'datascience__tau'),
    pairId: 'datascience__tau',
  }));

export const TAU_GENERIC_DATASCIENCE_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_DIGITAL_SCIENCES_CONTRACT,
  pairId: 'datascience__tau',
  programId: 'datascience',
  source: {
    ...TAU_DIGITAL_SCIENCES_CONTRACT.source,
    targetId: 'tau-digital-sciences-legacy-live',
  },
  fixtureIds: TAU_GENERIC_DATASCIENCE_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:ddf53eeab6f0dcdd073a3fe12db6a6fb370421594b38391149741aa9097274fd',
};

const TAU_LAW_SOURCE_FINGERPRINT =
  'sha256:9d849f74bf67cce1171bef0eaf5f5cb8c47b2f5beaa7d217ee7e90c6b8519513';
const TAU_LAW_CAPTURED_AT = '2026-07-26T05:30:00.000Z';
const TAU_LAW_LIVE_COMPARED_AT = '2026-07-26T05:31:00.000Z';

export const TAU_LAW_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'law__tau:accepted:2026-2027',
    pairId: 'law__tau',
    admissionCycle: '2026-2027',
    verdict: 'accepted',
    input: {
      psychometric: 680,
      bagrut: 110,
      psychometricEnglish: 110,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 82 },
          { subjectId: 'english', units: 5, grade: 90 },
          { subjectId: 'history', units: 2, grade: 92 },
          { subjectId: 'bible', units: 2, grade: 88 },
        ],
      },
    },
    expected: { score: 679, verdict: 'accepted' },
    sourceFingerprint: TAU_LAW_SOURCE_FINGERPRINT,
    capturedAt: TAU_LAW_CAPTURED_AT,
  },
  {
    id: 'law__tau:below:2026-2027',
    pairId: 'law__tau',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: {
      psychometric: 620,
      bagrut: 90,
      psychometricEnglish: 110,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 4, grade: 80 },
          { subjectId: 'english', units: 5, grade: 85 },
          { subjectId: 'history', units: 2, grade: 80 },
          { subjectId: 'bible', units: 2, grade: 78 },
        ],
      },
    },
    expected: { score: 548, verdict: 'below' },
    sourceFingerprint: TAU_LAW_SOURCE_FINGERPRINT,
    capturedAt: TAU_LAW_CAPTURED_AT,
  },
];

export const TAU_LAW_CONTRACT: AdmissionsProgramVerificationContract = {
  pairId: 'law__tau',
  programId: 'law',
  institutionId: 'tau',
  officialProgramId: '141111010000',
  admissionCycle: '2026-2027',
  source: { targetId: 'tau-law-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    adapterId: 'tau',
    mode: 'official_replay',
    formulaFamily: 'tau_hatama',
    requiredInputs: ['psychometric_english'],
    cutoff: { acceptance: 647, rejection: 646 },
    gates: [
      {
        id: 'tau-law:psychometric-minimum',
        kind: 'minimum',
        field: 'psychometric',
        minimum: 600,
        description: 'The standard law score route requires a psychometric score of at least 600.',
      },
      {
        id: 'tau-law:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-law:alternative-routes',
        kind: 'manual',
        field: 'alternativeAdmissionRoute',
        description: 'Alternative law admission routes require separate official review.',
      },
    ],
  },
  fixtureIds: TAU_LAW_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:b99df74198cb096ce8f8d84428d240138c418d674da6adf739eccd4416cfd8cb',
  sourceFingerprint: TAU_LAW_SOURCE_FINGERPRINT,
  proof: {
    state: 'verified',
    comparedScore: true,
    comparedVerdict: true,
    liveComparedAt: TAU_LAW_LIVE_COMPARED_AT,
    sourceFingerprint: TAU_LAW_SOURCE_FINGERPRINT,
  },
};

export const TAU_LEGACY_LAW_FIXTURES: AdmissionsVerificationFixture[] = TAU_LAW_FIXTURES.map(
  (fixture) => ({
    ...fixture,
    id: fixture.id.replace('law__tau', 'tau_law__tau'),
    pairId: 'tau_law__tau',
  }),
);

export const TAU_LEGACY_LAW_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_LAW_CONTRACT,
  pairId: 'tau_law__tau',
  programId: 'tau_law',
  source: { ...TAU_LAW_CONTRACT.source, targetId: 'tau-law-legacy-live' },
  fixtureIds: TAU_LEGACY_LAW_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:274948e725079938d57785726f8fdc4a37d037f0dc303696e0aa3eff2b9e0b36',
};

const TAU_ACCOUNTING_SOURCE_FINGERPRINT =
  'sha256:aa58d9b0b2bc5a820ef2725f4344a3e88629dbed6d694d4c3c0c9ccf8757af74';
const TAU_ACCOUNTING_CAPTURED_AT = '2026-07-26T05:45:00.000Z';
const TAU_ACCOUNTING_LIVE_COMPARED_AT = '2026-07-26T05:46:00.000Z';

export const TAU_ACCOUNTING_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'accounting__tau:accepted:2026-2027',
    pairId: 'accounting__tau',
    admissionCycle: '2026-2027',
    verdict: 'accepted',
    input: {
      psychometric: 680,
      bagrut: 110,
      psychometricEnglish: 110,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 82 },
          { subjectId: 'english', units: 5, grade: 90 },
          { subjectId: 'history', units: 2, grade: 92 },
          { subjectId: 'bible', units: 2, grade: 88 },
        ],
      },
    },
    expected: { score: 677, verdict: 'accepted' },
    sourceFingerprint: TAU_ACCOUNTING_SOURCE_FINGERPRINT,
    capturedAt: TAU_ACCOUNTING_CAPTURED_AT,
  },
  {
    id: 'accounting__tau:below:2026-2027',
    pairId: 'accounting__tau',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: {
      psychometric: 620,
      bagrut: 90,
      psychometricEnglish: 110,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 4, grade: 80 },
          { subjectId: 'english', units: 5, grade: 85 },
          { subjectId: 'history', units: 2, grade: 80 },
          { subjectId: 'bible', units: 2, grade: 78 },
        ],
      },
    },
    expected: { score: 577, verdict: 'below' },
    sourceFingerprint: TAU_ACCOUNTING_SOURCE_FINGERPRINT,
    capturedAt: TAU_ACCOUNTING_CAPTURED_AT,
  },
];

export const TAU_ACCOUNTING_CONTRACT: AdmissionsProgramVerificationContract = {
  pairId: 'accounting__tau',
  programId: 'accounting',
  institutionId: 'tau',
  officialProgramId: '121111050000',
  admissionCycle: '2026-2027',
  source: { targetId: 'tau-accounting-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    adapterId: 'tau',
    mode: 'official_replay',
    formulaFamily: 'tau_hatama_nihul',
    requiredInputs: ['psychometric_english'],
    cutoff: { acceptance: 610, rejection: 609 },
    gates: [
      {
        id: 'tau-accounting:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-accounting:alternative-routes',
        kind: 'manual',
        field: 'alternativeAdmissionRoute',
        description: 'Alternative accounting admission routes require separate official review.',
      },
    ],
  },
  fixtureIds: TAU_ACCOUNTING_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:5aa1f306152d0508fabcf6bfe7a41abedf053151ef2f81ca89eb248033cd935e',
  sourceFingerprint: TAU_ACCOUNTING_SOURCE_FINGERPRINT,
  proof: {
    state: 'verified',
    comparedScore: true,
    comparedVerdict: true,
    liveComparedAt: TAU_ACCOUNTING_LIVE_COMPARED_AT,
    sourceFingerprint: TAU_ACCOUNTING_SOURCE_FINGERPRINT,
  },
};

export const TAU_LEGACY_ACCOUNTING_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_ACCOUNTING_FIXTURES.map((fixture) => ({
    ...fixture,
    id: fixture.id.replace('accounting__tau', 'tau_accounting__tau'),
    pairId: 'tau_accounting__tau',
  }));

export const TAU_LEGACY_ACCOUNTING_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_ACCOUNTING_CONTRACT,
  pairId: 'tau_accounting__tau',
  programId: 'tau_accounting',
  source: { ...TAU_ACCOUNTING_CONTRACT.source, targetId: 'tau-accounting-legacy-live' },
  fixtureIds: TAU_LEGACY_ACCOUNTING_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:85f34ad4be00fdbdf4a40c0f484fdc78a25f6c4bdad79519bf57b460b01980c2',
};

const TAU_ARCHITECTURE_SOURCE_FINGERPRINT =
  'sha256:ca1b8b5fc2382bb0e899de53238ee2aebd132b33df642393acb73f26a4f2f9e0';
const TAU_ARCHITECTURE_CAPTURED_AT = '2026-07-26T06:00:00.000Z';
const TAU_ARCHITECTURE_LIVE_COMPARED_AT = '2026-07-26T06:01:00.000Z';

export const TAU_ARCHITECTURE_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'architecture__tau:accepted:2026-2027',
    pairId: 'architecture__tau',
    admissionCycle: '2026-2027',
    verdict: 'accepted',
    input: {
      psychometric: 680,
      bagrut: 110,
      psychometricEnglish: 110,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 82 },
          { subjectId: 'english', units: 5, grade: 90 },
          { subjectId: 'history', units: 2, grade: 92 },
          { subjectId: 'bible', units: 2, grade: 88 },
        ],
      },
    },
    expected: { score: 679, verdict: 'accepted' },
    sourceFingerprint: TAU_ARCHITECTURE_SOURCE_FINGERPRINT,
    capturedAt: TAU_ARCHITECTURE_CAPTURED_AT,
  },
  {
    id: 'architecture__tau:below:2026-2027',
    pairId: 'architecture__tau',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: {
      psychometric: 620,
      bagrut: 90,
      psychometricEnglish: 110,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 4, grade: 80 },
          { subjectId: 'english', units: 5, grade: 85 },
          { subjectId: 'history', units: 2, grade: 80 },
          { subjectId: 'bible', units: 2, grade: 78 },
        ],
      },
    },
    expected: { score: 548, verdict: 'below' },
    sourceFingerprint: TAU_ARCHITECTURE_SOURCE_FINGERPRINT,
    capturedAt: TAU_ARCHITECTURE_CAPTURED_AT,
  },
];

export const TAU_ARCHITECTURE_CONTRACT: AdmissionsProgramVerificationContract = {
  pairId: 'architecture__tau',
  programId: 'architecture',
  institutionId: 'tau',
  officialProgramId: '088111010000',
  admissionCycle: '2026-2027',
  source: { targetId: 'tau-architecture-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    adapterId: 'tau',
    mode: 'official_replay',
    formulaFamily: 'tau_hatama',
    requiredInputs: ['psychometric_english'],
    cutoff: { acceptance: 631, rejection: 563 },
    gates: [
      {
        id: 'tau-architecture:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-architecture:portfolio-interview',
        kind: 'manual',
        field: 'portfolioAndInterview',
        description:
          'Architecture applicants remain subject to the official portfolio and interview process.',
      },
    ],
  },
  fixtureIds: TAU_ARCHITECTURE_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:331166ba6f78b95ace049365119f4d9a86ebb5140765dff46d6f54d0f809ed12',
  sourceFingerprint: TAU_ARCHITECTURE_SOURCE_FINGERPRINT,
  proof: {
    state: 'verified',
    comparedScore: true,
    comparedVerdict: true,
    liveComparedAt: TAU_ARCHITECTURE_LIVE_COMPARED_AT,
    sourceFingerprint: TAU_ARCHITECTURE_SOURCE_FINGERPRINT,
  },
};

const TAU_BIOLOGY_SOURCE_FINGERPRINT =
  'sha256:15b31e2df3be2f353470453fe3e83eec36d7a0f25ccdc03aaf4d11f65c8a8a29';
export const TAU_BIOLOGY_FIXTURES: AdmissionsVerificationFixture[] = TAU_ARCHITECTURE_FIXTURES.map(
  (fixture) => ({
    ...fixture,
    id: fixture.id.replace('architecture__tau', 'biology__tau'),
    pairId: 'biology__tau',
  }),
);
for (const fixture of TAU_BIOLOGY_FIXTURES) {
  fixture.expected =
    fixture.verdict === 'accepted'
      ? { score: 679, verdict: 'accepted' }
      : { score: 548, verdict: 'below' };
  fixture.sourceFingerprint = TAU_BIOLOGY_SOURCE_FINGERPRINT;
}

export const TAU_BIOLOGY_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_ARCHITECTURE_CONTRACT,
  pairId: 'biology__tau',
  programId: 'biology',
  officialProgramId: '045511050000',
  source: { targetId: 'tau-biology-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    ...TAU_ARCHITECTURE_CONTRACT.calculation,
    formulaFamily: 'tau_hatama',
    cutoff: { acceptance: 576, rejection: 570 },
    gates: [
      {
        id: 'tau-biology:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-biology:science-requirements',
        kind: 'manual',
        field: 'bagrutSubjectRecord',
        description:
          'Biology, chemistry, and other science-route requirements remain subject to official review.',
      },
    ],
  },
  fixtureIds: TAU_BIOLOGY_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:3ab20003e8a217f447a0244827613ee626d46af1e0e1bc4c57f94824741a3eaa',
  sourceFingerprint: TAU_BIOLOGY_SOURCE_FINGERPRINT,
  proof: { ...TAU_ARCHITECTURE_CONTRACT.proof, sourceFingerprint: TAU_BIOLOGY_SOURCE_FINGERPRINT },
};

const TAU_COMMUNICATION_SOURCE_FINGERPRINT =
  'sha256:7f9160db9c455cf662f56d033203a2046e97f1d1c50f8dd2ab9b9a3b9ea6a69';
export const TAU_COMMUNICATION_FIXTURES: AdmissionsVerificationFixture[] = TAU_BIOLOGY_FIXTURES.map(
  (fixture) => ({
    ...fixture,
    id: fixture.id.replace('biology__tau', 'communication__tau'),
    pairId: 'communication__tau',
    expected:
      fixture.verdict === 'accepted'
        ? { score: 679, verdict: 'accepted' }
        : { score: 496, verdict: 'below' },
    input: fixture.verdict === 'accepted' ? fixture.input : { ...fixture.input, psychometric: 520 },
    sourceFingerprint: TAU_COMMUNICATION_SOURCE_FINGERPRINT,
  }),
);

export const TAU_COMMUNICATION_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_BIOLOGY_CONTRACT,
  pairId: 'communication__tau',
  programId: 'communication',
  officialProgramId: '108511050000',
  source: { targetId: 'tau-communication-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    ...TAU_BIOLOGY_CONTRACT.calculation,
    cutoff: { acceptance: 530, rejection: 529 },
    gates: [
      {
        id: 'tau-communication:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-communication:alternative-routes',
        kind: 'manual',
        field: 'alternativeAdmissionRoute',
        description: 'Communication alternative routes and programme conditions remain manual.',
      },
    ],
  },
  fixtureIds: TAU_COMMUNICATION_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:563151fe6f1115be7fe2144b7b1cb60a82bafff05095ed5fe80b759c9c37df4c',
  sourceFingerprint: TAU_COMMUNICATION_SOURCE_FINGERPRINT,
  proof: { ...TAU_BIOLOGY_CONTRACT.proof, sourceFingerprint: TAU_COMMUNICATION_SOURCE_FINGERPRINT },
};

const TAU_POLITICAL_SCIENCE_SOURCE_FINGERPRINT =
  'sha256:5f6bdb4fd9c9b2714446db7ddce9dbb15ebc7df42a76ea544b1c3de9d5193b2d';
export const TAU_POLITICAL_SCIENCE_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_COMMUNICATION_FIXTURES.map((fixture) => ({
    ...fixture,
    id: fixture.id.replace('communication__tau', 'political_science__tau'),
    pairId: 'political_science__tau',
    expected:
      fixture.verdict === 'accepted'
        ? { score: 679, verdict: 'accepted' }
        : { score: 496, verdict: 'below' },
    sourceFingerprint: TAU_POLITICAL_SCIENCE_SOURCE_FINGERPRINT,
  }));

export const TAU_POLITICAL_SCIENCE_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_COMMUNICATION_CONTRACT,
  pairId: 'political_science__tau',
  programId: 'political_science',
  officialProgramId: '103111030000',
  source: { targetId: 'tau-political-science-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    ...TAU_COMMUNICATION_CONTRACT.calculation,
    cutoff: { acceptance: 535, rejection: 534 },
    gates: [
      {
        id: 'tau-political-science:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-political-science:alternative-routes',
        kind: 'manual',
        field: 'alternativeAdmissionRoute',
        description: 'Political-science alternative routes remain manual.',
      },
    ],
  },
  fixtureIds: TAU_POLITICAL_SCIENCE_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:04da09168b669a7c50592128e25ee35314d72c9defa83e47b02c140e4f60544e',
  sourceFingerprint: TAU_POLITICAL_SCIENCE_SOURCE_FINGERPRINT,
  proof: {
    ...TAU_COMMUNICATION_CONTRACT.proof,
    sourceFingerprint: TAU_POLITICAL_SCIENCE_SOURCE_FINGERPRINT,
  },
};

const TAU_EDUCATION_SOURCE_FINGERPRINT =
  'sha256:6a3c47bcf0e50cc77c0ebd943efbaa3d92fb6f75e42f5ff7428dc32bfbf30a28';
export const TAU_EDUCATION_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_POLITICAL_SCIENCE_FIXTURES.map((fixture) => ({
    ...fixture,
    id: fixture.id.replace('political_science__tau', 'education__tau'),
    pairId: 'education__tau',
    sourceFingerprint: TAU_EDUCATION_SOURCE_FINGERPRINT,
  }));

export const TAU_EDUCATION_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_POLITICAL_SCIENCE_CONTRACT,
  pairId: 'education__tau',
  programId: 'education',
  officialProgramId: '072311050000',
  source: { targetId: 'tau-education-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    ...TAU_POLITICAL_SCIENCE_CONTRACT.calculation,
    cutoff: { acceptance: 550, rejection: 549 },
    gates: [
      {
        id: 'tau-education:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-education:alternative-routes',
        kind: 'manual',
        field: 'alternativeAdmissionRoute',
        description: 'Education tracks and alternate routes remain manual.',
      },
    ],
  },
  fixtureIds: TAU_EDUCATION_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:76da8c4d4ec38b75673d5a2aa174acf237e43b6191bfc7cbb4e83689edbb62f7',
  sourceFingerprint: TAU_EDUCATION_SOURCE_FINGERPRINT,
  proof: {
    ...TAU_POLITICAL_SCIENCE_CONTRACT.proof,
    sourceFingerprint: TAU_EDUCATION_SOURCE_FINGERPRINT,
  },
};

const TAU_ECONOMICS_SOURCE_FINGERPRINT =
  'sha256:2a58c0c1c679941ed9843e311deee3cfa1ce11c743ea875de3b56bc9d47c1a50';
export const TAU_ECONOMICS_FIXTURES: AdmissionsVerificationFixture[] = TAU_EDUCATION_FIXTURES.map(
  (fixture) => ({
    ...fixture,
    id: fixture.id.replace('education__tau', 'economics__tau'),
    pairId: 'economics__tau',
    sourceFingerprint: TAU_ECONOMICS_SOURCE_FINGERPRINT,
  }),
);
export const TAU_ECONOMICS_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_EDUCATION_CONTRACT,
  pairId: 'economics__tau',
  programId: 'economics',
  officialProgramId: '101111050000',
  source: { targetId: 'tau-economics-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    ...TAU_EDUCATION_CONTRACT.calculation,
    cutoff: { acceptance: 610, rejection: 600 },
    gates: [
      {
        id: 'tau-economics:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-economics:quantitative-route',
        kind: 'manual',
        field: 'bagrutSubjectRecord',
        description:
          'Economics quantitative and alternate routes remain subject to official review.',
      },
    ],
  },
  fixtureIds: TAU_ECONOMICS_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:3e6427637380c6035eb61b0587aa326ba0872efcb7870f59b33193e944a456f1',
  sourceFingerprint: TAU_ECONOMICS_SOURCE_FINGERPRINT,
  proof: { ...TAU_EDUCATION_CONTRACT.proof, sourceFingerprint: TAU_ECONOMICS_SOURCE_FINGERPRINT },
};
export const TAU_LEGACY_ECONOMICS_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_ECONOMICS_FIXTURES.map((fixture) => ({
    ...fixture,
    id: fixture.id.replace('economics__tau', 'tau_economics__tau'),
    pairId: 'tau_economics__tau',
  }));
export const TAU_LEGACY_ECONOMICS_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_ECONOMICS_CONTRACT,
  pairId: 'tau_economics__tau',
  programId: 'tau_economics',
  source: { ...TAU_ECONOMICS_CONTRACT.source, targetId: 'tau-economics-legacy-live' },
  fixtureIds: TAU_LEGACY_ECONOMICS_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:d43bb35b6ac0071fd07f5e8b012fe6184a01aebeb3fb2358deac3e48f63a9529',
};

const TAU_CS_SOURCE_FINGERPRINT =
  'sha256:4df15136e5d73cd89389c1d63e90e47a3f79aa9d3764b6481b54d48f5abde09c';
export const TAU_CS_FIXTURES: AdmissionsVerificationFixture[] = TAU_ECONOMICS_FIXTURES.map(
  (fixture) => ({
    ...fixture,
    id: fixture.id.replace('economics__tau', 'cs__tau'),
    pairId: 'cs__tau',
    input:
      fixture.verdict === 'accepted'
        ? { ...fixture.input, psychometric: 730, bagrut: 115 }
        : fixture.input,
    expected:
      fixture.verdict === 'accepted'
        ? { score: 730, verdict: 'accepted' }
        : { score: 548, verdict: 'below' },
    sourceFingerprint: TAU_CS_SOURCE_FINGERPRINT,
  }),
);
export const TAU_CS_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_ECONOMICS_CONTRACT,
  pairId: 'cs__tau',
  programId: 'cs',
  officialProgramId: '036811010000',
  source: { targetId: 'tau-cs-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    ...TAU_ECONOMICS_CONTRACT.calculation,
    formulaFamily: 'tau_hatama_meduyakim',
    requiredInputs: ['psychometric_english', 'bagrut_subject_record'],
    cutoff: { acceptance: 706, rejection: 695 },
    gates: [
      {
        id: 'tau-cs:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-cs:mathematics-route',
        kind: 'subject',
        field: 'bagrutSubjectRecord',
        description:
          'Computer Science requires a qualifying mathematics route (5-unit or 4-unit route with the stated grades and classification).',
      },
      {
        id: 'tau-cs:exact-sciences-bonus',
        kind: 'subject',
        field: 'bagrutSubjectRecord',
        minimum: 55,
        description:
          'The exact-sciences bonus applies only when the official mathematics and physics conditions are met.',
      },
      {
        id: 'tau-cs:alternative-routes',
        kind: 'manual',
        field: 'alternativeAdmissionRoute',
        description: 'Academic and alternative CS admission routes remain manual.',
      },
    ],
  },
  fixtureIds: TAU_CS_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:fdf34a5ff608244646f39fe20d7e501265f06b6590b17f4b1543ce7e35f17bf4',
  sourceFingerprint: TAU_CS_SOURCE_FINGERPRINT,
  proof: { ...TAU_ECONOMICS_CONTRACT.proof, sourceFingerprint: TAU_CS_SOURCE_FINGERPRINT },
};
export const TAU_LEGACY_CS_FIXTURES: AdmissionsVerificationFixture[] = TAU_CS_FIXTURES.map(
  (fixture) => ({
    ...fixture,
    id: fixture.id.replace('cs__tau', 'tau_cs__tau'),
    pairId: 'tau_cs__tau',
  }),
);
export const TAU_LEGACY_CS_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_CS_CONTRACT,
  pairId: 'tau_cs__tau',
  programId: 'tau_cs',
  source: { ...TAU_CS_CONTRACT.source, targetId: 'tau-cs-legacy-live' },
  fixtureIds: TAU_LEGACY_CS_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:c957bc5e6109faeba483df1e7a517d13b789deb8d8c30568e0780ab97a2e559a',
};

const TAU_EE_SOURCE_FINGERPRINT =
  'sha256:8a3b9a884d83a8d6a52da7f25d6f4f938dd1ad33da0a9bfba5cc1d4fb7fbf507';
export const TAU_EE_FIXTURES: AdmissionsVerificationFixture[] = TAU_CS_FIXTURES.map((fixture) => ({
  ...fixture,
  id: fixture.id.replace('cs__tau', 'ee__tau'),
  pairId: 'ee__tau',
  sourceFingerprint: TAU_EE_SOURCE_FINGERPRINT,
}));
export const TAU_EE_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_CS_CONTRACT,
  pairId: 'ee__tau',
  programId: 'ee',
  officialProgramId: '051211010000',
  source: { targetId: 'tau-ee-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    ...TAU_CS_CONTRACT.calculation,
    cutoff: { acceptance: 710, rejection: 690 },
    gates: [
      {
        id: 'tau-ee:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-ee:mathematics-physics-route',
        kind: 'subject',
        field: 'bagrutSubjectRecord',
        description:
          'Electrical Engineering requires the official mathematics and physics subject route.',
      },
      {
        id: 'tau-ee:alternative-routes',
        kind: 'manual',
        field: 'alternativeAdmissionRoute',
        description: 'Electrical Engineering alternative routes remain manual.',
      },
    ],
  },
  fixtureIds: TAU_EE_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:6771a16d97b6b5eea7ec285fb96223abf967e94d27a08fec80b4a248e1a7e4aa',
  sourceFingerprint: TAU_EE_SOURCE_FINGERPRINT,
  proof: { ...TAU_CS_CONTRACT.proof, sourceFingerprint: TAU_EE_SOURCE_FINGERPRINT },
};
export const TAU_LEGACY_EE_FIXTURES: AdmissionsVerificationFixture[] = TAU_EE_FIXTURES.map(
  (fixture) => ({
    ...fixture,
    id: fixture.id.replace('ee__tau', 'tau_ee__tau'),
    pairId: 'tau_ee__tau',
  }),
);
export const TAU_LEGACY_EE_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_EE_CONTRACT,
  pairId: 'tau_ee__tau',
  programId: 'tau_ee',
  source: { ...TAU_EE_CONTRACT.source, targetId: 'tau-ee-legacy-live' },
  fixtureIds: TAU_LEGACY_EE_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:e51c78d1dcacf49e478911e051ccc8d8d2d14bbceabd19f2faa86f668f3f4e40',
};

const TAU_ME_SOURCE_FINGERPRINT =
  'sha256:7bfe392d71a6dce9e645b08fb64e868582755226073e5e4e8322d72e64a8a7c9';
export const TAU_ME_FIXTURES: AdmissionsVerificationFixture[] = TAU_EE_FIXTURES.map((fixture) => ({
  ...fixture,
  id: fixture.id.replace('ee__tau', 'me__tau'),
  pairId: 'me__tau',
  sourceFingerprint: TAU_ME_SOURCE_FINGERPRINT,
}));
export const TAU_ME_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_EE_CONTRACT,
  pairId: 'me__tau',
  programId: 'me',
  officialProgramId: '054211010000',
  source: { targetId: 'tau-me-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    ...TAU_EE_CONTRACT.calculation,
    cutoff: { acceptance: 650, rejection: 616 },
    gates: [
      {
        id: 'tau-me:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-me:mathematics-physics-route',
        kind: 'subject',
        field: 'bagrutSubjectRecord',
        description:
          'Mechanical Engineering requires the official mathematics and physics subject route.',
      },
      {
        id: 'tau-me:alternative-routes',
        kind: 'manual',
        field: 'alternativeAdmissionRoute',
        description: 'Mechanical Engineering alternative routes remain manual.',
      },
    ],
  },
  fixtureIds: TAU_ME_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:3c53e717f7f3b8c540fa19da89e9315ae1687f31b915613141a5defedc7a64e6',
  sourceFingerprint: TAU_ME_SOURCE_FINGERPRINT,
  proof: { ...TAU_EE_CONTRACT.proof, sourceFingerprint: TAU_ME_SOURCE_FINGERPRINT },
};
export const TAU_LEGACY_ME_FIXTURES: AdmissionsVerificationFixture[] = TAU_ME_FIXTURES.map(
  (fixture) => ({
    ...fixture,
    id: fixture.id.replace('me__tau', 'tau_me__tau'),
    pairId: 'tau_me__tau',
  }),
);
export const TAU_LEGACY_ME_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_ME_CONTRACT,
  pairId: 'tau_me__tau',
  programId: 'tau_me',
  source: { ...TAU_ME_CONTRACT.source, targetId: 'tau-me-legacy-live' },
  fixtureIds: TAU_LEGACY_ME_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:ce0c30c4256743907ec1bf33198badf8b9fa89c965a883e6471ab317e9f1d63a',
};

const TAU_OCCUPATIONAL_SOURCE_FINGERPRINT =
  'sha256:4b48b5fdaf9f988cab905a25a68cb7a2f2873d9c4c99c4e9722fb4c3a674d0eb';
export const TAU_OCCUPATIONAL_FIXTURES: AdmissionsVerificationFixture[] = TAU_ME_FIXTURES.map(
  (fixture) => ({
    ...fixture,
    id: fixture.id.replace('me__tau', 'occupational_therapy__tau'),
    pairId: 'occupational_therapy__tau',
    sourceFingerprint: TAU_OCCUPATIONAL_SOURCE_FINGERPRINT,
  }),
);
export const TAU_OCCUPATIONAL_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_ME_CONTRACT,
  pairId: 'occupational_therapy__tau',
  programId: 'occupational_therapy',
  officialProgramId: '016511010000',
  source: { targetId: 'tau-occupational-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    ...TAU_ME_CONTRACT.calculation,
    formulaFamily: 'tau_hatama',
    requiredInputs: ['psychometric_english'],
    cutoff: { acceptance: 607, rejection: 606 },
    gates: [
      {
        id: 'tau-occupational:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-occupational:health-science-route',
        kind: 'manual',
        field: 'bagrutSubjectRecord',
        description:
          'Occupational Therapy chemistry/physics and interview conditions remain manual.',
      },
    ],
  },
  fixtureIds: TAU_OCCUPATIONAL_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:1f7bd700051fd142c77b2e6dcdd9dc0fc9fdbaf47c0b1a9299f5f4dc5b2492de',
  sourceFingerprint: TAU_OCCUPATIONAL_SOURCE_FINGERPRINT,
  proof: { ...TAU_ME_CONTRACT.proof, sourceFingerprint: TAU_OCCUPATIONAL_SOURCE_FINGERPRINT },
};
export const TAU_LEGACY_OCCUPATIONAL_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_OCCUPATIONAL_FIXTURES.map((fixture) => ({
    ...fixture,
    id: fixture.id.replace('occupational_therapy__tau', 'tau_occupational_therapy__tau'),
    pairId: 'tau_occupational_therapy__tau',
  }));
export const TAU_LEGACY_OCCUPATIONAL_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_OCCUPATIONAL_CONTRACT,
  pairId: 'tau_occupational_therapy__tau',
  programId: 'tau_occupational_therapy',
  source: { ...TAU_OCCUPATIONAL_CONTRACT.source, targetId: 'tau-occupational-legacy-live' },
  fixtureIds: TAU_LEGACY_OCCUPATIONAL_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:ddad83f7dd7b66dbf14009cb1bec6450104ad82e68e73da104debdb29772c1e8',
};

const TAU_INDUSTRIAL_SOURCE_FINGERPRINT =
  'sha256:fd28470bf2cb573244b46e2b0ee55b6756f074b92cf94d7eaeb0ea4bda1a8f72';
export const TAU_INDUSTRIAL_FIXTURES: AdmissionsVerificationFixture[] = TAU_ME_FIXTURES.map(
  (fixture) => ({
    ...fixture,
    id: fixture.id.replace('me__tau', 'tau_industrial__tau'),
    pairId: 'tau_industrial__tau',
    sourceFingerprint: TAU_INDUSTRIAL_SOURCE_FINGERPRINT,
  }),
);
export const TAU_INDUSTRIAL_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_ME_CONTRACT,
  pairId: 'tau_industrial__tau',
  programId: 'tau_industrial',
  officialProgramId: '057311010000',
  source: { targetId: 'tau-industrial-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    ...TAU_ME_CONTRACT.calculation,
    cutoff: { acceptance: 667, rejection: 647 },
    gates: [
      {
        id: 'tau-industrial:english-minimum',
        kind: 'language',
        field: 'psychometricEnglish',
        minimum: 100,
        description: 'TAU requires at least English level Advanced A.',
      },
      {
        id: 'tau-industrial:engineering-subject-route',
        kind: 'subject',
        field: 'bagrutSubjectRecord',
        description:
          'Industrial Engineering requires the official mathematics/physics engineering route.',
      },
    ],
  },
  fixtureIds: TAU_INDUSTRIAL_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:688325b1ee3964b0bc4c5e2d89e91723d1e2424a0ef46b5ef24846729b3c0a8d',
  sourceFingerprint: TAU_INDUSTRIAL_SOURCE_FINGERPRINT,
  proof: { ...TAU_ME_CONTRACT.proof, sourceFingerprint: TAU_INDUSTRIAL_SOURCE_FINGERPRINT },
};

export const TAU_LEGACY_BIOLOGY_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_BIOLOGY_FIXTURES.map((fixture) => ({
    ...fixture,
    id: fixture.id.replace('biology__tau', 'tau_biology__tau'),
    pairId: 'tau_biology__tau',
  }));
export const TAU_LEGACY_BIOLOGY_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_BIOLOGY_CONTRACT,
  pairId: 'tau_biology__tau',
  programId: 'tau_biology',
  source: { ...TAU_BIOLOGY_CONTRACT.source, targetId: 'tau-biology-legacy-live' },
  fixtureIds: TAU_LEGACY_BIOLOGY_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: 'sha256:35151ec6565b0442ed674498d93f602b619f966f5fced64528a71ccb656ae3db',
};

const TAU_BUSINESS_SOURCE_FINGERPRINT =
  'sha256:7e0d6b4b37d5676c1d92d5b06c91dd2b0df38e14e2a55d8fda1fd0b2ac3988c1';
const TAU_BUSINESS_CAPTURED_AT = '2026-07-26T06:00:00.000Z';

export const TAU_BUSINESS_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'business__tau:accepted:2026-2027',
    pairId: 'business__tau',
    admissionCycle: '2026-2027',
    verdict: 'accepted',
    input: { psychometric: 680, bagrut: 110 },
    expected: { score: 677, verdict: 'accepted' },
    sourceFingerprint: TAU_BUSINESS_SOURCE_FINGERPRINT,
    capturedAt: TAU_BUSINESS_CAPTURED_AT,
  },
  {
    id: 'business__tau:below:2026-2027',
    pairId: 'business__tau',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: { psychometric: 620, bagrut: 90 },
    expected: { score: 577, verdict: 'below' },
    sourceFingerprint: TAU_BUSINESS_SOURCE_FINGERPRINT,
    capturedAt: TAU_BUSINESS_CAPTURED_AT,
  },
];

export const TAU_BUSINESS_CONTRACT: AdmissionsProgramVerificationContract = {
  pairId: 'business__tau',
  programId: 'business',
  institutionId: 'tau',
  officialProgramId: '122111050000',
  admissionCycle: '2026-2027',
  source: { targetId: 'tau-business-live', url: 'https://go.tau.ac.il/graphql' },
  calculation: {
    adapterId: 'tau',
    mode: 'official_replay',
    formulaFamily: 'tau_hatama_nihul',
    requiredInputs: [],
    cutoff: { acceptance: 610, rejection: 609 },
    gates: [
      {
        id: 'tau-business:alternative-routes',
        kind: 'manual',
        field: 'alternativeAdmissionRoute',
        description: 'Alternative business admission routes require separate official review.',
      },
    ],
  },
  fixtureIds: TAU_BUSINESS_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: fingerprintVerificationFixtures(TAU_BUSINESS_FIXTURES),
  sourceFingerprint: TAU_BUSINESS_SOURCE_FINGERPRINT,
  proof: {
    state: 'verified',
    comparedScore: true,
    comparedVerdict: true,
    liveComparedAt: TAU_BUSINESS_CAPTURED_AT,
    sourceFingerprint: TAU_BUSINESS_SOURCE_FINGERPRINT,
  },
};

export const TAU_LEGACY_BUSINESS_FIXTURES: AdmissionsVerificationFixture[] =
  TAU_BUSINESS_FIXTURES.map((fixture) => ({
    ...fixture,
    id: fixture.id.replace('business__tau', 'tau_business__tau'),
    pairId: 'tau_business__tau',
  }));

export const TAU_LEGACY_BUSINESS_CONTRACT: AdmissionsProgramVerificationContract = {
  ...TAU_BUSINESS_CONTRACT,
  pairId: 'tau_business__tau',
  programId: 'tau_business',
  source: { ...TAU_BUSINESS_CONTRACT.source, targetId: 'tau-business-legacy-live' },
  fixtureIds: TAU_LEGACY_BUSINESS_FIXTURES.map((fixture) => fixture.id),
  fixtureSetFingerprint: fingerprintVerificationFixtures(TAU_LEGACY_BUSINESS_FIXTURES),
};

export interface ProgramVerificationArtifact {
  contract: AdmissionsProgramVerificationContract;
  fixtures: AdmissionsVerificationFixture[];
}

export interface TauProgramVerificationMetadata extends ProgramVerificationArtifact {
  requirementsUrl: string;
  ledgerReason: string;
}

export const TAU_PROGRAM_VERIFICATION_METADATA: Record<string, TauProgramVerificationMetadata> = {
  [TAU_DIGITAL_SCIENCES_CONTRACT.pairId]: {
    contract: TAU_DIGITAL_SCIENCES_CONTRACT,
    fixtures: TAU_DIGITAL_SCIENCES_FIXTURES,
    requirementsUrl: TAU_DIGITAL_SCIENCES_REQUIREMENTS_URL,
    ledgerReason:
      'Verified against the current TAU programme mapping, cumulative score gates, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_NURSING_CONTRACT.pairId]: {
    contract: TAU_NURSING_CONTRACT,
    fixtures: TAU_NURSING_FIXTURES,
    requirementsUrl: TAU_NURSING_REQUIREMENTS_URL,
    ledgerReason:
      'Verified as eligibility for the mandatory suitability assessment; passing the numeric threshold is not final admission.',
  },
  [TAU_MEDICINE_CONTRACT.pairId]: {
    contract: TAU_MEDICINE_CONTRACT,
    fixtures: TAU_MEDICINE_FIXTURES,
    requirementsUrl: 'https://go.tau.ac.il/he/med/ba/med-doc?v=important-info',
    ledgerReason:
      'Verified against the current TAU medicine programme mapping, preliminary medical suitability score, psychometric/English/mathematics gates, eligible/below fixtures, and live score-and-verdict replay. The non-cognitive selection stage remains a manual gate and this is not final admission.',
  },
  [TAU_LEGACY_MEDICINE_CONTRACT.pairId]: {
    contract: TAU_LEGACY_MEDICINE_CONTRACT,
    fixtures: TAU_LEGACY_MEDICINE_FIXTURES,
    requirementsUrl: 'https://go.tau.ac.il/he/med/ba/med-doc?v=important-info',
    ledgerReason:
      'Verified the legacy TAU medicine alias against the same current programme node, preliminary suitability score, gates, fixtures, and live replay; final non-cognitive selection remains manual.',
  },
  [TAU_PHYSIOTHERAPY_CONTRACT.pairId]: {
    contract: TAU_PHYSIOTHERAPY_CONTRACT,
    fixtures: TAU_PHYSIOTHERAPY_FIXTURES,
    requirementsUrl: TAU_PHYSIOTHERAPY_REQUIREMENTS_URL,
    ledgerReason:
      'Verified against the current TAU physiotherapy programme mapping, published score thresholds, English gate, eligible/below fixtures, and live score replay. The personal interview remains a manual gate and the numeric result is eligibility for that stage, not final admission.',
  },
  [TAU_INFORMATION_SYSTEMS_CONTRACT.pairId]: {
    contract: TAU_INFORMATION_SYSTEMS_CONTRACT,
    fixtures: TAU_INFORMATION_SYSTEMS_FIXTURES,
    requirementsUrl: TAU_INFORMATION_SYSTEMS_REQUIREMENTS_URL,
    ledgerReason:
      'Verified the legacy TAU information-systems catalogue alias against the current Management programme node, current management score field and thresholds, accepted/below fixtures, and live score-and-verdict replay. The current page describes information-systems coursework within Management rather than a separate degree title.',
  },
  [TAU_PSYCHOLOGY_CONTRACT.pairId]: {
    contract: TAU_PSYCHOLOGY_CONTRACT,
    fixtures: TAU_PSYCHOLOGY_FIXTURES,
    requirementsUrl: TAU_PSYCHOLOGY_REQUIREMENTS_URL,
    ledgerReason:
      'Verified against the current TAU programme mapping, cumulative score gates, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_SOCIAL_WORK_CONTRACT.pairId]: {
    contract: TAU_SOCIAL_WORK_CONTRACT,
    fixtures: TAU_SOCIAL_WORK_FIXTURES,
    requirementsUrl: TAU_SOCIAL_WORK_REQUIREMENTS_URL,
    ledgerReason:
      'Verified against the current TAU social-work programme node, score route, score thresholds, accepted/below fixtures, and live replay. The online-course, registration-priority, and possible-interview conditions remain explicit programme gates.',
  },
  [TAU_LEGACY_SOCIAL_WORK_CONTRACT.pairId]: {
    contract: TAU_LEGACY_SOCIAL_WORK_CONTRACT,
    fixtures: TAU_LEGACY_SOCIAL_WORK_FIXTURES,
    requirementsUrl: TAU_SOCIAL_WORK_REQUIREMENTS_URL,
    ledgerReason:
      'Verified against the same current TAU social-work programme node as the legacy catalogue alias, replacing its stale local threshold. The online-course, registration-priority, and possible-interview conditions remain explicit programme gates.',
  },
  [TAU_LEGACY_PSYCHOLOGY_CONTRACT.pairId]: {
    contract: TAU_LEGACY_PSYCHOLOGY_CONTRACT,
    fixtures: TAU_LEGACY_PSYCHOLOGY_FIXTURES,
    requirementsUrl: TAU_PSYCHOLOGY_REQUIREMENTS_URL,
    ledgerReason:
      'Verified against the current TAU Psychology programme node as the legacy catalogue alias, replacing its stale local threshold.',
  },
  [TAU_GENERIC_DATASCIENCE_CONTRACT.pairId]: {
    contract: TAU_GENERIC_DATASCIENCE_CONTRACT,
    fixtures: TAU_GENERIC_DATASCIENCE_FIXTURES,
    requirementsUrl: TAU_DIGITAL_SCIENCES_REQUIREMENTS_URL,
    ledgerReason:
      'Verified against the current TAU Digital Sciences programme node as the generic data-science catalogue alias, replacing its stale local threshold.',
  },
  [TAU_LAW_CONTRACT.pairId]: {
    contract: TAU_LAW_CONTRACT,
    fixtures: TAU_LAW_FIXTURES,
    requirementsUrl: TAU_LAW_REQUIREMENTS_URL,
    ledgerReason:
      'Verified against the current TAU Law programme node, standard score route, English and psychometric gates, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_LEGACY_LAW_CONTRACT.pairId]: {
    contract: TAU_LEGACY_LAW_CONTRACT,
    fixtures: TAU_LEGACY_LAW_FIXTURES,
    requirementsUrl: TAU_LAW_REQUIREMENTS_URL,
    ledgerReason:
      'Verified the legacy TAU Law catalogue alias against the same current programme node, gates, fixtures, and live score-and-verdict replay.',
  },
  [TAU_ACCOUNTING_CONTRACT.pairId]: {
    contract: TAU_ACCOUNTING_CONTRACT,
    fixtures: TAU_ACCOUNTING_FIXTURES,
    requirementsUrl: TAU_ACCOUNTING_REQUIREMENTS_URL,
    ledgerReason:
      'Verified against the current TAU Accounting programme node, accounting score field, English gate, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_LEGACY_ACCOUNTING_CONTRACT.pairId]: {
    contract: TAU_LEGACY_ACCOUNTING_CONTRACT,
    fixtures: TAU_LEGACY_ACCOUNTING_FIXTURES,
    requirementsUrl: TAU_ACCOUNTING_REQUIREMENTS_URL,
    ledgerReason:
      'Verified the legacy TAU Accounting catalogue alias against the same current programme node, score field, fixtures, and live score-and-verdict replay.',
  },
  [TAU_ARCHITECTURE_CONTRACT.pairId]: {
    contract: TAU_ARCHITECTURE_CONTRACT,
    fixtures: TAU_ARCHITECTURE_FIXTURES,
    requirementsUrl: TAU_ARCHITECTURE_REQUIREMENTS_URL,
    ledgerReason:
      'Verified against the current TAU Architecture programme node, score route, English gate, manual portfolio/interview condition, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_BIOLOGY_CONTRACT.pairId]: {
    contract: TAU_BIOLOGY_CONTRACT,
    fixtures: TAU_BIOLOGY_FIXTURES,
    requirementsUrl: 'https://go.tau.ac.il/he/life-sciences/ba/biology?v=admission-requirements',
    ledgerReason:
      'Verified against the current TAU Biology programme node, score route, English and science gates, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_COMMUNICATION_CONTRACT.pairId]: {
    contract: TAU_COMMUNICATION_CONTRACT,
    fixtures: TAU_COMMUNICATION_FIXTURES,
    requirementsUrl:
      'https://go.tau.ac.il/he/social-sciences/ba/communication?v=admission-requirements',
    ledgerReason:
      'Verified against the current TAU Communication programme node, score route, English gate, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_POLITICAL_SCIENCE_CONTRACT.pairId]: {
    contract: TAU_POLITICAL_SCIENCE_CONTRACT,
    fixtures: TAU_POLITICAL_SCIENCE_FIXTURES,
    requirementsUrl:
      'https://go.tau.ac.il/he/social-sciences/ba/political-science?v=admission-requirements',
    ledgerReason:
      'Verified against the current TAU Political Science programme node, score route, English gate, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_EDUCATION_CONTRACT.pairId]: {
    contract: TAU_EDUCATION_CONTRACT,
    fixtures: TAU_EDUCATION_FIXTURES,
    requirementsUrl:
      'https://go.tau.ac.il/he/social-sciences/ba/education?v=admission-requirements',
    ledgerReason:
      'Verified against the current TAU Education programme node, score route, English gate, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_ECONOMICS_CONTRACT.pairId]: {
    contract: TAU_ECONOMICS_CONTRACT,
    fixtures: TAU_ECONOMICS_FIXTURES,
    requirementsUrl: 'https://go.tau.ac.il/he/management/ba/economics?v=admission-requirements',
    ledgerReason:
      'Verified against the current TAU Economics programme node, score route, English/quantitative gates, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_LEGACY_ECONOMICS_CONTRACT.pairId]: {
    contract: TAU_LEGACY_ECONOMICS_CONTRACT,
    fixtures: TAU_LEGACY_ECONOMICS_FIXTURES,
    requirementsUrl: 'https://go.tau.ac.il/he/management/ba/economics?v=admission-requirements',
    ledgerReason:
      'Verified the legacy TAU Economics catalogue alias against the same current programme node, score route, fixtures, and live replay.',
  },
  [TAU_CS_CONTRACT.pairId]: {
    contract: TAU_CS_CONTRACT,
    fixtures: TAU_CS_FIXTURES,
    requirementsUrl:
      'https://go.tau.ac.il/he/engineering/ba/computer-science?v=admission-requirements',
    ledgerReason:
      'Verified against the current TAU Computer Science programme node, meduyakim score field, subject-record gates, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_LEGACY_CS_CONTRACT.pairId]: {
    contract: TAU_LEGACY_CS_CONTRACT,
    fixtures: TAU_LEGACY_CS_FIXTURES,
    requirementsUrl:
      'https://go.tau.ac.il/he/engineering/ba/computer-science?v=admission-requirements',
    ledgerReason:
      'Verified the legacy TAU Computer Science catalogue alias against the same current node, score field, subject gates, fixtures, and live replay.',
  },
  [TAU_EE_CONTRACT.pairId]: {
    contract: TAU_EE_CONTRACT,
    fixtures: TAU_EE_FIXTURES,
    requirementsUrl:
      'https://go.tau.ac.il/he/engineering/ba/electrical-engineering?v=admission-requirements',
    ledgerReason:
      'Verified against the current TAU Electrical Engineering programme node, score field, math/physics subject gates, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_LEGACY_EE_CONTRACT.pairId]: {
    contract: TAU_LEGACY_EE_CONTRACT,
    fixtures: TAU_LEGACY_EE_FIXTURES,
    requirementsUrl:
      'https://go.tau.ac.il/he/engineering/ba/electrical-engineering?v=admission-requirements',
    ledgerReason:
      'Verified the legacy TAU Electrical Engineering alias against the same current node, score field, subject gates, fixtures, and live replay.',
  },
  [TAU_ME_CONTRACT.pairId]: {
    contract: TAU_ME_CONTRACT,
    fixtures: TAU_ME_FIXTURES,
    requirementsUrl:
      'https://go.tau.ac.il/he/engineering/ba/mechanical-engineering?v=admission-requirements',
    ledgerReason:
      'Verified against the current TAU Mechanical Engineering programme node, score field, math/physics gates, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_LEGACY_ME_CONTRACT.pairId]: {
    contract: TAU_LEGACY_ME_CONTRACT,
    fixtures: TAU_LEGACY_ME_FIXTURES,
    requirementsUrl:
      'https://go.tau.ac.il/he/engineering/ba/mechanical-engineering?v=admission-requirements',
    ledgerReason:
      'Verified the legacy TAU Mechanical Engineering alias against the same current node, score field, subject gates, fixtures, and live replay.',
  },
  [TAU_OCCUPATIONAL_CONTRACT.pairId]: {
    contract: TAU_OCCUPATIONAL_CONTRACT,
    fixtures: TAU_OCCUPATIONAL_FIXTURES,
    requirementsUrl: 'https://go.tau.ac.il/he/med/ba/occupational-therapy?v=admission-requirements',
    ledgerReason:
      'Verified against the current TAU Occupational Therapy programme node, score route, English/health-science gates, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_LEGACY_OCCUPATIONAL_CONTRACT.pairId]: {
    contract: TAU_LEGACY_OCCUPATIONAL_CONTRACT,
    fixtures: TAU_LEGACY_OCCUPATIONAL_FIXTURES,
    requirementsUrl: 'https://go.tau.ac.il/he/med/ba/occupational-therapy?v=admission-requirements',
    ledgerReason:
      'Verified the legacy TAU Occupational Therapy alias against the same current node, score route, gates, fixtures, and live replay.',
  },
  [TAU_INDUSTRIAL_CONTRACT.pairId]: {
    contract: TAU_INDUSTRIAL_CONTRACT,
    fixtures: TAU_INDUSTRIAL_FIXTURES,
    requirementsUrl:
      'https://go.tau.ac.il/he/engineering/ba/industrial-engineering?v=admission-requirements',
    ledgerReason:
      'Verified the legacy TAU Industrial Engineering and Management pair against the current node, meduyakim score field, engineering gates, accepted/below fixtures, and live replay.',
  },
  [TAU_LEGACY_BIOLOGY_CONTRACT.pairId]: {
    contract: TAU_LEGACY_BIOLOGY_CONTRACT,
    fixtures: TAU_LEGACY_BIOLOGY_FIXTURES,
    requirementsUrl: 'https://go.tau.ac.il/he/life-sciences/ba/biology?v=admission-requirements',
    ledgerReason:
      'Verified the legacy TAU Biology catalogue alias against the same current node, score route, gates, fixtures, and live replay.',
  },
  [TAU_BUSINESS_CONTRACT.pairId]: {
    contract: TAU_BUSINESS_CONTRACT,
    fixtures: TAU_BUSINESS_FIXTURES,
    requirementsUrl: 'https://go.tau.ac.il/he/management/ba/management?v=admission-requirements',
    ledgerReason:
      'Verified against the current TAU Management programme node, management score field, accepted/below fixtures, and live score-and-verdict replay.',
  },
  [TAU_LEGACY_BUSINESS_CONTRACT.pairId]: {
    contract: TAU_LEGACY_BUSINESS_CONTRACT,
    fixtures: TAU_LEGACY_BUSINESS_FIXTURES,
    requirementsUrl: 'https://go.tau.ac.il/he/management/ba/management?v=admission-requirements',
    ledgerReason:
      'Verified the legacy TAU Business catalogue alias against the current Management programme node, score field, fixtures, and live score-and-verdict replay.',
  },
};

export const PROGRAM_VERIFICATION_ARTIFACTS: Record<string, ProgramVerificationArtifact> =
  Object.fromEntries(
    [
      ...Object.entries(TAU_PROGRAM_VERIFICATION_METADATA).map(([pairId, artifact]) => [
        pairId,
        { contract: artifact.contract, fixtures: artifact.fixtures },
      ]),
      ...Object.entries(HUJI_PROGRAM_VERIFICATION_ARTIFACTS),
      ...Object.entries(BGU_PROGRAM_VERIFICATION_ARTIFACTS),
      ...Object.entries(TECHNION_PROGRAM_VERIFICATION_ARTIFACTS),
      ...Object.entries(HAIFA_PROGRAM_VERIFICATION_ARTIFACTS),
      ...Object.entries(MANUAL_PROGRAM_VERIFICATION_ARTIFACTS),
    ],
  );

export function getTauProgramVerificationMetadata(
  pairId: string,
): TauProgramVerificationMetadata | undefined {
  return TAU_PROGRAM_VERIFICATION_METADATA[pairId];
}

export function getProgramVerificationArtifact(
  pairId: string,
): ProgramVerificationArtifact | undefined {
  return PROGRAM_VERIFICATION_ARTIFACTS[pairId];
}
