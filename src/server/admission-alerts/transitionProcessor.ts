import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { and, asc, eq, gt, inArray, lte, or, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  admissionAlertBaselineHistory,
  admissionAlertOutbox,
  admissionAlertSubscriptions,
  admissionAlertTransitionWork,
} from '@/db/schema';
import { admissionCycleFor } from './cycle';
import {
  decideAdmissionAlertTransition,
  type AlertTransitionDecision,
  type AlertTransitionEvaluation,
  type AlertTransitionSubscription,
} from './transitionDecision';

export const ALERT_TRANSITION_BATCH_SIZE = 100;
export const ALERT_TRANSITION_LEASE_MS = 15 * 60_000;
const RETRY_DELAY_MS = 5 * 60_000;
const MAX_ATTEMPTS = 3;
type RetryState = Record<string, { attempts: number; nextAttemptAt: string; quarantined: boolean }>;
interface WorkSubscription extends AlertTransitionSubscription {
  id: string;
  profileVersionId: string;
}
export interface ClaimedAlertTransitionWork {
  id: string;
  claimToken: string;
  transitionId: string;
  institutionId: string;
  programId: string;
  afterVersion: string;
  transitionAt: Date;
  subscriptions: WorkSubscription[];
}
export interface AdmissionAlertTransitionProcessorRepository {
  claimNextWork(input: {
    currentCycle: string;
    now: Date;
  }): Promise<ClaimedAlertTransitionWork | null>;
  recordDecision(input: {
    work: ClaimedAlertTransitionWork;
    subscription: WorkSubscription;
    decision: AlertTransitionDecision;
    now: Date;
  }): Promise<boolean>;
  finishBatch(
    work: ClaimedAlertTransitionWork,
    now: Date,
  ): Promise<'pending' | 'completed' | 'lease_lost'>;
  releaseWork(work: ClaimedAlertTransitionWork, now: Date): Promise<void>;
}

export async function processAdmissionAlertTransitionWork(input: {
  repository: AdmissionAlertTransitionProcessorRepository;
  evaluate: (subscription: {
    subscriptionId: string;
    transitionId: string;
    profileHash: string;
    profileVersionId: string;
    institutionId: string;
    programId: string;
    ruleVersion: string;
  }) => Promise<AlertTransitionEvaluation>;
  now?: Date;
}) {
  const clock = () => input.now ?? new Date();
  const work = await input.repository.claimNextWork({
    currentCycle: admissionCycleFor(clock()),
    now: clock(),
  });
  if (!work) return { status: 'idle' as const };
  let processedSubscriptionCount = 0;
  try {
    for (const subscription of work.subscriptions) {
      let decision: AlertTransitionDecision;
      if (subscription.status !== 'active') {
        decision = { action: 'skip', reason: 'subscription_not_active' };
      } else {
        try {
          const evaluation = await input.evaluate({
            subscriptionId: subscription.id,
            transitionId: work.transitionId,
            profileHash: subscription.profileHash,
            profileVersionId: subscription.profileVersionId,
            institutionId: work.institutionId,
            programId: work.programId,
            ruleVersion: work.afterVersion,
          });
          decision =
            evaluation.ruleVersion !== work.afterVersion
              ? { action: 'retry_later', reason: 'evaluation_unavailable' }
              : decideAdmissionAlertTransition({
                  subscription,
                  evaluatedProfileHash: subscription.profileHash,
                  evaluation,
                });
        } catch {
          // Evaluator errors may contain academic inputs; store only a fixed reason.
          decision = { action: 'retry_later', reason: 'evaluation_unavailable' };
        }
      }
      if (
        !(await input.repository.recordDecision({ work, subscription, decision, now: clock() }))
      ) {
        return { status: 'lease_lost' as const, processedSubscriptionCount };
      }
      processedSubscriptionCount += 1;
    }
    return {
      status: await input.repository.finishBatch(work, clock()),
      processedSubscriptionCount,
    };
  } catch (error) {
    await input.repository.releaseWork(work, clock());
    throw error;
  }
}

export function createDrizzleAdmissionAlertTransitionProcessorRepository(
  db = getDb(),
): AdmissionAlertTransitionProcessorRepository {
  const scope = (
    work: { institutionId: string; programId: string; transitionAt: Date },
    cycle: string,
  ) =>
    and(
      eq(admissionAlertSubscriptions.institutionId, work.institutionId),
      eq(admissionAlertSubscriptions.programId, work.programId),
      eq(admissionAlertSubscriptions.cycle, cycle),
      inArray(admissionAlertSubscriptions.status, ['active', 'needs_profile_refresh']),
      lte(admissionAlertSubscriptions.activatedAt, work.transitionAt),
      sql`coalesce(${admissionAlertSubscriptions.refreshedAt},${admissionAlertSubscriptions.activatedAt}) <= ${work.transitionAt.toISOString()}::timestamptz`,
    );
  return {
    async claimNextWork({ currentCycle, now }) {
      return db.transaction(async (tx) => {
        await tx.execute(sql`update admission_alert_transition_work set status='pending', claim_token=null,
          lease_expires_at=null, updated_at=${now.toISOString()}::timestamptz
          where status='processing' and (lease_expires_at is null or lease_expires_at <= ${now.toISOString()}::timestamptz)`);
        const [candidate] = await tx.execute<{
          id: string;
          transition_id: string;
          institution_id: string;
          program_id: string;
          after_version: string;
          created_at: string;
          cursor: string | null;
          retry_state: RetryState;
        }>(sql`select w.id,w.transition_id,t.institution_id,t.program_id,t.after_version,t.created_at,w.cursor,w.retry_state
          from admission_alert_transition_work w
          join admission_target_transitions t on t.id=w.transition_id
          join admission_releases r on r.id=t.release_id
          where w.status='pending' and (w.next_attempt_at is null or w.next_attempt_at <= ${now.toISOString()}::timestamptz)
            and r.status='published' and r.release_kind='canonical_change' and t.cycle=${currentCycle}
            and not exists (
              select 1 from admission_target_transitions earlier
              join admission_releases er on er.id=earlier.release_id
              left join admission_alert_transition_work ew on ew.transition_id=earlier.id
              where earlier.institution_id=t.institution_id and earlier.program_id=t.program_id and earlier.cycle=t.cycle
                and er.status='published' and er.release_kind='canonical_change'
                and (earlier.created_at,earlier.id) < (t.created_at,t.id)
                and (ew.id is null or ew.status <> 'completed')
            )
          order by t.created_at,t.id limit 1 for update of w skip locked`);
        if (!candidate) return null;
        const claimToken = randomUUID();
        await tx
          .update(admissionAlertTransitionWork)
          .set({
            status: 'processing',
            claimToken,
            claimedAt: now,
            leaseExpiresAt: new Date(now.getTime() + ALERT_TRANSITION_LEASE_MS),
            nextAttemptAt: null,
            failureReason: null,
            updatedAt: now,
          })
          .where(eq(admissionAlertTransitionWork.id, candidate.id));
        const retryIds = Object.entries(candidate.retry_state)
          .filter(([, retry]) => !retry.quarantined && new Date(retry.nextAttemptAt) <= now)
          .map(([id]) => id);
        const subscriptions = await tx
          .select({
            id: admissionAlertSubscriptions.id,
            status: admissionAlertSubscriptions.status,
            profileHash: admissionAlertSubscriptions.profileHash,
            profileVersionId: admissionAlertSubscriptions.profileVersionId,
            baselineVerdict: admissionAlertSubscriptions.baselineVerdict,
          })
          .from(admissionAlertSubscriptions)
          .where(
            and(
              scope(
                {
                  institutionId: candidate.institution_id,
                  programId: candidate.program_id,
                  transitionAt: new Date(candidate.created_at),
                },
                currentCycle,
              ),
              or(
                candidate.cursor ? gt(admissionAlertSubscriptions.id, candidate.cursor) : sql`true`,
                retryIds.length ? inArray(admissionAlertSubscriptions.id, retryIds) : sql`false`,
              ),
            ),
          )
          .orderBy(asc(admissionAlertSubscriptions.id))
          .limit(ALERT_TRANSITION_BATCH_SIZE);
        return {
          id: candidate.id,
          claimToken,
          transitionId: candidate.transition_id,
          institutionId: candidate.institution_id,
          programId: candidate.program_id,
          afterVersion: candidate.after_version,
          transitionAt: new Date(candidate.created_at),
          subscriptions,
        };
      });
    },
    async recordDecision({ work, subscription: evaluated, decision, now }) {
      return db.transaction(async (tx) => {
        const [claim] = await tx
          .select()
          .from(admissionAlertTransitionWork)
          .where(
            and(
              eq(admissionAlertTransitionWork.id, work.id),
              eq(admissionAlertTransitionWork.claimToken, work.claimToken),
              eq(admissionAlertTransitionWork.status, 'processing'),
              gt(admissionAlertTransitionWork.leaseExpiresAt, now),
            ),
          )
          .for('update');
        if (!claim) return false;
        const [subscription] = await tx
          .select()
          .from(admissionAlertSubscriptions)
          .where(eq(admissionAlertSubscriptions.id, evaluated.id))
          .for('update');
        const retryState = { ...claim.retryState };
        const matches =
          subscription?.status === 'active' &&
          subscription.profileHash === evaluated.profileHash &&
          subscription.profileVersionId === evaluated.profileVersionId &&
          subscription.cycle === admissionCycleFor(now);
        if (matches && decision.action === 'retry_later') {
          const attempts = (retryState[evaluated.id]?.attempts ?? 0) + 1;
          retryState[evaluated.id] = {
            attempts,
            quarantined: attempts >= MAX_ATTEMPTS,
            nextAttemptAt: new Date(now.getTime() + RETRY_DELAY_MS).toISOString(),
          };
        } else {
          delete retryState[evaluated.id];
          if (
            matches &&
            decision.action === 'advance_baseline' &&
            subscription.baselineRuleVersion !== decision.ruleVersion
          ) {
            await tx
              .update(admissionAlertSubscriptions)
              .set({
                baselineRuleVersion: decision.ruleVersion,
                baselineVerdict: { decision: 'below' },
                updatedAt: now,
              })
              .where(eq(admissionAlertSubscriptions.id, evaluated.id));
            await tx.insert(admissionAlertBaselineHistory).values({
              subscriptionId: evaluated.id,
              profileVersionId: evaluated.profileVersionId,
              profileHash: evaluated.profileHash,
              ruleVersion: decision.ruleVersion,
              verdict: { decision: 'below' },
            });
          }
          if (matches && decision.action === 'queue_delivery') {
            await tx
              .insert(admissionAlertOutbox)
              .values({
                subscriptionId: evaluated.id,
                transitionId: work.transitionId,
                idempotencyKey: alertDeliveryIdempotencyKey(evaluated.id, work.transitionId),
              })
              .onConflictDoNothing();
            await tx
              .update(admissionAlertSubscriptions)
              .set({ status: 'pending_delivery', updatedAt: now })
              .where(eq(admissionAlertSubscriptions.id, evaluated.id));
          }
        }
        await tx
          .update(admissionAlertTransitionWork)
          .set({
            retryState,
            cursor: !claim.cursor || evaluated.id > claim.cursor ? evaluated.id : claim.cursor,
            updatedAt: now,
          })
          .where(eq(admissionAlertTransitionWork.id, work.id));
        return true;
      });
    },
    async finishBatch(work, now) {
      return db.transaction(async (tx) => {
        const [claim] = await tx
          .select()
          .from(admissionAlertTransitionWork)
          .where(
            and(
              eq(admissionAlertTransitionWork.id, work.id),
              eq(admissionAlertTransitionWork.claimToken, work.claimToken),
              eq(admissionAlertTransitionWork.status, 'processing'),
              gt(admissionAlertTransitionWork.leaseExpiresAt, now),
            ),
          )
          .for('update');
        if (!claim) return 'lease_lost';
        const [more] = await tx
          .select({ id: admissionAlertSubscriptions.id })
          .from(admissionAlertSubscriptions)
          .where(
            and(
              scope(work, admissionCycleFor(now)),
              claim.cursor ? gt(admissionAlertSubscriptions.id, claim.cursor) : undefined,
            ),
          )
          .limit(1);
        // Consent or profile changes can remove a retry candidate between batches.
        // Drop those retries so they cannot keep the target queue pending forever.
        const retryState = { ...claim.retryState };
        const retryIds = Object.keys(retryState);
        if (retryIds.length) {
          const active = await tx
            .select({ id: admissionAlertSubscriptions.id })
            .from(admissionAlertSubscriptions)
            .where(
              and(
                scope(work, admissionCycleFor(now)),
                eq(admissionAlertSubscriptions.status, 'active'),
                inArray(admissionAlertSubscriptions.id, retryIds),
              ),
            );
          const activeIds = new Set(active.map((row) => row.id));
          for (const id of retryIds) if (!activeIds.has(id)) delete retryState[id];
        }
        const pending = Object.values(retryState).filter((retry) => !retry.quarantined);
        const status = more || pending.length ? 'pending' : 'completed';
        const nextAttemptAt =
          !more && pending.length
            ? new Date(Math.min(...pending.map((retry) => new Date(retry.nextAttemptAt).getTime())))
            : null;
        await tx
          .update(admissionAlertTransitionWork)
          .set({
            status,
            retryState,
            claimToken: null,
            leaseExpiresAt: null,
            nextAttemptAt,
            completedAt: status === 'completed' ? now : null,
            updatedAt: now,
          })
          .where(eq(admissionAlertTransitionWork.id, work.id));
        return status;
      });
    },
    async releaseWork(work, now) {
      await db
        .update(admissionAlertTransitionWork)
        .set({ status: 'pending', claimToken: null, leaseExpiresAt: null, updatedAt: now })
        .where(
          and(
            eq(admissionAlertTransitionWork.id, work.id),
            eq(admissionAlertTransitionWork.claimToken, work.claimToken),
          ),
        );
    },
  };
}

function alertDeliveryIdempotencyKey(subscriptionId: string, transitionId: string) {
  return `admission-alert:${createHash('sha256').update(`${subscriptionId}:${transitionId}`).digest('hex')}`;
}
