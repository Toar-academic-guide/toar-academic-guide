import 'server-only';

import { createHash } from 'node:crypto';

import { and, asc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/db/client';
import {
  admissionAlertBaselineHistory,
  admissionAlertOutbox,
  admissionAlertSubscriptions,
  admissionAlertTransitionWork,
  admissionReleases,
  admissionTargetTransitions,
} from '@/db/schema';
import { admissionCycleFor } from './cycle';
import { decideAdmissionAlertTransition, type AlertTransitionDecision } from './transitionDecision';

export interface AdmissionAlertTransitionProcessorRepository {
  claimNextWork(input: { currentCycle: string }): Promise<{
    id: string;
    transitionId: string;
    subscriptions: Array<{
      id: string;
      status:
        | 'active'
        | 'needs_profile_refresh'
        | 'pending_delivery'
        | 'notified'
        | 'cancelled'
        | 'expired'
        | 'delivery_failed';
      profileHash: string;
      profileVersionId: string;
      baselineVerdict: { decision?: unknown };
    }>;
  } | null>;
  recordDecision(input: {
    transitionId: string;
    subscriptionId: string;
    action: string;
    ruleVersion?: string;
  }): Promise<void>;
  completeWork(workId: string): Promise<void>;
  retryWork(workId: string): Promise<void>;
}

export async function processAdmissionAlertTransitionWork(input: {
  repository: AdmissionAlertTransitionProcessorRepository;
  evaluate: (subscription: { subscriptionId: string; profileHash: string }) => Promise<{
    decision: 'below' | 'eligible' | 'unavailable';
    isMathematicallyVerified: boolean;
    ruleVersion: string;
  }>;
  now?: Date;
}): Promise<
  | { status: 'idle' }
  | { status: 'retry_later' }
  | { status: 'completed'; processedSubscriptionCount: number }
> {
  const work = await input.repository.claimNextWork({
    currentCycle: admissionCycleFor(input.now),
  });
  if (!work) return { status: 'idle' };

  const decisions: Array<{ subscriptionId: string; decision: AlertTransitionDecision }> = [];
  for (const subscription of work.subscriptions) {
    const evaluation = await input.evaluate({
      subscriptionId: subscription.id,
      profileHash: subscription.profileHash,
    });
    const decision = decideAdmissionAlertTransition({
      subscription,
      evaluatedProfileHash: subscription.profileHash,
      evaluation,
    });
    if (decision.action === 'retry_later') {
      await input.repository.retryWork(work.id);
      return { status: 'retry_later' };
    }
    decisions.push({ subscriptionId: subscription.id, decision });
  }

  for (const item of decisions) {
    if (item.decision.action === 'queue_delivery' || item.decision.action === 'advance_baseline') {
      await input.repository.recordDecision({
        transitionId: work.transitionId,
        subscriptionId: item.subscriptionId,
        action: item.decision.action,
        ruleVersion: item.decision.ruleVersion,
      });
    }
  }
  await input.repository.completeWork(work.id);
  return { status: 'completed', processedSubscriptionCount: work.subscriptions.length };
}

export function createDrizzleAdmissionAlertTransitionProcessorRepository(db = getDb()) {
  return {
    async claimNextWork({ currentCycle }) {
      return db.transaction(async (tx) => {
        const [candidate] = await tx
          .select({
            id: admissionAlertTransitionWork.id,
            transitionId: admissionAlertTransitionWork.transitionId,
            institutionId: admissionTargetTransitions.institutionId,
            programId: admissionTargetTransitions.programId,
            cycle: admissionTargetTransitions.cycle,
          })
          .from(admissionAlertTransitionWork)
          .innerJoin(
            admissionTargetTransitions,
            eq(admissionAlertTransitionWork.transitionId, admissionTargetTransitions.id),
          )
          .innerJoin(
            admissionReleases,
            eq(admissionTargetTransitions.releaseId, admissionReleases.id),
          )
          .where(
            and(
              eq(admissionAlertTransitionWork.status, 'pending'),
              eq(admissionReleases.status, 'published'),
              eq(admissionTargetTransitions.cycle, currentCycle),
            ),
          )
          .orderBy(asc(admissionAlertTransitionWork.createdAt))
          .limit(1);
        if (!candidate) return null;

        const [claimed] = await tx
          .update(admissionAlertTransitionWork)
          .set({ status: 'processing', claimedAt: new Date(), failureReason: null })
          .where(
            and(
              eq(admissionAlertTransitionWork.id, candidate.id),
              eq(admissionAlertTransitionWork.status, 'pending'),
            ),
          )
          .returning({ id: admissionAlertTransitionWork.id });
        if (!claimed) return null;

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
              eq(admissionAlertSubscriptions.institutionId, candidate.institutionId),
              eq(admissionAlertSubscriptions.programId, candidate.programId),
              eq(admissionAlertSubscriptions.cycle, candidate.cycle),
              inArray(admissionAlertSubscriptions.status, ['active', 'needs_profile_refresh']),
            ),
          );
        return { id: candidate.id, transitionId: candidate.transitionId, subscriptions };
      });
    },
    async recordDecision(input: {
      transitionId: string;
      subscriptionId: string;
      action: string;
      ruleVersion?: string;
    }) {
      await db.transaction(async (tx) => {
        const [subscription] = await tx
          .select({
            id: admissionAlertSubscriptions.id,
            profileVersionId: admissionAlertSubscriptions.profileVersionId,
            profileHash: admissionAlertSubscriptions.profileHash,
          })
          .from(admissionAlertSubscriptions)
          .where(
            and(
              eq(admissionAlertSubscriptions.id, input.subscriptionId),
              eq(admissionAlertSubscriptions.status, 'active'),
            ),
          )
          .limit(1);
        if (!subscription || !input.ruleVersion) return;

        if (input.action === 'advance_baseline') {
          await tx
            .update(admissionAlertSubscriptions)
            .set({
              baselineRuleVersion: input.ruleVersion,
              baselineVerdict: { decision: 'below' },
              updatedAt: new Date(),
            })
            .where(eq(admissionAlertSubscriptions.id, subscription.id));
          await tx.insert(admissionAlertBaselineHistory).values({
            subscriptionId: subscription.id,
            profileVersionId: subscription.profileVersionId,
            profileHash: subscription.profileHash,
            ruleVersion: input.ruleVersion,
            verdict: { decision: 'below' },
          });
          return;
        }

        if (input.action === 'queue_delivery') {
          await tx
            .update(admissionAlertSubscriptions)
            .set({ status: 'pending_delivery', updatedAt: new Date() })
            .where(eq(admissionAlertSubscriptions.id, subscription.id));
          await tx
            .insert(admissionAlertOutbox)
            .values({
              subscriptionId: subscription.id,
              transitionId: input.transitionId,
              idempotencyKey: alertDeliveryIdempotencyKey(subscription.id, input.transitionId),
            })
            .onConflictDoNothing();
        }
      });
    },
    async completeWork(workId: string) {
      await db
        .update(admissionAlertTransitionWork)
        .set({ status: 'completed', completedAt: new Date() })
        .where(
          and(
            eq(admissionAlertTransitionWork.id, workId),
            eq(admissionAlertTransitionWork.status, 'processing'),
          ),
        );
    },
    async retryWork(workId: string) {
      await db
        .update(admissionAlertTransitionWork)
        .set({ status: 'pending', failureReason: 'evaluation_unavailable' })
        .where(
          and(
            eq(admissionAlertTransitionWork.id, workId),
            eq(admissionAlertTransitionWork.status, 'processing'),
          ),
        );
    },
  } satisfies AdmissionAlertTransitionProcessorRepository;
}

function alertDeliveryIdempotencyKey(subscriptionId: string, transitionId: string) {
  return `admission-alert:${createHash('sha256').update(`${subscriptionId}:${transitionId}`).digest('hex')}`;
}
