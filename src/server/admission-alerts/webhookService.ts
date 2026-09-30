import 'server-only';
import { Webhook } from 'svix';
import { z } from 'zod';
import { and, eq, or } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  admissionAlertOutbox,
  admissionAlertSubscriptions,
  admissionAlertWebhookEvents,
} from '@/db/schema';

const eventSchema = z.object({
  type: z.enum([
    'email.sent',
    'email.delivered',
    'email.bounced',
    'email.complained',
    'email.failed',
    'email.delivery_delayed',
    'email.suppressed',
  ]),
  created_at: z.iso.datetime({ offset: true }),
  data: z.object({
    email_id: z.string().min(1).max(200),
    tags: z
      .object({
        admission_alert: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
      })
      .optional(),
  }),
});
export interface VerifiedAlertEvent {
  id: string;
  type: string;
  occurredAt: string;
  providerMessageId: string;
  idempotencyKey?: string;
}

/** Verify the exact raw bytes before parsing; never return recipient/provider body fields. */
export function verifyAdmissionAlertWebhook(
  raw: string,
  headers: Headers,
  secret: string,
): VerifiedAlertEvent | null {
  const id = headers.get('svix-id') ?? '';
  if (id.length > 200) throw new Error('Invalid webhook.');
  const verified: unknown = new Webhook(secret).verify(raw, {
    'svix-id': id,
    'svix-timestamp': headers.get('svix-timestamp') ?? '',
    'svix-signature': headers.get('svix-signature') ?? '',
  });
  const parsed = eventSchema.safeParse(verified);
  if (!parsed.success) return null;
  const { type, created_at, data } = parsed.data;
  return {
    id,
    type,
    occurredAt: created_at,
    providerMessageId: data.email_id,
    ...(data.tags?.admission_alert
      ? { idempotencyKey: `admission-alert:${data.tags.admission_alert}` }
      : {}),
  };
}

export async function recordAdmissionAlertWebhook(
  event: VerifiedAlertEvent,
  db = getDb(),
  now = new Date(),
) {
  // Tags recover a timed-out submission even when its provider ID was never recorded.
  const [candidate] = await db
    .select({ id: admissionAlertOutbox.id, subscriptionId: admissionAlertOutbox.subscriptionId })
    .from(admissionAlertOutbox)
    .where(
      or(
        eq(admissionAlertOutbox.providerMessageId, event.providerMessageId),
        ...(event.idempotencyKey
          ? [eq(admissionAlertOutbox.idempotencyKey, event.idempotencyKey)]
          : []),
      ),
    )
    .limit(1);
  if (!candidate) return { status: 'ignored' as const };
  return db.transaction(async (tx) => {
    const [subscription] = await tx
      .select()
      .from(admissionAlertSubscriptions)
      .where(eq(admissionAlertSubscriptions.id, candidate.subscriptionId))
      .for('update');
    const [outbox] = await tx
      .select()
      .from(admissionAlertOutbox)
      .where(eq(admissionAlertOutbox.id, candidate.id))
      .for('update');
    if (
      !subscription ||
      !outbox ||
      !outbox.firstSubmittedAt ||
      (outbox.providerMessageId && outbox.providerMessageId !== event.providerMessageId)
    ) {
      return { status: 'ignored' as const };
    }
    const inserted = await tx
      .insert(admissionAlertWebhookEvents)
      .values({
        id: event.id,
        outboxId: outbox.id,
        providerEventType: event.type,
        providerMessageId: event.providerMessageId,
        receivedAt: now,
        payloadMetadata: { occurredAt: event.occurredAt },
      })
      .onConflictDoNothing()
      .returning({ id: admissionAlertWebhookEvents.id });
    if (!inserted.length) return { status: 'duplicate' as const };
    // Independent facts never erase one another when events arrive out of order.
    await tx
      .update(admissionAlertOutbox)
      .set({
        deliveryEvents: {
          ...outbox.deliveryEvents,
          [event.type]: outbox.deliveryEvents[event.type] ?? event.occurredAt,
        },
        status: 'accepted',
        providerMessageId: event.providerMessageId,
        providerAcceptedAt: outbox.providerAcceptedAt ?? new Date(event.occurredAt),
        mailPayload: null,
        claimToken: null,
        leaseExpiresAt: null,
        nextAttemptAt: null,
        updatedAt: now,
      })
      .where(eq(admissionAlertOutbox.id, outbox.id));
    await tx
      .update(admissionAlertSubscriptions)
      .set({ status: 'notified', notifiedAt: now, updatedAt: now })
      .where(
        and(
          eq(admissionAlertSubscriptions.id, subscription.id),
          eq(admissionAlertSubscriptions.status, 'pending_delivery'),
        ),
      );
    return { status: 'recorded' as const };
  });
}
