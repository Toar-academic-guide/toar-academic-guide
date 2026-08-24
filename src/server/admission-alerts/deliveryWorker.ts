import 'server-only';

import { and, asc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { admissionAlertOutbox, admissionAlertSubscriptions } from '@/db/schema';
import { admissionCycleFor } from './cycle';

export interface AdmissionAlertDeliveryRepository {
  claimNextDelivery(input: { currentCycle: string }): Promise<{
    id: string;
    idempotencyKey: string;
    subscriptionStatus:
      | 'active'
      | 'needs_profile_refresh'
      | 'pending_delivery'
      | 'cancelled'
      | 'notified'
      | 'expired'
      | 'delivery_failed';
  } | null>;
  canAttemptDelivery(input: { outboxId: string; currentCycle: string }): Promise<boolean>;
  acceptDelivery(input: { outboxId: string; providerMessageId: string }): Promise<void>;
  retryDelivery(outboxId: string): Promise<void>;
}

export interface AdmissionAlertMailProvider {
  send(input: {
    idempotencyKey: string;
  }): Promise<{ status: 'accepted'; providerMessageId: string } | { status: 'retryable' }>;
}

export function createDrizzleAdmissionAlertDeliveryRepository(db = getDb()) {
  return {
    async claimNextDelivery({ currentCycle }) {
      return db.transaction(async (tx) => {
        const [candidate] = await tx
          .select({
            id: admissionAlertOutbox.id,
            idempotencyKey: admissionAlertOutbox.idempotencyKey,
            subscriptionStatus: admissionAlertSubscriptions.status,
          })
          .from(admissionAlertOutbox)
          .innerJoin(
            admissionAlertSubscriptions,
            eq(admissionAlertOutbox.subscriptionId, admissionAlertSubscriptions.id),
          )
          .where(
            and(
              inArray(admissionAlertOutbox.status, ['pending', 'retryable']),
              eq(admissionAlertSubscriptions.status, 'pending_delivery'),
              eq(admissionAlertSubscriptions.cycle, currentCycle),
            ),
          )
          .orderBy(asc(admissionAlertOutbox.createdAt))
          .limit(1);
        if (!candidate) return null;

        const [claimed] = await tx
          .update(admissionAlertOutbox)
          .set({ status: 'processing', lastAttemptAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(admissionAlertOutbox.id, candidate.id),
              inArray(admissionAlertOutbox.status, ['pending', 'retryable']),
            ),
          )
          .returning({ id: admissionAlertOutbox.id });
        return claimed ? candidate : null;
      });
    },
    async acceptDelivery(input: { outboxId: string; providerMessageId: string }) {
      await db.transaction(async (tx) => {
        const [outbox] = await tx
          .select({ subscriptionId: admissionAlertOutbox.subscriptionId })
          .from(admissionAlertOutbox)
          .where(
            and(
              eq(admissionAlertOutbox.id, input.outboxId),
              eq(admissionAlertOutbox.status, 'processing'),
            ),
          )
          .limit(1);
        if (!outbox) return;
        await tx
          .update(admissionAlertOutbox)
          .set({
            status: 'accepted',
            providerMessageId: input.providerMessageId,
            providerAcceptedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(admissionAlertOutbox.id, input.outboxId));
        await tx
          .update(admissionAlertSubscriptions)
          .set({ status: 'notified', notifiedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(admissionAlertSubscriptions.id, outbox.subscriptionId),
              eq(admissionAlertSubscriptions.status, 'pending_delivery'),
            ),
          );
      });
    },
    async canAttemptDelivery({ outboxId, currentCycle }) {
      const [outbox] = await db
        .select({ id: admissionAlertOutbox.id })
        .from(admissionAlertOutbox)
        .innerJoin(
          admissionAlertSubscriptions,
          eq(admissionAlertOutbox.subscriptionId, admissionAlertSubscriptions.id),
        )
        .where(
          and(
            eq(admissionAlertOutbox.id, outboxId),
            eq(admissionAlertOutbox.status, 'processing'),
            eq(admissionAlertSubscriptions.status, 'pending_delivery'),
            eq(admissionAlertSubscriptions.cycle, currentCycle),
          ),
        )
        .limit(1);
      return Boolean(outbox);
    },
    async retryDelivery(outboxId: string) {
      await db
        .update(admissionAlertOutbox)
        .set({ status: 'retryable', updatedAt: new Date() })
        .where(
          and(eq(admissionAlertOutbox.id, outboxId), eq(admissionAlertOutbox.status, 'processing')),
        );
    },
  } satisfies AdmissionAlertDeliveryRepository;
}

export async function processAdmissionAlertDelivery(input: {
  repository: AdmissionAlertDeliveryRepository;
  provider: AdmissionAlertMailProvider;
  now?: Date;
}): Promise<
  | { status: 'idle' }
  | { status: 'accepted'; outboxId: string }
  | { status: 'retry'; outboxId: string }
> {
  const currentCycle = admissionCycleFor(input.now);
  const delivery = await input.repository.claimNextDelivery({ currentCycle });
  if (!delivery) return { status: 'idle' };
  if (delivery.subscriptionStatus !== 'pending_delivery') return { status: 'idle' };
  if (!(await input.repository.canAttemptDelivery({ outboxId: delivery.id, currentCycle }))) {
    return { status: 'idle' };
  }

  const sent = await input.provider.send({ idempotencyKey: delivery.idempotencyKey });
  if (sent.status === 'accepted') {
    await input.repository.acceptDelivery({
      outboxId: delivery.id,
      providerMessageId: sent.providerMessageId,
    });
    return { status: 'accepted', outboxId: delivery.id };
  }

  await input.repository.retryDelivery(delivery.id);
  return { status: 'retry', outboxId: delivery.id };
}
