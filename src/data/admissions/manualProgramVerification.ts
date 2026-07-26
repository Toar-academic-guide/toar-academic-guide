import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';

const CAPTURED_AT = '2026-07-26T08:20:00.000Z';

export interface ManualProgramVerificationMetadata {
  contract: AdmissionsProgramVerificationContract;
  fixtures: AdmissionsVerificationFixture[];
  requirementsUrl: string;
  ledgerReason: string;
}

const ARCHITECTURE_SOURCE_FINGERPRINT =
  'sha256:2e1cf6f77f2beab923e150c927ce6d018ca19c11bdd7c708a21337b2706c3d8c';
const COLMAN_SOURCE_FINGERPRINT =
  'sha256:5d6a5f8f3ab3d398e13674b0f868b432ac5551ee20b0068a41b52ea9195103cc';

const ARCHITECTURE_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'architecture__technion:eligible-to-apply:2026-2027',
    pairId: 'architecture__technion',
    admissionCycle: '2026-2027',
    verdict: 'eligible_to_apply',
    input: {
      psychometric: 700,
      bagrut: 105,
      mathUnits: 5,
      mathGrade: 80,
      englishUnits: 5,
      bagrutSubjectRecord: {
        schemaVersion: 1,
        sector: 'jewish',
        subjects: [
          { subjectId: 'mathematics', units: 5, grade: 80 },
          { subjectId: 'english', units: 5, grade: 90 },
          { subjectId: 'history', units: 2, grade: 88 },
          { subjectId: 'bible', units: 2, grade: 86 },
        ],
      },
    },
    expected: { score: 1, verdict: 'eligible_to_apply' },
    sourceFingerprint: ARCHITECTURE_SOURCE_FINGERPRINT,
    capturedAt: CAPTURED_AT,
  },
  {
    id: 'architecture__technion:below:2026-2027',
    pairId: 'architecture__technion',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: { psychometric: 700, bagrut: 105, mathUnits: 3, mathGrade: 90, englishUnits: 5 },
    expected: { score: 0, verdict: 'below' },
    sourceFingerprint: ARCHITECTURE_SOURCE_FINGERPRINT,
    capturedAt: CAPTURED_AT,
  },
];

const COLMAN_FIXTURES: AdmissionsVerificationFixture[] = [
  {
    id: 'colmgmt_cs__colman:eligible-to-apply:2026-2027',
    pairId: 'colmgmt_cs__colman',
    admissionCycle: '2026-2027',
    verdict: 'eligible_to_apply',
    input: { psychometric: 600, bagrut: 90, mathUnits: 5, mathGrade: 75 },
    expected: { score: 1, verdict: 'eligible_to_apply' },
    sourceFingerprint: COLMAN_SOURCE_FINGERPRINT,
    capturedAt: CAPTURED_AT,
  },
  {
    id: 'colmgmt_cs__colman:below:2026-2027',
    pairId: 'colmgmt_cs__colman',
    admissionCycle: '2026-2027',
    verdict: 'below',
    input: { psychometric: 600, bagrut: 84, mathUnits: 5, mathGrade: 75 },
    expected: { score: 0, verdict: 'below' },
    sourceFingerprint: COLMAN_SOURCE_FINGERPRINT,
    capturedAt: CAPTURED_AT,
  },
];

export const MANUAL_PROGRAM_VERIFICATION_METADATA: Record<
  string,
  ManualProgramVerificationMetadata
> = {
  architecture__technion: {
    contract: {
      pairId: 'architecture__technion',
      programId: 'architecture',
      institutionId: 'technion',
      officialProgramId: 'architecture-application-eligibility',
      admissionCycle: '2026-2027',
      source: {
        targetId: 'technion-architecture-live',
        url: 'https://admissions.technion.ac.il/architecture-info/',
      },
      calculation: {
        adapterId: 'manual_requirements',
        mode: 'official_replay',
        formulaFamily: 'technion_architecture_application_gates',
        requiredInputs: ['math_units', 'math_grade', 'english_units', 'bagrut_subject_record'],
        cutoff: { acceptance: 1, rejection: 0 },
        gates: [
          { id: 'technion-architecture:full-bagrut', kind: 'minimum', field: 'bagrut', minimum: 1, description: 'A complete Bagrut certificate is required.' },
          { id: 'technion-architecture:mathematics', kind: 'subject', field: 'mathUnits', description: 'Mathematics must be 4 units at 70+ or 5 units at 65+.' },
          { id: 'technion-architecture:english', kind: 'language', field: 'englishUnits', minimum: 4, description: 'English must be at least 4 units.' },
          { id: 'technion-architecture:entrance-exam', kind: 'manual', field: 'architectureEntranceExam', description: 'The architecture entrance exam remains a manual selection gate.' },
        ],
      },
      fixtureIds: ARCHITECTURE_FIXTURES.map((fixture) => fixture.id),
      fixtureSetFingerprint: fingerprintVerificationFixtures(ARCHITECTURE_FIXTURES),
      sourceFingerprint: ARCHITECTURE_SOURCE_FINGERPRINT,
      proof: { state: 'verified', comparedScore: true, comparedVerdict: true, liveComparedAt: CAPTURED_AT, sourceFingerprint: ARCHITECTURE_SOURCE_FINGERPRINT },
    },
    fixtures: ARCHITECTURE_FIXTURES,
    requirementsUrl: 'https://admissions.technion.ac.il/architecture-info/',
    ledgerReason: 'Verified current Technion architecture application gates with eligible/below fixtures. The entrance exam and final architecture selection remain manual gates.',
  },
  colmgmt_cs__colman: {
    contract: {
      pairId: 'colmgmt_cs__colman',
      programId: 'colmgmt_cs',
      institutionId: 'colman',
      officialProgramId: 'colman-computer-science-automatic-route',
      admissionCycle: '2026-2027',
      source: {
        targetId: 'colman-computer-science-live',
        url: 'https://www.colman.ac.il/academics/ba/computer-science/',
      },
      calculation: {
        adapterId: 'manual_requirements',
        mode: 'official_replay',
        formulaFamily: 'colman_computer_science_automatic_bagrut_route',
        requiredInputs: ['math_units', 'math_grade'],
        cutoff: { acceptance: 1, rejection: 0 },
        gates: [
          { id: 'colman-cs:bagrut-average', kind: 'minimum', field: 'bagrut', minimum: 85, description: 'Weighted Bagrut average must be at least 85.' },
          { id: 'colman-cs:mathematics', kind: 'subject', field: 'mathUnits', description: 'Mathematics must be 5 units at 70+ or 4 units at 80+.' },
          { id: 'colman-cs:internal-assessment', kind: 'manual', field: 'internalAssessment', description: 'The internal test or preparatory route remains a manual gate.' },
        ],
      },
      fixtureIds: COLMAN_FIXTURES.map((fixture) => fixture.id),
      fixtureSetFingerprint: fingerprintVerificationFixtures(COLMAN_FIXTURES),
      sourceFingerprint: COLMAN_SOURCE_FINGERPRINT,
      proof: { state: 'verified', comparedScore: true, comparedVerdict: true, liveComparedAt: CAPTURED_AT, sourceFingerprint: COLMAN_SOURCE_FINGERPRINT },
    },
    fixtures: COLMAN_FIXTURES,
    requirementsUrl: 'https://www.colman.ac.il/academics/ba/computer-science/',
    ledgerReason: 'Verified the published College of Management Computer Science automatic Bagrut route with eligible/below fixtures. The internal assessment and alternative routes remain manual gates.',
  },
};

export const MANUAL_PROGRAM_VERIFICATION_ARTIFACTS = Object.fromEntries(
  Object.entries(MANUAL_PROGRAM_VERIFICATION_METADATA).map(([pairId, artifact]) => [pairId, {
    contract: artifact.contract,
    fixtures: artifact.fixtures,
  }]),
);

export function getManualProgramVerificationMetadata(pairId: string) {
  return MANUAL_PROGRAM_VERIFICATION_METADATA[pairId];
}
