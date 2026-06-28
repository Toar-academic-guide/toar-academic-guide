export type IngestionSourceDifficulty = 'easy' | 'browser_required' | 'hard_manual';
export type IngestionJobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'needs_review';
export type FreshnessSourceClass =
  | 'api_static_json'
  | 'browser_required'
  | 'official_html'
  | 'pdf_text'
  | 'score_only_calculator';
export type FreshnessCapability = 'blocked' | 'decision_capable' | 'score_only';
export type SourceFreshnessStatus = 'blocked' | 'changed_needs_review' | 'failed' | 'fresh';
export type MondayAdmissionsReproducedField =
  | 'acceptanceCutoff'
  | 'acceptanceThreshold'
  | 'adaptedScore'
  | 'bagrutAverage'
  | 'departmentGates'
  | 'openAdmissionPolicy'
  | 'optimalBagrutAverage'
  | 'programCutoffCandidate'
  | 'rejectionCutoff'
  | 'rejectionThreshold'
  | 'selectedScore'
  | 'sekhemScore'
  | 'subjectGates'
  | 'weightedScore';

export type MondayAdmissionsContractFieldEvidence = {
  contractField: MondayAdmissionsReproducedField;
  sourceField?: string;
  sampleValue?: number;
  notes?: string;
};

export type MondayAdmissionsContractProvenance = {
  source: 'monday_update_export';
  itemId: string;
  itemName: string;
  updateId: string;
  createdAt?: string;
  sourceCandidateUrl?: string;
};

export type MondayAdmissionsContractInput = {
  body: string;
  provenance: MondayAdmissionsContractProvenance;
};

export type MondayAdmissionsReportMethod = 'GET' | 'POST';

export interface MondayAdmissionsSourceContract {
  kind: 'monday_reverse_engineering_report';
  institutionId: string;
  institutionName: string;
  sourceCandidateUrl: string;
  officialUrl: string;
  requestMethod: MondayAdmissionsReportMethod;
  capability: FreshnessCapability;
  reproducedFields: MondayAdmissionsReproducedField[];
  fieldEvidence: MondayAdmissionsContractFieldEvidence[];
  limitations: string[];
  nextAction: string;
  provenance: MondayAdmissionsContractProvenance;
  rawBody: string;
}

export type MondayAdmissionsSourceContractParseFailureCode =
  | 'ambiguous_report'
  | 'missing_endpoint'
  | 'missing_method'
  | 'missing_source_candidate_url'
  | 'unsupported_report';

export type MondayAdmissionsSourceContractParseFailure = {
  code: MondayAdmissionsSourceContractParseFailureCode;
  message: string;
};

export type MondayAdmissionsSourceContractParseResult =
  | {
      ok: true;
      contract: MondayAdmissionsSourceContract;
    }
  | {
      ok: false;
      error: MondayAdmissionsSourceContractParseFailure;
    };

export interface MondayAdmissionsSourceReviewableEvidence {
  evidenceKind: 'monday_reverse_engineering_report';
  publicationBoundary: 'reviewable_evidence_only';
  targetId: string;
  sourceCandidateUrl: string;
  officialUrl: string;
  requestMethod: MondayAdmissionsReportMethod;
  capability: FreshnessCapability;
  reproducedFields: MondayAdmissionsReproducedField[];
  fieldEvidence: MondayAdmissionsContractFieldEvidence[];
  limitations: string[];
  nextAction: string;
  provenance: MondayAdmissionsContractProvenance;
}

export interface IngestionSourceDescriptor {
  id: string;
  institutionId?: string;
  programId?: string;
  difficulty: IngestionSourceDifficulty;
  sourceUrl: string;
  notes?: string;
}

export interface SourceFreshnessDescriptor {
  sourceId: string;
  sourceClass: FreshnessSourceClass;
  capability: FreshnessCapability;
  status: SourceFreshnessStatus;
  lastCheckedAt?: Date;
  lastSuccessfulCheckAt?: Date;
  lastChangedAt?: Date;
  latestFailureReason?: string;
  blockedReason?: string;
  rawFingerprint?: string;
  normalizedFingerprint?: string;
  normalizedDecisionPayload?: Record<string, unknown>;
  latestReviewItemId?: string;
  nextAction?: string;
}
