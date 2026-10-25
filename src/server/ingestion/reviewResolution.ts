import { and, eq } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { reviewItems, sourceFreshnessStates } from '@/db/schema';
import { parseSourceFreshnessProposedValue, type ReviewItemStatus } from './reviewTypes';
import { getReviewResolutionActor } from './reviewResolutionAudit';

export interface ReviewResolutionItem {
  id: string;
  targetField: string;
  proposedValue: unknown;
  status: ReviewItemStatus;
}

interface FreshnessTransition {
  sourceId: string | null;
  previousFreshnessStatus: string | null;
  newFreshnessStatus: string | null;
}

type RejectionTransition = FreshnessTransition &
  (
    | { status: 'rejected' }
    | { status: 'already_resolved'; reviewItemStatus: Exclude<ReviewItemStatus, 'pending'> }
    | { status: 'not_found' }
  );
type ApprovalTransition = FreshnessTransition & { status: 'approved' | 'stale_review' };

export interface ReviewResolutionRepository {
  getReviewItem(reviewItemId: string): Promise<ReviewResolutionItem | null>;
  markReviewItemRejected(input: {
    reviewItemId: string;
    reviewedAt: Date;
  }): Promise<void | RejectionTransition>;
  markSourceFreshnessReviewApproved(input: {
    reviewItemId: string;
    sourceId: string;
    reviewedAt: Date;
  }): Promise<'approved' | 'stale_review' | ApprovalTransition>;
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

export interface ReviewResolutionAuditEntry extends FreshnessTransition {
  event: 'admissions_review_item_resolved';
  action: 'approve' | 'reject';
  reviewItemId: string;
  actor: string | null;
  status:
    ApproveReviewItemResult['status'] | RejectReviewItemResult['status'] | 'resolution_failed';
}

interface ReviewResolutionOptions {
  repository?: ReviewResolutionRepository;
  reviewedAt?: Date;
  actor?: string;
  auditLog?: (entry: ReviewResolutionAuditEntry) => void;
}

export async function rejectReviewItem(
  reviewItemId: string,
  options: ReviewResolutionOptions = {},
): Promise<RejectReviewItemResult> {
  return resolveReviewItem('reject', reviewItemId, options);
}

export async function approveReviewItem(
  reviewItemId: string,
  options: ReviewResolutionOptions = {},
): Promise<ApproveReviewItemResult> {
  return resolveReviewItem('approve', reviewItemId, options);
}

function resolveReviewItem(
  action: 'reject',
  reviewItemId: string,
  options: ReviewResolutionOptions,
): Promise<RejectReviewItemResult>;
function resolveReviewItem(
  action: 'approve',
  reviewItemId: string,
  options: ReviewResolutionOptions,
): Promise<ApproveReviewItemResult>;
async function resolveReviewItem(
  action: 'approve' | 'reject',
  reviewItemId: string,
  options: ReviewResolutionOptions,
): Promise<ApproveReviewItemResult | RejectReviewItemResult> {
  let transition = emptyTransition();
  let result: ApproveReviewItemResult | RejectReviewItemResult | undefined;
  try {
    const repository = options.repository ?? createDrizzleReviewResolutionRepository();
    const reviewItem = await repository.getReviewItem(reviewItemId);
    if (!reviewItem) return (result = { status: 'not_found' });

    const parsed =
      reviewItem.targetField === 'sourceFreshness'
        ? parseSourceFreshnessProposedValue(reviewItem.proposedValue)
        : null;
    if (parsed?.ok) transition.sourceId = parsed.value.sourceId;

    if (reviewItem.status !== 'pending') {
      return (result = { status: 'already_resolved', reviewItemStatus: reviewItem.status });
    }

    const reviewedAt = options.reviewedAt ?? new Date();
    if (action === 'reject') {
      const rejected = await repository.markReviewItemRejected({ reviewItemId, reviewedAt });
      // Older injected repositories do not return transaction metadata.
      if (!rejected) return (result = { status: 'rejected' });
      transition = rejected;
      return (result =
        rejected.status === 'already_resolved'
          ? { status: rejected.status, reviewItemStatus: rejected.reviewItemStatus }
          : { status: rejected.status });
    }

    if (reviewItem.targetField !== 'sourceFreshness') {
      return (result = { status: 'unsupported_target', targetField: reviewItem.targetField });
    }
    if (!parsed?.ok) return (result = { status: 'invalid_proposed_value' });

    try {
      const approved = await repository.markSourceFreshnessReviewApproved({
        reviewItemId,
        sourceId: parsed.value.sourceId,
        reviewedAt,
      });
      if (typeof approved !== 'string') transition = approved;
      return (result = { status: typeof approved === 'string' ? approved : approved.status });
    } catch {
      return (result = { status: 'publication_failed' });
    }
  } finally {
    (options.auditLog ?? console.info)({
      event: 'admissions_review_item_resolved',
      action,
      reviewItemId,
      actor: options.actor ?? getReviewResolutionActor(),
      sourceId: transition.sourceId,
      status: result?.status ?? 'resolution_failed',
      previousFreshnessStatus: transition.previousFreshnessStatus,
      newFreshnessStatus: transition.newFreshnessStatus,
    });
  }
}

function emptyTransition(sourceId: string | null = null): FreshnessTransition {
  return { sourceId, previousFreshnessStatus: null, newFreshnessStatus: null };
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
      return db.transaction(async (tx): Promise<RejectionTransition> => {
        const [reviewItem] = await tx
          .select({
            id: reviewItems.id,
            status: reviewItems.status,
            targetField: reviewItems.targetField,
            proposedValue: reviewItems.proposedValue,
          })
          .from(reviewItems)
          .where(eq(reviewItems.id, reviewItemId))
          .limit(1)
          .for('update');
        if (!reviewItem) return { status: 'not_found', ...emptyTransition() };
        const parsed =
          reviewItem.targetField === 'sourceFreshness'
            ? parseSourceFreshnessProposedValue(reviewItem.proposedValue)
            : null;
        const sourceId = parsed?.ok ? parsed.value.sourceId : null;
        const transition = emptyTransition(sourceId);
        if (reviewItem.status !== 'pending') {
          return { status: 'already_resolved', reviewItemStatus: reviewItem.status, ...transition };
        }

        const [rejectedItem] = await tx
          .update(reviewItems)
          .set({ status: 'rejected', reviewedAt })
          .where(and(eq(reviewItems.id, reviewItemId), eq(reviewItems.status, 'pending')))
          .returning({ id: reviewItems.id });
        if (!rejectedItem) {
          const [resolvedItem] = await tx
            .select({ status: reviewItems.status })
            .from(reviewItems)
            .where(eq(reviewItems.id, reviewItemId))
            .limit(1);
          if (!resolvedItem) return { status: 'not_found', ...transition };
          if (resolvedItem.status === 'pending') throw new Error('Review item was not rejected');
          return {
            status: 'already_resolved',
            reviewItemStatus: resolvedItem.status,
            ...transition,
          };
        }

        // Malformed proposed values still allow rejection, but cannot identify a freshness row.
        if (sourceId) {
          const [sourceState] = await tx
            .select({
              status: sourceFreshnessStates.status,
              latestReviewItemId: sourceFreshnessStates.latestReviewItemId,
            })
            .from(sourceFreshnessStates)
            .where(eq(sourceFreshnessStates.sourceId, sourceId))
            .limit(1)
            .for('update');
          if (sourceState) {
            transition.previousFreshnessStatus = sourceState.status;
            transition.newFreshnessStatus = sourceState.status;
            if (sourceState.latestReviewItemId === reviewItemId) {
              await tx
                .update(sourceFreshnessStates)
                .set({
                  status: 'fresh',
                  latestReviewItemId: null,
                  latestFailureReason: null,
                  nextAction: null,
                  updatedAt: reviewedAt,
                })
                .where(
                  and(
                    eq(sourceFreshnessStates.sourceId, sourceId),
                    eq(sourceFreshnessStates.latestReviewItemId, reviewItemId),
                  ),
                );
              transition.newFreshnessStatus = 'fresh';
            }
          }
        }
        return { status: 'rejected', ...transition };
      });
    },

    async markSourceFreshnessReviewApproved({ reviewItemId, reviewedAt, sourceId }) {
      return db.transaction(async (tx): Promise<ApprovalTransition> => {
        const [reviewItem] = await tx
          .select({
            id: reviewItems.id,
            status: reviewItems.status,
          })
          .from(reviewItems)
          .where(eq(reviewItems.id, reviewItemId))
          .limit(1)
          .for('update');

        if (!reviewItem) {
          return { status: 'stale_review', ...emptyTransition(sourceId) };
        }

        if (reviewItem.status !== 'pending') {
          return { status: 'stale_review', ...emptyTransition(sourceId) };
        }

        const [sourceState] = await tx
          .select({
            latestReviewItemId: sourceFreshnessStates.latestReviewItemId,
            status: sourceFreshnessStates.status,
          })
          .from(sourceFreshnessStates)
          .where(eq(sourceFreshnessStates.sourceId, sourceId))
          .limit(1)
          .for('update');

        const transition: FreshnessTransition = {
          sourceId,
          previousFreshnessStatus: sourceState?.status ?? null,
          newFreshnessStatus: sourceState?.status ?? null,
        };
        if (!sourceState || sourceState.latestReviewItemId !== reviewItemId) {
          return { status: 'stale_review', ...transition };
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
          return { status: 'stale_review', ...transition };
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
          .where(
            and(
              eq(sourceFreshnessStates.sourceId, sourceId),
              eq(sourceFreshnessStates.latestReviewItemId, reviewItemId),
            ),
          );

        return { status: 'approved', ...transition, newFreshnessStatus: 'fresh' };
      });
    },
  };
}
