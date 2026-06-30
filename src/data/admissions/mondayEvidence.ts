import { mondayAdmissionEvidenceRecords } from './mondayEvidence.generated';

export type MondayEvidenceCapabilityCandidate =
  | 'decision_capable'
  | 'score_only_or_formula_without_verified_cutoff'
  | 'blocked_decision_source'
  | 'open_admission'
  | 'requirements_only'
  | 'manual_gate'
  | 'eligible_with_manual_gate'
  | 'eligible_no_formal_grade_gate'
  | 'missing_update_evidence'
  | 'unknown';

export type MondayEvidencePublicBucket =
  | 'decision_capable'
  | 'tracked_missing_rule'
  | 'open_admission'
  | 'manual_gate'
  | 'eligible_with_manual_gate'
  | 'eligible_no_formal_grade_gate'
  | 'requirements_review';

export type MondayEvidenceRuleStatus =
  | 'decision_rule_available'
  | 'open_or_no_grade_rule_available'
  | 'manual_or_eligibility_rule_available'
  | 'needs_threshold_or_status'
  | 'needs_manual_gate_confirmation'
  | 'blocked_official_source'
  | 'needs_structured_requirements'
  | 'needs_official_url'
  | 'needs_official_rule';

export type MondayEvidenceConfidence = 'high' | 'medium' | 'low';

export type MondayEvidenceCatalogueVisibility = 'catalogue_mapped' | 'evidence_only';

export type MondayEvidenceOfficialVerificationStatus =
  | 'monday_evidence_decision_rule_available'
  | 'monday_evidence_open_or_no_grade_rule_available'
  | 'monday_evidence_manual_or_eligibility_rule_available'
  | 'needs_official_threshold'
  | 'partial_official_rule_verified'
  | 'blocked_needs_alternate_official_source'
  | 'needs_structured_requirements'
  | 'needs_official_url'
  | 'needs_official_rule_classification';

export interface MondayAdmissionVerifiedProgramThreshold {
  programId: string;
  threshold: number;
  sourceUrl: string;
  sourceLabel: string;
  verifiedAt: string;
  notes?: string;
}

export interface MondayAdmissionEvidenceRecord {
  itemId: string;
  mondayUrl: string;
  itemNumber: number | null;
  itemName: string;
  displayName: string;
  catalogueInstitutionId: string | null;
  catalogueVisibility: MondayEvidenceCatalogueVisibility;
  institutionType: string | null;
  diplomaType: string | null;
  location: string | null;
  updateCount: number;
  capabilityCandidate: MondayEvidenceCapabilityCandidate;
  publicBucket: MondayEvidencePublicBucket;
  ruleStatus: MondayEvidenceRuleStatus;
  officialVerificationStatus: MondayEvidenceOfficialVerificationStatus;
  confidence: MondayEvidenceConfidence;
  tags: readonly string[];
  officialUrls: readonly string[];
  missingData: readonly string[];
  limitations: readonly string[];
  decisionReason: string;
  nextAction: string;
  verifiedProgramThresholds?: readonly MondayAdmissionVerifiedProgramThreshold[];
  interviewNeeded?: boolean;
  portfolioNeeded?: boolean;
  noBagrutNeeded?: boolean;
  noPsychometricNeeded?: boolean;
}

export const mondayAdmissionsEvidence: readonly MondayAdmissionEvidenceRecord[] = mondayAdmissionEvidenceRecords;

export function getMondayAdmissionEvidenceByItemId(
  itemId: string,
): MondayAdmissionEvidenceRecord | undefined {
  return mondayAdmissionsEvidence.find((record) => record.itemId === itemId);
}

export function getMondayAdmissionEvidenceByCatalogueInstitutionId(
  institutionId: string,
): MondayAdmissionEvidenceRecord[] {
  return mondayAdmissionsEvidence.filter(
    (record) =>
      record.catalogueInstitutionId === institutionId ||
      `mon_${record.itemId}` === institutionId,
  );
}

export function getTrackedMissingAdmissionRules(): MondayAdmissionEvidenceRecord[] {
  return mondayAdmissionsEvidence.filter(
    (record) =>
      record.publicBucket === 'tracked_missing_rule' ||
      record.ruleStatus === 'needs_structured_requirements',
  );
}

export function getMondayOfficialVerificationQueue(): MondayAdmissionEvidenceRecord[] {
  return mondayAdmissionsEvidence.filter(
    (record) =>
      record.officialVerificationStatus.startsWith('needs_') ||
      record.officialVerificationStatus.startsWith('blocked_'),
  );
}
