import { and, eq } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { reviewItems, sourceFreshnessStates } from '@/db/schema';
import { parseSourceFreshnessProposedValue, type ReviewItemStatus } from './reviewTypes';

export interface ReviewResolutionItem {
  id: string;
  targetField: string;
  proposedValue: unknown;
  status: ReviewItemStatus;
}

export interface ReviewResolutionRepository {
  getReviewItem(reviewItemId: string): Promise<ReviewResolutionItem | null>;
  markReviewItemRejected(input: { reviewItemId: string; reviewedAt: Date }): Promise<void>;
  markSourceFreshnessReviewApproved(input: {
    reviewItemId: string;
    sourceId: string;
    reviewedAt: Date;
  }): Promise<'approved' | 'stale_review'>;
}

export type RejectReviewItemResult =
  | { status: 'rejected' }
  | { status: 'not_found' }
  | { status: 'already_resolved'; reviewItemStatus: Exclude<ReviewItemStatus, 'pending'> };

export type ApproveReviewItemResult =
  | { status: 'approved' }
  | { status: 'not_found' }
  | { status: 'already_resolved'; reviewItemStatus: Exclude<ReviewItemStatus, 'pending'> }
  | { status: 'unsupported_target'; targetField: string }
  | { status: 'invalid_proposed_value' }
  | { status: 'stale_review' }
  | { status: 'publication_failed' };

interface ReviewResolutionOptions {
  repository?: ReviewResolutionRepository;
  reviewedAt?: Date;
}

export async function rejectReviewItem(
  reviewItemId: string,
  options: ReviewResolutionOptions = {},
): Promise<RejectReviewItemResult> {
  const repository = options.repository ?? createDrizzleReviewResolutionRepository();
  const reviewItem = await repository.getReviewItem(reviewItemId);

  if (!reviewItem) {
    return { status: 'not_found' };
  }

  if (reviewItem.status !== 'pending') {
    return {
      status: 'already_resolved',
      reviewItemStatus: reviewItem.status,
    };
  }

  await repository.markReviewItemRejected({
    reviewItemId,
    reviewedAt: options.reviewedAt ?? new Date(),
  });

  return { status: 'rejected' };
}

export async function approveReviewItem(
  reviewItemId: string,
  options: ReviewResolutionOptions = {},
): Promise<ApproveReviewItemResult> {
  const repository = options.repository ?? createDrizzleReviewResolutionRepository();
  const reviewItem = await repository.getReviewItem(reviewItemId);

  if (!reviewItem) {
    return { status: 'not_found' };
  }

  if (reviewItem.status !== 'pending') {
    return {
      status: 'already_resolved',
      reviewItemStatus: reviewItem.status,
    };
  }

  if (reviewItem.targetField !== 'sourceFreshness') {
    return {
      status: 'unsupported_target',
      targetField: reviewItem.targetField,
    };
  }

  const parsed = parseSourceFreshnessProposedValue(reviewItem.proposedValue);
  if (!parsed.ok) {
    return { status: 'invalid_proposed_value' };
  }

  try {
    const result = await repository.markSourceFreshnessReviewApproved({
      reviewItemId,
      sourceId: parsed.value.sourceId,
      reviewedAt: options.reviewedAt ?? new Date(),
    });

    return result === 'approved' ? { status: 'approved' } : { status: 'stale_review' };
  } catch {
    return { status: 'publication_failed' };
  }
}

export function createDrizzleReviewResolutionRepository(db = getDb()): ReviewResolutionRepository {
  return {
    async getReviewItem(reviewItemId) {
      const [row] = await db
        .select({
          id: reviewItems.id,
          targetField: reviewItems.targetField,
          proposedValue: reviewItems.proposedValue,
          status: reviewItems.status,
        })
        .from(reviewItems)
        .where(eq(reviewItems.id, reviewItemId))
        .limit(1);

      return row ?? null;
    },

    async markReviewItemRejected({ reviewItemId, reviewedAt }) {
      await db
        .update(reviewItems)
        .set({
          status: 'rejected',
          reviewedAt,
        })
        .where(and(eq(reviewItems.id, reviewItemId), eq(reviewItems.status, 'pending')));
    },

    async markSourceFreshnessReviewApproved({ reviewItemId, reviewedAt, sourceId }) {
      return db.transaction(async (tx) => {
        const [reviewItem] = await tx
          .select({
            id: reviewItems.id,
            status: reviewItems.status,
          })
          .from(reviewItems)
          .where(eq(reviewItems.id, reviewItemId))
          .limit(1);

        if (!reviewItem) {
          return 'stale_review';
        }

        if (reviewItem.status !== 'pending') {
          return 'stale_review';
        }

        const [sourceState] = await tx
          .select({
            latestReviewItemId: sourceFreshnessStates.latestReviewItemId,
          })
          .from(sourceFreshnessStates)
          .where(eq(sourceFreshnessStates.sourceId, sourceId))
          .limit(1);

        if (!sourceState || sourceState.latestReviewItemId !== reviewItemId) {
          return 'stale_review';
        }

        const [approvedReviewItem] = await tx
          .update(reviewItems)
          .set({
            status: 'approved',
            reviewedAt,
          })
          .where(and(eq(reviewItems.id, reviewItemId), eq(reviewItems.status, 'pending')))
          .returning({ id: reviewItems.id });

        if (!approvedReviewItem) {
          return 'stale_review';
        }

        await tx
          .update(sourceFreshnessStates)
          .set({
            status: 'fresh',
            latestReviewItemId: null,
            latestFailureReason: null,
            nextAction: null,
            updatedAt: reviewedAt,
          })
          .where(eq(sourceFreshnessStates.sourceId, sourceId));

        return 'approved';
      });
    },
  };
}
