import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { getDb } from '@/db/client';
import {
  ingestionJobs,
  ingestionPayloads,
  ingestionSources,
  institutions,
  programs,
  reviewItems,
  sourceFreshnessChecks,
  sourceFreshnessStates,
} from '@/db/schema';
import {
  evaluateAdmissionsSourceProof,
  type AdmissionsSourceProof,
} from './admissionsSourceAdapters';
import type {
  FreshnessCapability,
  FreshnessSourceClass,
  IngestionSourceDescriptor,
  IngestionSourceDifficulty,
  SourceFreshnessStatus,
} from './types';

export interface SourceFreshnessCurrentState {
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
  normalizedDecisionPayload: Record<string, unknown>;
  latestReviewItemId?: string;
  nextAction?: string;
}

export interface SourceFreshnessCheckRecord {
  id: string;
  sourceId: string;
  sourceClass: FreshnessSourceClass;
  capability: FreshnessCapability;
  status: SourceFreshnessStatus;
  checkedAt: Date;
  successful: boolean;
  failureReason?: string;
  blockedReason?: string;
  rawFingerprint?: string;
  normalizedFingerprint?: string;
  normalizedDecisionPayload: Record<string, unknown>;
  reviewWorthy: boolean;
  reviewItemId?: string;
  nextAction?: string;
}

export interface SourceFreshnessReviewHandoff {
  sourceId: string;
  checkedAt: Date;
  difficulty: IngestionSourceDifficulty;
  targetField: 'sourceFreshness';
  normalizedFingerprint: string;
  normalizedDecisionPayload: Record<string, unknown>;
  proof: AdmissionsSourceProof;
}

export interface SourceFreshnessRepository {
  ensureIngestionSource(descriptor: IngestionSourceDescriptor): Promise<void>;
  getCurrentState(sourceId: string): Promise<SourceFreshnessCurrentState | null>;
  recordCheck(record: SourceFreshnessCheckRecord): Promise<void>;
  upsertCurrentState(state: SourceFreshnessCurrentState): Promise<void>;
  createReviewHandoff(
    input: SourceFreshnessReviewHandoff,
  ): Promise<{ payloadId: string; reviewItemId: string }>;
}

export interface PersistAdmissionsSourceProofsInput {
  checkedAt?: Date;
  proofs: AdmissionsSourceProof[];
  repository: SourceFreshnessRepository;
}

export interface PersistAdmissionsSourceProofsResult {
  total: number;
  blocked: number;
  changed_needs_review: number;
  failed: number;
  fresh: number;
  reviewsCreated: number;
}

export async function persistAdmissionsSourceProofs({
  checkedAt = new Date(),
  proofs,
  repository,
}: PersistAdmissionsSourceProofsInput): Promise<PersistAdmissionsSourceProofsResult> {
  const summary: PersistAdmissionsSourceProofsResult = {
    total: proofs.length,
    blocked: 0,
    changed_needs_review: 0,
    failed: 0,
    fresh: 0,
    reviewsCreated: 0,
  };

  for (const proof of proofs) {
    await repository.ensureIngestionSource(sourceDescriptorForProof(proof));

    const previous = await repository.getCurrentState(proof.id);
    const evaluation = evaluateAdmissionsSourceProof(proof, previous?.normalizedFingerprint);
    const freshness = evaluation.freshness;
    const pendingSameDecisionChange =
      previous?.status === 'changed_needs_review' &&
      previous.normalizedFingerprint !== undefined &&
      previous.normalizedFingerprint === freshness?.normalizedFingerprint &&
      previous.latestReviewItemId !== undefined;

    const status = sourceFreshnessStatusForProof(
      proof,
      freshness?.status,
      pendingSameDecisionChange,
    );
    const successful = proof.status !== 'failed';
    const failureReason = proof.errorReason;
    let reviewItemId = pendingSameDecisionChange ? previous.latestReviewItemId : undefined;

    if (freshness?.reviewWorthy && status === 'changed_needs_review' && !reviewItemId) {
      const handoff = await repository.createReviewHandoff({
        sourceId: proof.id,
        checkedAt,
        difficulty: difficultyForProof(proof),
        targetField: 'sourceFreshness',
        normalizedFingerprint: freshness.normalizedFingerprint,
        normalizedDecisionPayload: freshness.normalizedDecisionPayload,
        proof,
      });
      reviewItemId = handoff.reviewItemId;
      summary.reviewsCreated += 1;
    }

    const normalizedPayload =
      freshness?.normalizedDecisionPayload ?? previous?.normalizedDecisionPayload ?? {};
    const rawFingerprint = freshness?.rawFingerprint ?? previous?.rawFingerprint;
    const normalizedFingerprint =
      freshness?.normalizedFingerprint ?? previous?.normalizedFingerprint;
    const lastSuccessfulCheckAt = successful ? checkedAt : previous?.lastSuccessfulCheckAt;
    const lastChangedAt =
      status === 'changed_needs_review' && previous?.normalizedFingerprint !== normalizedFingerprint
        ? checkedAt
        : previous?.lastChangedAt;

    await repository.recordCheck({
      id: randomUUID(),
      sourceId: proof.id,
      sourceClass: proof.sourceClass,
      capability: proof.capability,
      status,
      checkedAt,
      successful,
      failureReason,
      blockedReason: freshness?.blockedReason ?? proof.blockedReason,
      rawFingerprint,
      normalizedFingerprint,
      normalizedDecisionPayload: normalizedPayload,
      reviewWorthy: freshness?.reviewWorthy ?? false,
      reviewItemId,
      nextAction: proof.nextAction,
    });

    await repository.upsertCurrentState({
      sourceId: proof.id,
      sourceClass: proof.sourceClass,
      capability: proof.capability,
      status,
      lastCheckedAt: checkedAt,
      lastSuccessfulCheckAt,
      lastChangedAt,
      latestFailureReason: failureReason,
      blockedReason: freshness?.blockedReason ?? proof.blockedReason,
      rawFingerprint,
      normalizedFingerprint,
      normalizedDecisionPayload: normalizedPayload,
      latestReviewItemId: reviewItemId,
      nextAction: proof.nextAction,
    });

    summary[status] += 1;
  }

  return summary;
}

export function createDrizzleSourceFreshnessRepository(db = getDb()): SourceFreshnessRepository {
  return {
    async ensureIngestionSource(descriptor) {
      const [institutionId, programId] = await Promise.all([
        findExistingInstitutionId(db, descriptor.institutionId),
        findExistingProgramId(db, descriptor.programId),
      ]);

      await db
        .insert(ingestionSources)
        .values({
          id: descriptor.id,
          institutionId,
          programId,
          difficulty: descriptor.difficulty,
          sourceUrl: descriptor.sourceUrl,
          notes: descriptor.notes ?? null,
        })
        .onConflictDoUpdate({
          target: ingestionSources.id,
          set: {
            institutionId,
            programId,
            difficulty: descriptor.difficulty,
            sourceUrl: descriptor.sourceUrl,
            notes: descriptor.notes ?? null,
          },
        });
    },

    async getCurrentState(sourceId) {
      const [row] = await db
        .select()
        .from(sourceFreshnessStates)
        .where(eq(sourceFreshnessStates.sourceId, sourceId))
        .limit(1);

      if (!row) {
        return null;
      }

      return {
        sourceId: row.sourceId,
        sourceClass: row.sourceClass,
        capability: row.capability,
        status: row.status,
        lastCheckedAt: row.lastCheckedAt ?? undefined,
        lastSuccessfulCheckAt: row.lastSuccessfulCheckAt ?? undefined,
        lastChangedAt: row.lastChangedAt ?? undefined,
        latestFailureReason: row.latestFailureReason ?? undefined,
        blockedReason: row.blockedReason ?? undefined,
        rawFingerprint: row.rawFingerprint ?? undefined,
        normalizedFingerprint: row.normalizedFingerprint ?? undefined,
        normalizedDecisionPayload: row.normalizedDecisionPayload,
        latestReviewItemId: row.latestReviewItemId ?? undefined,
        nextAction: row.nextAction ?? undefined,
      };
    },

    async recordCheck(record) {
      await db.insert(sourceFreshnessChecks).values({
        id: record.id,
        sourceId: record.sourceId,
        sourceClass: record.sourceClass,
        capability: record.capability,
        status: record.status,
        checkedAt: record.checkedAt,
        successful: record.successful,
        failureReason: record.failureReason ?? null,
        blockedReason: record.blockedReason ?? null,
        rawFingerprint: record.rawFingerprint ?? null,
        normalizedFingerprint: record.normalizedFingerprint ?? null,
        normalizedDecisionPayload: record.normalizedDecisionPayload,
        reviewWorthy: record.reviewWorthy,
        reviewItemId: record.reviewItemId ?? null,
        nextAction: record.nextAction ?? null,
      });
    },

    async upsertCurrentState(state) {
      await db
        .insert(sourceFreshnessStates)
        .values(stateValues(state))
        .onConflictDoUpdate({
          target: sourceFreshnessStates.sourceId,
          set: {
            sourceClass: state.sourceClass,
            capability: state.capability,
            status: state.status,
            lastCheckedAt: state.lastCheckedAt ?? null,
            lastSuccessfulCheckAt: state.lastSuccessfulCheckAt ?? null,
            lastChangedAt: state.lastChangedAt ?? null,
            latestFailureReason: state.latestFailureReason ?? null,
            blockedReason: state.blockedReason ?? null,
            rawFingerprint: state.rawFingerprint ?? null,
            normalizedFingerprint: state.normalizedFingerprint ?? null,
            normalizedDecisionPayload: state.normalizedDecisionPayload,
            latestReviewItemId: state.latestReviewItemId ?? null,
            nextAction: state.nextAction ?? null,
            updatedAt: new Date(),
          },
        });
    },

    async createReviewHandoff(input) {
      const jobId = randomUUID();
      const payloadId = randomUUID();
      const reviewItemId = randomUUID();
      const proposedValue = {
        sourceId: input.sourceId,
        normalizedFingerprint: input.normalizedFingerprint,
        normalizedDecisionPayload: input.normalizedDecisionPayload,
        reproducedFields: input.proof.reproducedFields,
        limitations: input.proof.limitations,
        nextAction: input.proof.nextAction,
      };

      await db.transaction(async (tx) => {
        await tx.insert(ingestionJobs).values({
          id: jobId,
          sourceId: input.sourceId,
          status: 'needs_review',
          difficulty: input.difficulty,
          startedAt: input.checkedAt,
          completedAt: input.checkedAt,
          errorText: null,
          createdAt: input.checkedAt,
        });
        await tx.insert(ingestionPayloads).values({
          id: payloadId,
          jobId,
          payload: {
            proof: input.proof,
            proposedValue,
          },
          createdAt: input.checkedAt,
        });
        await tx.insert(reviewItems).values({
          id: reviewItemId,
          payloadId,
          admissionRequirementId: null,
          targetField: input.targetField,
          proposedValue,
          status: 'pending',
          createdAt: input.checkedAt,
          reviewedAt: null,
        });
      });

      return { payloadId, reviewItemId };
    },
  };
}

function sourceFreshnessStatusForProof(
  proof: AdmissionsSourceProof,
  freshnessStatus: 'blocked' | 'changed_needs_review' | 'fresh' | undefined,
  pendingSameDecisionChange: boolean,
): SourceFreshnessStatus {
  if (proof.status === 'failed') {
    return 'failed';
  }

  if (pendingSameDecisionChange) {
    return 'changed_needs_review';
  }

  if (freshnessStatus === 'blocked') {
    return 'blocked';
  }

  if (freshnessStatus === 'changed_needs_review') {
    return 'changed_needs_review';
  }

  return 'fresh';
}

function sourceDescriptorForProof(proof: AdmissionsSourceProof): IngestionSourceDescriptor {
  return {
    id: proof.id,
    institutionId: proof.institutionId,
    difficulty: difficultyForProof(proof),
    sourceUrl: proof.officialUrl,
    notes: [
      proof.institutionName,
      proof.proofLevel,
      proof.limitations.length > 0 ? proof.limitations.join('; ') : undefined,
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

function difficultyForProof(proof: AdmissionsSourceProof): IngestionSourceDifficulty {
  if (proof.sourceClass === 'browser_required') {
    return 'browser_required';
  }

  if (proof.status === 'partial') {
    return 'hard_manual';
  }

  return 'easy';
}

function stateValues(state: SourceFreshnessCurrentState) {
  return {
    sourceId: state.sourceId,
    sourceClass: state.sourceClass,
    capability: state.capability,
    status: state.status,
    lastCheckedAt: state.lastCheckedAt ?? null,
    lastSuccessfulCheckAt: state.lastSuccessfulCheckAt ?? null,
    lastChangedAt: state.lastChangedAt ?? null,
    latestFailureReason: state.latestFailureReason ?? null,
    blockedReason: state.blockedReason ?? null,
    rawFingerprint: state.rawFingerprint ?? null,
    normalizedFingerprint: state.normalizedFingerprint ?? null,
    normalizedDecisionPayload: state.normalizedDecisionPayload,
    latestReviewItemId: state.latestReviewItemId ?? null,
    nextAction: state.nextAction ?? null,
  };
}

async function findExistingInstitutionId(
  db: ReturnType<typeof getDb>,
  institutionId: string | undefined,
): Promise<string | null> {
  if (!institutionId) {
    return null;
  }

  const [row] = await db
    .select({ id: institutions.id })
    .from(institutions)
    .where(eq(institutions.id, institutionId))
    .limit(1);
  return row?.id ?? null;
}

async function findExistingProgramId(
  db: ReturnType<typeof getDb>,
  programId: string | undefined,
): Promise<string | null> {
  if (!programId) {
    return null;
  }

  const [row] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(eq(programs.id, programId))
    .limit(1);
  return row?.id ?? null;
}
