import 'server-only';

import { and, desc, eq } from 'drizzle-orm';

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
      deliveryStatus?: AdmissionAlertOutboxStatus | null;
      deliveryEvents?: Record<string, string> | null;
      mayStillArrive?: boolean;
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
      const rows = await db
        .select({
          id: admissionAlertSubscriptions.id,
          institutionId: admissionAlertSubscriptions.institutionId,
          programId: admissionAlertSubscriptions.programId,
          cycle: admissionAlertSubscriptions.cycle,
          status: admissionAlertSubscriptions.status,
          deliveryStatus: admissionAlertOutbox.status,
          deliveryEvents: admissionAlertOutbox.deliveryEvents,
          submissionStartedAt: admissionAlertOutbox.submissionStartedAt,
          acceptanceUnknownAt: admissionAlertOutbox.acceptanceUnknownAt,
        })
        .from(admissionAlertSubscriptions)
        .leftJoin(
          admissionAlertOutbox,
          eq(admissionAlertOutbox.subscriptionId, admissionAlertSubscriptions.id),
        )
        .where(eq(admissionAlertSubscriptions.userId, userId))
        .orderBy(desc(admissionAlertSubscriptions.createdAt));
      return rows.map(({ submissionStartedAt, acceptanceUnknownAt, ...row }) => ({
        ...row,
        mayStillArrive:
          row.deliveryStatus === 'accepted' ||
          row.deliveryStatus === 'acceptance_unknown' ||
          (row.deliveryStatus === 'processing' &&
            Boolean(submissionStartedAt || acceptanceUnknownAt)),
      }));
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
            ),
          )
          .limit(1)
          .for('update');
        if (!subscription) return null;

        const [outbox] = await tx
          .select({
            id: admissionAlertOutbox.id,
            status: admissionAlertOutbox.status,
            submissionStartedAt: admissionAlertOutbox.submissionStartedAt,
            acceptanceUnknownAt: admissionAlertOutbox.acceptanceUnknownAt,
          })
          .from(admissionAlertOutbox)
          .where(eq(admissionAlertOutbox.subscriptionId, subscription.id))
          .orderBy(desc(admissionAlertOutbox.createdAt))
          .limit(1)
          .for('update');
        const cancellation = cancelAlertSubscription(
          subscription.status as AdmissionAlertSubscriptionStatus,
          (outbox?.status as AdmissionAlertOutboxStatus | undefined) ?? null,
        );
        // A claimed row before its submission boundary is still safely cancellable.
        if (
          outbox?.status === 'processing' &&
          !outbox.submissionStartedAt &&
          !outbox.acceptanceUnknownAt
        ) {
          cancellation.outboxStatus = 'suppressed';
          cancellation.mayStillArrive = false;
        }

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
            .set({
              status: cancellation.outboxStatus,
              updatedAt: new Date(),
              ...(cancellation.outboxStatus === 'suppressed'
                ? { mailPayload: null, claimToken: null, leaseExpiresAt: null, nextAttemptAt: null }
                : {}),
            })
            .where(eq(admissionAlertOutbox.id, outbox.id));
        }
        return { mayStillArrive: cancellation.mayStillArrive };
      });
    },
  };
}
