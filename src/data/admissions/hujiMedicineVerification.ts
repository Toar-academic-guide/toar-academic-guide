import official from '../../../docs/admissions-verification/2026-09-28-huji-medicine-official.json';
import { createHash } from 'node:crypto';
import {
  HUJI_MEDICINE_POLICY,
  HUJI_MEDICINE_CALCULATOR_URL,
  HUJI_MEDICINE_REQUIREMENTS_URL,
} from '@/server/admissions/hujiMedicinePolicy';
import { HUJI_MEDICINE_REQUIRED_INPUTS } from '@/lib/hujiMedicineInputs';
import { fingerprintVerificationFixtures } from '@/server/admissions/verification/programVerification';
import type {
  AdmissionsProgramVerificationContract,
  AdmissionsVerificationFixture,
} from '@/types/admissionsEvaluation';

export const HUJI_MEDICINE_SOURCE_FINGERPRINT = `sha256:${createHash('sha256')
  .update(
    JSON.stringify({
      calculator: HUJI_MEDICINE_CALCULATOR_URL,
      requirements: HUJI_MEDICINE_REQUIREMENTS_URL,
      policy: HUJI_MEDICINE_POLICY,
      evidence: official,
    }),
  )
  .digest('hex')}`;

export const HUJI_MEDICINE_ELIGIBLE_INPUTS = {
  hujiMedicineAffirmativeAction: 'standard' as const,
  hujiMedicineRoute: 'bagrut' as const,
  hujiBagrutAverage: 120,
  hujiMedicineAssessmentScore: 200,
  hujiMedicineAssessmentYear: 2026,
  hujiMedicinePsychometricDate: '2026-04-01',
  hujiMedicineEnglishBasis: 'score' as const,
  hujiMedicineEnglishScore: 120,
  hujiMedicineHebrewBasis: 'hebrew_school' as const,
  hujiMedicineResidencyEligible: true,
  hujiMedicineQualificationConfirmed: true,
  hujiMedicinePriorStudyStatus: 'none' as const,
  hujiMedicineRegistrationConfirmed: true,
};

export function buildHujiMedicineVerification(programId: string): {
  contract: AdmissionsProgramVerificationContract;
  fixtures: AdmissionsVerificationFixture[];
  ledgerReason: string;
} {
  const pairId = `${programId}__huji`;
  const capturedAt = official.capturedAt;
  const fixtures: AdmissionsVerificationFixture[] = [
    {
      id: `${pairId}:eligible:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'eligible_to_apply',
      input: { psychometric: 800, bagrut: 0, ...HUJI_MEDICINE_ELIGIBLE_INPUTS },
      expected: { score: 26.612, verdict: 'eligible_to_apply' },
      sourceFingerprint: HUJI_MEDICINE_SOURCE_FINGERPRINT,
      capturedAt,
    },
    {
      id: `${pairId}:below:2026-2027`,
      pairId,
      admissionCycle: '2026-2027',
      verdict: 'below',
      input: {
        psychometric: 700,
        bagrut: 0,
        ...HUJI_MEDICINE_ELIGIBLE_INPUTS,
        hujiBagrutAverage: 100,
      },
      expected: { score: 22.265, verdict: 'below' },
      sourceFingerprint: HUJI_MEDICINE_SOURCE_FINGERPRINT,
      capturedAt,
    },
  ];
  return {
    contract: {
      pairId,
      programId,
      institutionId: 'huji',
      officialProgramId: '601-4601',
      admissionCycle: '2026-2027',
      source: { targetId: `huji-${programId}-live`, url: HUJI_MEDICINE_CALCULATOR_URL },
      calculation: {
        adapterId: 'huji',
        mode: 'official_replay',
        formulaFamily: 'huji_medicine_staged_2026_2027',
        requiredInputs: [
          HUJI_MEDICINE_REQUIRED_INPUTS.hujiBagrutAverage,
          HUJI_MEDICINE_REQUIRED_INPUTS.hujiMedicineAssessmentScore,
          HUJI_MEDICINE_REQUIRED_INPUTS.hujiMedicineAssessmentYear,
        ],
        cutoff: { acceptance: 25.783, rejection: null },
        gates: [
          {
            id: 'medicine_psychometric',
            kind: 'minimum',
            field: 'psychometric_overall',
            minimum: 700,
            description: 'פסיכומטרי רב־תחומי 700 לפחות, עד מועד אפריל 2026.',
          },
          {
            id: 'medicine_cognitive',
            kind: 'minimum',
            field: 'huji_medicine_cognitive_score',
            minimum: 25.186,
            description: 'סף קוגניטיבי למעבר למיון האישיותי.',
          },
          {
            id: 'medicine_assessment',
            kind: 'minimum',
            field: 'huji_medicine_assessment_score',
            minimum: 175,
            description: 'מו״ר/מרק״ם 175 לפחות בציון תקף.',
          },
          {
            id: 'medicine_qualification',
            kind: 'manual',
            field: 'huji_medicine_qualification',
            description:
              'תעודה מוכרת, שפות, אזרחות או תושבות קבע, מסמכי לימודים קודמים והרשמה במועד.',
          },
        ],
      },
      fixtureIds: fixtures.map((f) => f.id),
      fixtureSetFingerprint: fingerprintVerificationFixtures(fixtures),
      sourceFingerprint: HUJI_MEDICINE_SOURCE_FINGERPRINT,
      proof: {
        state: 'verified',
        comparedScore: true,
        comparedVerdict: true,
        liveComparedAt: capturedAt,
        sourceFingerprint: HUJI_MEDICINE_SOURCE_FINGERPRINT,
      },
    },
    fixtures,
    ledgerReason:
      'Current dedicated Medicine cognitive/final calculator captures plus published stage-specific cutoffs and prerequisites. Positive is eligibility for institutional selection, never guaranteed acceptance. Unresolved preparatory cohorts and assessment-year conflicts remain manual.',
  };
}

// Expected numbers are observations from the official browser, independent of the replay functions.
export const HUJI_MEDICINE_OFFICIAL_CAPTURES = [
  {
    captureId: 'huji-medicine-native-final-eligible-20260928',
    capturedAt: official.capturedAt,
    officialUrl: official.calculatorUrl,
    applicant: { bagrutAverage: 0, psychometric: 800, extraInputs: HUJI_MEDICINE_ELIGIBLE_INPUTS },
    expected: { score: 26.612, verdict: 'eligible_to_apply' as const },
  },
  {
    captureId: 'huji-medicine-native-screening-below-20260928',
    capturedAt: official.capturedAt,
    officialUrl: official.calculatorUrl,
    applicant: {
      bagrutAverage: 0,
      psychometric: 700,
      extraInputs: { ...HUJI_MEDICINE_ELIGIBLE_INPUTS, hujiBagrutAverage: 100 },
    },
    expected: { score: 22.265, verdict: 'below' as const },
  },
];
