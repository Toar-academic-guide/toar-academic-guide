import 'server-only';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  admissionReleases,
  admissionTargetTransitions,
  admissionAlertTransitionWork,
} from '@/db/schema';
import { admissionCycleFor } from './cycle';
import {
  createDrizzleAdmissionAlertTransitionWorkRepository,
  enqueueAdmissionAlertTransitionWork,
} from './transitionWork';
import {
  createDrizzleAdmissionAlertTransitionProcessorRepository,
  processAdmissionAlertTransitionWork,
} from './transitionProcessor';
import { createAdmissionAlertTransitionEvaluator } from './transitionEvaluator';

export async function runAdmissionAlertProcessing(
  input: { releaseId?: string; maxBatches?: number } = {},
  dependencies: {
    enqueue?: (releaseId: string) => Promise<{ status: string }>;
    enqueueMissed?: () => Promise<void>;
    process?: () => ReturnType<typeof processAdmissionAlertTransitionWork>;
  } = {},
) {
  const maxBatches = input.maxBatches ?? 10;
  if (!Number.isInteger(maxBatches) || maxBatches < 1 || maxBatches > 10)
    throw new Error('maxBatches must be between 1 and 10.');
  const enqueue =
    dependencies.enqueue ?? ((releaseId) => enqueueAdmissionAlertTransitionWork({ releaseId }));
  if (input.releaseId && (await enqueue(input.releaseId)).status !== 'enqueued')
    return { status: 'not_processable' as const, batches: 0, processed: 0 };
  await (dependencies.enqueueMissed ?? enqueueMissedReviewedReleases)();
  const process =
    dependencies.process ??
    (() =>
      processAdmissionAlertTransitionWork({
        repository: createDrizzleAdmissionAlertTransitionProcessorRepository(),
        evaluate: createAdmissionAlertTransitionEvaluator({ fetcher: officialFetcher }),
      }));
  let processed = 0;
  for (let batches = 0; batches < maxBatches; batches++) {
    const result = await process();
    if (result.status === 'idle') return { status: 'idle' as const, batches, processed };
    processed += result.processedSubscriptionCount;
    if (result.status === 'lease_lost')
      return { status: 'lease_lost' as const, batches: batches + 1, processed };
  }
  return { status: 'batch_limit' as const, batches: maxBatches, processed };
}

async function enqueueMissedReviewedReleases() {
  const db = getDb();
  const missing = await db
    .select({ id: admissionReleases.id })
    .from(admissionReleases)
    .innerJoin(
      admissionTargetTransitions,
      eq(admissionTargetTransitions.releaseId, admissionReleases.id),
    )
    .leftJoin(
      admissionAlertTransitionWork,
      eq(admissionAlertTransitionWork.transitionId, admissionTargetTransitions.id),
    )
    .where(
      and(
        eq(admissionReleases.status, 'published'),
        eq(admissionReleases.releaseKind, 'canonical_change'),
        eq(admissionTargetTransitions.cycle, admissionCycleFor()),
        isNull(admissionAlertTransitionWork.id),
      ),
    )
    .orderBy(asc(admissionTargetTransitions.createdAt))
    .limit(100);
  const repository = createDrizzleAdmissionAlertTransitionWorkRepository(db);
  for (const releaseId of new Set(missing.map((row) => row.id)))
    await enqueueAdmissionAlertTransitionWork({ releaseId, repository });
}

// All protected workflow jobs share one concurrency group. A serial fetch queue
// caps total official requests at 30/minute, below the two-call concurrency ceiling.
export function createRateLimitedOfficialFetcher(fetcher: typeof fetch = fetch): typeof fetch {
  let nextStart = 0;
  let pending: Promise<unknown> = Promise.resolve();
  return (resource, init) => {
    const request = pending.then(async () => {
      const delay = Math.max(0, nextStart - Date.now());
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      nextStart = Date.now() + 2000;
      return fetcher(resource, init);
    });
    pending = request.catch(() => undefined);
    return request;
  };
}
const officialFetcher = createRateLimitedOfficialFetcher();
