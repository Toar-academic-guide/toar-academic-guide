'use client';

import { useActionState } from 'react';

import {
  approveReviewItemFormAction,
  rejectReviewItemFormAction,
  type ReviewActionState,
} from './actions';

interface ReviewActionPanelProps {
  approveBlockedReason: string | null;
  canApprove: boolean;
  canReject: boolean;
  reviewItemId: string;
}

export default function ReviewActionPanel({
  approveBlockedReason,
  canApprove,
  canReject,
  reviewItemId,
}: ReviewActionPanelProps) {
  const [approveState, approveAction, approvePending] = useActionState<
    ReviewActionState | null,
    FormData
  >(approveReviewItemFormAction.bind(null, reviewItemId), null);
  const [rejectState, rejectAction, rejectPending] = useActionState<
    ReviewActionState | null,
    FormData
  >(rejectReviewItemFormAction.bind(null, reviewItemId), null);

  return (
    <section className="rounded-[1.5rem] border border-slate-950/10 bg-white p-5 shadow-sm">
      <p className="text-sm font-black uppercase tracking-[0.25em] text-slate-500">
        Operator decision
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <form action={approveAction}>
          <button
            className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!canApprove || approvePending || rejectPending}
            type="submit"
          >
            {approvePending ? 'Approving...' : 'Approve source freshness'}
          </button>
        </form>
        <form action={rejectAction}>
          <button
            className="rounded-full border border-red-800/30 bg-red-50 px-5 py-3 text-sm font-black text-red-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={!canReject || approvePending || rejectPending}
            type="submit"
          >
            {rejectPending ? 'Rejecting...' : 'Reject review item'}
          </button>
        </form>
      </div>
      {approveBlockedReason ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Approval unavailable: {approveBlockedReason}
        </p>
      ) : null}
      {approveState ? (
        <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800">
          Approve result: {approveState.message}
        </p>
      ) : null}
      {rejectState ? (
        <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800">
          Reject result: {rejectState.message}
        </p>
      ) : null}
    </section>
  );
}
