import 'server-only';

import { and, eq, inArray, lt } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { admissionAlertOutbox, admissionAlertSubscriptions } from '@/db/schema';
import { admissionCycleFor } from './cycle';

export interface AdmissionAlertExpirationRepository {
  expirePriorCycles(input: { currentCycle: string }): Promise<number>;
}

export async function expirePriorAdmissionAlertSubscriptions(input: {
  repository: AdmissionAlertExpirationRepository;
  now?: Date;
}): Promise<{ currentCycle: string; expiredSubscriptionCount: number }> {
  const currentCycle = admissionCycleFor(input.now);
  const expiredSubscriptionCount = await input.repository.expirePriorCycles({ currentCycle });

  return { currentCycle, expiredSubscriptionCount };
}

export function createDrizzleAdmissionAlertExpirationRepository(
  db = getDb(),
): AdmissionAlertExpirationRepository {
  return {
    async expirePriorCycles({ currentCycle }) {
      return db.transaction(async (tx) => {
        const expiredAt = new Date();
        const expiredSubscriptions = await tx
          .select()
          .from(admissionAlertSubscriptions)
          .where(
            and(
              lt(admissionAlertSubscriptions.cycle, currentCycle),
              inArray(admissionAlertSubscriptions.status, [
                'active',
                'needs_profile_refresh',
                'pending_delivery',
                'delivery_failed',
              ]),
            ),
          )
          .orderBy(admissionAlertSubscriptions.id)
          .for('update');
        if (expiredSubscriptions.length === 0) return 0;
        await tx
          .update(admissionAlertSubscriptions)
          .set({ status: 'expired', expiredAt, updatedAt: expiredAt })
          .where(
            and(
              lt(admissionAlertSubscriptions.cycle, currentCycle),
              inArray(admissionAlertSubscriptions.status, [
                'active',
                'needs_profile_refresh',
                'pending_delivery',
                'delivery_failed',
              ]),
            ),
          );

        if (expiredSubscriptions.length > 0) {
          const deliveries = await tx
            .select()
            .from(admissionAlertOutbox)
            .where(
              inArray(
                admissionAlertOutbox.subscriptionId,
                expiredSubscriptions.map((s) => s.id),
              ),
            )
            .orderBy(admissionAlertOutbox.id)
            .for('update');
          for (const d of deliveries) {
            const safe =
              ['pending', 'retryable', 'processing'].includes(d.status) &&
              !d.submissionStartedAt &&
              !d.acceptanceUnknownAt;
            await tx
              .update(admissionAlertOutbox)
              .set({
                mailPayload: null,
                unsubscribeTokenHash: null,
                updatedAt: expiredAt,
                ...(safe
                  ? {
                      status: 'suppressed' as const,
                      claimToken: null,
                      leaseExpiresAt: null,
                      nextAttemptAt: null,
                    }
                  : {}),
              })
              .where(eq(admissionAlertOutbox.id, d.id));
          }
        }

        return expiredSubscriptions.length;
      });
    },
  } satisfies AdmissionAlertExpirationRepository;
}
