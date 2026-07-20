'use client';

import { useActionState } from 'react';

import {
  resolveReviewItemNoChangeFormAction,
  type ReviewActionState,
} from './actions';

interface ReviewActionPanelProps {
  canReject: boolean;
  reviewItemId: string;
}

export default function ReviewActionPanel({
  canReject,
  reviewItemId,
}: ReviewActionPanelProps) {
  const [resolveState, resolveAction, resolvePending] = useActionState<
    ReviewActionState | null,
    FormData
  >(resolveReviewItemNoChangeFormAction.bind(null, reviewItemId), null);

  return (
    <section className="rounded-[1.5rem] border border-slate-950/10 bg-white p-5 shadow-sm">
      <p className="text-sm font-black uppercase tracking-[0.25em] text-slate-500">
        Investigation controls
      </p>
      <p className="mt-3 text-sm text-slate-600">
        This screen cannot approve or publish admissions data. Reviewable changes are approved only by
        merging the combined GitHub PR.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <form action={resolveAction}>
          <button
            className="rounded-full border border-red-800/30 bg-red-50 px-5 py-3 text-sm font-black text-red-900 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            disabled={!canReject || resolvePending}
            type="submit"
          >
            {resolvePending ? 'Resolving...' : 'Resolve investigation — no canonical change'}
          </button>
        </form>
      </div>
      {resolveState ? (
        <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800">
          Investigation result: {resolveState.message}
        </p>
      ) : null}
    </section>
  );
}
