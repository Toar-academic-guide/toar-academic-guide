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
