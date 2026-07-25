import 'server-only';

import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { admissionAlertOutbox, admissionAlertSubscriptions } from '@/db/schema';
import {
  cancelAlertSubscription,
  type AdmissionAlertOutboxStatus,
  type AdmissionAlertSubscriptionStatus,
} from './lifecycle';

export interface AdmissionAlertAccountRepository {
  listSubscriptions(userId: string): Promise<
    Array<{
      id: string;
      institutionId: string;
      programId: string;
      cycle: string;
      status: AdmissionAlertSubscriptionStatus;
    }>
  >;
  cancelSubscription(input: {
    userId: string;
    subscriptionId: string;
  }): Promise<{ mayStillArrive: boolean } | null>;
}

export function listAdmissionAlertSubscriptions(input: {
  userId: string;
  repository: AdmissionAlertAccountRepository;
}) {
  return input.repository.listSubscriptions(input.userId);
}

export async function cancelAdmissionAlertSubscription(input: {
  userId: string;
  subscriptionId: string;
  repository: AdmissionAlertAccountRepository;
}): Promise<{ status: 'cancelled'; mayStillArrive: boolean } | { status: 'not_found' }> {
  const cancelled = await input.repository.cancelSubscription(input);
  return cancelled
    ? { status: 'cancelled', mayStillArrive: cancelled.mayStillArrive }
    : { status: 'not_found' };
}

export function createDrizzleAdmissionAlertAccountRepository(
  db = getDb(),
): AdmissionAlertAccountRepository {
  return {
    async listSubscriptions(userId) {
      return db
        .select({
          id: admissionAlertSubscriptions.id,
          institutionId: admissionAlertSubscriptions.institutionId,
          programId: admissionAlertSubscriptions.programId,
          cycle: admissionAlertSubscriptions.cycle,
          status: admissionAlertSubscriptions.status,
        })
        .from(admissionAlertSubscriptions)
        .where(eq(admissionAlertSubscriptions.userId, userId))
        .orderBy(desc(admissionAlertSubscriptions.createdAt));
    },
    async cancelSubscription(input) {
      return db.transaction(async (tx) => {
        const [subscription] = await tx
          .select({
            id: admissionAlertSubscriptions.id,
            status: admissionAlertSubscriptions.status,
          })
          .from(admissionAlertSubscriptions)
          .where(
            and(
              eq(admissionAlertSubscriptions.id, input.subscriptionId),
              eq(admissionAlertSubscriptions.userId, input.userId),
              inArray(admissionAlertSubscriptions.status, [
                'active',
                'needs_profile_refresh',
                'pending_delivery',
              ]),
            ),
          )
          .limit(1);
        if (!subscription) return null;

        const [outbox] = await tx
          .select({ id: admissionAlertOutbox.id, status: admissionAlertOutbox.status })
          .from(admissionAlertOutbox)
          .where(eq(admissionAlertOutbox.subscriptionId, subscription.id))
          .orderBy(desc(admissionAlertOutbox.createdAt))
          .limit(1);
        const cancellation = cancelAlertSubscription(
          subscription.status as AdmissionAlertSubscriptionStatus,
          (outbox?.status as AdmissionAlertOutboxStatus | undefined) ?? null,
        );

        await tx
          .update(admissionAlertSubscriptions)
          .set({
            status: cancellation.subscriptionStatus,
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(admissionAlertSubscriptions.id, subscription.id));
        if (
          outbox &&
          cancellation.outboxStatus !== null &&
          cancellation.outboxStatus !== outbox.status
        ) {
          await tx
            .update(admissionAlertOutbox)
            .set({ status: cancellation.outboxStatus, updatedAt: new Date() })
            .where(eq(admissionAlertOutbox.id, outbox.id));
        }
        return { mayStillArrive: cancellation.mayStillArrive };
      });
    },
  };
}
