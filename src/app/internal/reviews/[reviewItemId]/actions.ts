'use server';

import { revalidatePath } from 'next/cache';

import {
  rejectReviewItem,
  type RejectReviewItemResult,
} from '@/server/ingestion/reviewResolution';
import { getInternalAdminAuthorization } from '@/server/internal/adminAuth';

export interface ReviewActionState {
  status: RejectReviewItemResult['status'] | 'unauthorized';
  message: string;
}

export async function resolveReviewItemNoChangeAction(
  reviewItemId: string,
): Promise<ReviewActionState> {
  const authorization = await getInternalAdminAuthorization();
  if (!authorization.isAdmin) {
    return {
      status: 'unauthorized',
      message: 'Only allowlisted internal admins can resolve review investigations.',
    };
  }

  const result = await rejectReviewItem(reviewItemId);
  revalidateReviewRoutes(reviewItemId);

  return messageForRejectResult(result);
}

export async function resolveReviewItemNoChangeFormAction(
  reviewItemId: string,
  _previousState: ReviewActionState | null,
  _formData: FormData,
): Promise<ReviewActionState> {
  return resolveReviewItemNoChangeAction(reviewItemId);
}

function revalidateReviewRoutes(reviewItemId: string) {
  revalidatePath(`/internal/reviews/${reviewItemId}`);
  revalidatePath('/internal/data-health');
}

function messageForRejectResult(result: RejectReviewItemResult): ReviewActionState {
  switch (result.status) {
    case 'rejected':
      return {
        status: result.status,
        message: 'Investigation resolved with no canonical catalogue change. GitHub merge is required to publish admissions data.',
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
