'use server';

import { revalidatePath } from 'next/cache';

import {
  approveReviewItem,
  rejectReviewItem,
  type ApproveReviewItemResult,
  type RejectReviewItemResult,
} from '@/server/ingestion/reviewResolution';
import { getInternalAdminAuthorization } from '@/server/internal/adminAuth';

export interface ReviewActionState {
  status: ApproveReviewItemResult['status'] | RejectReviewItemResult['status'] | 'unauthorized';
  message: string;
}

export async function approveReviewItemAction(reviewItemId: string): Promise<ReviewActionState> {
  const authorization = await getInternalAdminAuthorization();
  if (!authorization.isAdmin) {
    return {
      status: 'unauthorized',
      message: 'Only allowlisted internal admins can approve review items.',
    };
  }

  const result = await approveReviewItem(reviewItemId);
  revalidateReviewRoutes(reviewItemId);

  return messageForApproveResult(result);
}

export async function rejectReviewItemAction(reviewItemId: string): Promise<ReviewActionState> {
  const authorization = await getInternalAdminAuthorization();
  if (!authorization.isAdmin) {
    return {
      status: 'unauthorized',
      message: 'Only allowlisted internal admins can reject review items.',
    };
  }

  const result = await rejectReviewItem(reviewItemId);
  revalidateReviewRoutes(reviewItemId);

  return messageForRejectResult(result);
}

export async function approveReviewItemFormAction(
  reviewItemId: string,
  _previousState: ReviewActionState | null,
  _formData: FormData,
): Promise<ReviewActionState> {
  return approveReviewItemAction(reviewItemId);
}

export async function rejectReviewItemFormAction(
  reviewItemId: string,
  _previousState: ReviewActionState | null,
  _formData: FormData,
): Promise<ReviewActionState> {
  return rejectReviewItemAction(reviewItemId);
}

function revalidateReviewRoutes(reviewItemId: string) {
  revalidatePath(`/internal/reviews/${reviewItemId}`);
  revalidatePath('/internal/data-health');
}

function messageForApproveResult(result: ApproveReviewItemResult): ReviewActionState {
  switch (result.status) {
    case 'approved':
      return {
        status: result.status,
        message: 'Review item approved and source freshness state resolved.',
      };
    case 'already_resolved':
      return {
        status: result.status,
        message: `Review item is already ${result.reviewItemStatus}.`,
      };
    case 'unsupported_target':
      return {
        status: result.status,
        message: `Approval is not supported for target field "${result.targetField}".`,
      };
    case 'invalid_proposed_value':
      return {
        status: result.status,
        message: 'Review item has an invalid source freshness proposed value.',
      };
    case 'stale_review':
      return {
        status: result.status,
        message: 'Source freshness state no longer points at this review item.',
      };
    case 'publication_failed':
      return {
        status: result.status,
        message: 'Approval failed before publication completed. The item was not approved.',
      };
    case 'not_found':
      return {
        status: result.status,
        message: 'Review item was not found.',
      };
  }
}

function messageForRejectResult(result: RejectReviewItemResult): ReviewActionState {
  switch (result.status) {
    case 'rejected':
      return {
        status: result.status,
        message: 'Review item rejected without publishing canonical catalogue changes.',
      };
    case 'already_resolved':
      return {
        status: result.status,
        message: `Review item is already ${result.reviewItemStatus}.`,
      };
    case 'not_found':
      return {
        status: result.status,
        message: 'Review item was not found.',
      };
  }
}
