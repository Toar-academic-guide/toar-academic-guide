'use server';

import { revalidatePath } from 'next/cache';

import {
  approveReviewItem,
  rejectReviewItem,
  type ApproveReviewItemResult,
  type RejectReviewItemResult,
} from '@/server/ingestion/reviewResolution';
import { withReviewResolutionActor } from '@/server/ingestion/reviewResolutionAudit';
import { getInternalAdminAuthorization } from '@/server/internal/adminAuth';

export interface ReviewActionState {
  status: RejectReviewItemResult['status'] | ApproveReviewItemResult['status'] | 'unauthorized';
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

  const result = await withReviewResolutionActor(authorization.user.id, () =>
    rejectReviewItem(reviewItemId),
  );
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
        message:
          'Investigation resolved with no canonical catalogue change. GitHub merge is required to publish admissions data.',
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

export async function resolveReviewItemApproveAction(
  reviewItemId: string,
): Promise<ReviewActionState> {
  const authorization = await getInternalAdminAuthorization();
  if (!authorization.isAdmin) {
    return {
      status: 'unauthorized',
      message: 'Only allowlisted internal admins can resolve review investigations.',
    };
  }
  const result = await withReviewResolutionActor(authorization.user.id, () =>
    approveReviewItem(reviewItemId),
  );
  revalidateReviewRoutes(reviewItemId);
  return messageForApproveResult(result);
}

export async function resolveReviewItemApproveFormAction(
  reviewItemId: string,
  _previousState: ReviewActionState | null,
  _formData: FormData,
): Promise<ReviewActionState> {
  return resolveReviewItemApproveAction(reviewItemId);
}

function messageForApproveResult(result: ApproveReviewItemResult): ReviewActionState {
  const messages: Record<ApproveReviewItemResult['status'], string> = {
    approved: 'השינוי אושר.',
    not_found: 'הפריט לא נמצא.',
    already_resolved: 'הפריט כבר טופל.',
    unsupported_target: 'לא ניתן לאשר שינוי מסוג זה.',
    invalid_proposed_value: 'פרטי השינוי אינם תקינים.',
    stale_review: 'הפריט אינו העדכני למקור זה.',
    publication_failed: 'האישור נכשל. אפשר לנסות שוב.',
  };
  return { status: result.status, message: messages[result.status] };
}
