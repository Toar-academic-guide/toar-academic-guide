import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import { getHaifaInformationSystemsTrackArtifact } from '@/data/admissions/haifaInformationSystemsVerification';
import type { SourceFreshnessStateRow } from '@/db/types';
import type { AdmissionsEvaluationInput } from '@/types/admissionsEvaluation';
import { buildBagrutSubjectRecord } from '@/utils/bagrutSubjectRecord';

export const haifaQaProgramIds = [
  'haifa_psychology',
  'haifa_cs',
  'haifa_nursing',
  'haifa_infosystems',
];
export const haifaQaNow = new Date('2026-10-28T12:00:00.000Z');

export const haifaQaApplicant = {
  psychometric: 780,
  bagrut: 91.4,
  bagrutAverageEstimated: true,
  extraInputs: {
    bagrutSubjectRecord: buildBagrutSubjectRecord({
      sectorLabel: 'יהודי',
      certificateType: 'other',
      complete: true,
      subjects: [
        { label: 'מתמטיקה', units: 5, grade: 92 },
        { label: 'אנגלית', units: 5, grade: 95 },
        { label: 'הבעה עברית', units: 2, grade: 88 },
        { label: 'תנ״ך', units: 2, grade: 85 },
        { label: 'ספרות', units: 2, grade: 90 },
        { label: 'היסטוריה', units: 2, grade: 87 },
        { label: 'אזרחות', units: 2, grade: 93 },
        { label: 'פיזיקה', units: 5, grade: 90 },
        { label: 'מדעי המחשב', units: 5, grade: 94 },
      ],
    }),
    mathUnits: 5,
    mathGrade: 92,
    englishUnits: 5,
    englishGrade: 95,
    physicsUnits: 5,
    physicsGrade: 90,
    csUnits: 5,
    csGrade: 94,
    psychometricMath: 140,
    psychometricVerbal: 130,
    psychometricEnglish: 135,
    haifaBagrutYear: 2020,
    haifaPsychometricYear: 2024,
    haifaHebrewQualification: 'hebrew_school',
    haifaScienceUnits: 10,
    haifaInformationSystemsTrack: 'dual_major',
    haifaInformationSystemsPartnerRequirementsConfirmed: true,
  },
} satisfies Omit<AdmissionsEvaluationInput, 'degreeId'>;

export function haifaQaFreshness() {
  return new Map<string, SourceFreshnessStateRow>(
    haifaQaProgramIds.map((programId) => {
      const artifact = (
        programId === 'haifa_infosystems'
          ? getHaifaInformationSystemsTrackArtifact('dual_major')
          : getProgramVerificationArtifact(`${programId}__haifa`)
      )!;
      const sourceId = artifact.contract.source.targetId;
      return [
        sourceId,
        {
          sourceId,
          sourceClass: 'api_static_json',
          capability: 'decision_capable',
          status: 'fresh',
          proofLevel: 'exact_official',
          decisionProvenance: 'verified_derivation',
          reviewedSourceFingerprint: artifact.contract.sourceFingerprint,
          normalizedFingerprint: artifact.contract.sourceFingerprint,
          normalizedDecisionPayload: {},
          lastCheckedAt: haifaQaNow,
          lastSuccessfulCheckAt: haifaQaNow,
          lastExactCheckAt: haifaQaNow,
          lastChangedAt: null,
          latestFailureReason: null,
          blockedReason: null,
          rawFingerprint: null,
          latestReviewItemId: null,
          nextAction: null,
          createdAt: haifaQaNow,
          updatedAt: haifaQaNow,
        },
      ];
    }),
  );
}
