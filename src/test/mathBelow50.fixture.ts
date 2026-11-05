import { getProgramVerificationArtifact } from '@/data/admissions/tauProgramVerification';
import type { SourceFreshnessStateRow } from '@/db/types';

// Qualify the existing TAU source contract without database or network access.
export function tauManagementFreshness(): SourceFreshnessStateRow {
  const { contract } = getProgramVerificationArtifact('tau_business__tau')!;
  const checkedAt = new Date();
  return {
    sourceId: contract.source.targetId,
    sourceClass: 'api_static_json',
    capability: 'decision_capable',
    status: 'fresh',
    proofLevel: 'exact_official',
    decisionProvenance: 'verified_derivation',
    reviewedSourceFingerprint: contract.sourceFingerprint,
    lastCheckedAt: checkedAt,
    lastSuccessfulCheckAt: checkedAt,
    lastExactCheckAt: checkedAt,
    lastChangedAt: null,
    latestFailureReason: null,
    blockedReason: null,
    rawFingerprint: null,
    normalizedFingerprint: contract.sourceFingerprint,
    normalizedDecisionPayload: {},
    latestReviewItemId: null,
    nextAction: null,
    createdAt: checkedAt,
    updatedAt: checkedAt,
  };
}
