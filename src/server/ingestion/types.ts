export type IngestionSourceDifficulty = 'easy' | 'browser_required' | 'hard_manual';
export type IngestionJobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'needs_review';

export interface IngestionSourceDescriptor {
  id: string;
  institutionId?: string;
  programId?: string;
  difficulty: IngestionSourceDifficulty;
  sourceUrl: string;
  notes?: string;
}
