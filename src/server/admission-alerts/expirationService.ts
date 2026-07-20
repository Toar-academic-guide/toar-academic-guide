import 'server-only';

import { and, inArray, lt } from 'drizzle-orm';

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
          .update(admissionAlertSubscriptions)
          .set({ status: 'expired', expiredAt, updatedAt: expiredAt })
          .where(
            and(
              lt(admissionAlertSubscriptions.cycle, currentCycle),
              inArray(admissionAlertSubscriptions.status, [
                'active',
                'needs_profile_refresh',
                'pending_delivery',
              ]),
            ),
          )
          .returning({ id: admissionAlertSubscriptions.id });

        if (expiredSubscriptions.length > 0) {
          await tx
            .update(admissionAlertOutbox)
            .set({ status: 'suppressed', updatedAt: expiredAt })
            .where(
              and(
                inArray(
                  admissionAlertOutbox.subscriptionId,
                  expiredSubscriptions.map((subscription) => subscription.id),
                ),
                inArray(admissionAlertOutbox.status, ['pending', 'retryable']),
              ),
            );
        }

        return expiredSubscriptions.length;
      });
    },
  } satisfies AdmissionAlertExpirationRepository;
}
