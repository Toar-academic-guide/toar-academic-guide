import 'server-only';

import { randomUUID } from 'node:crypto';
import { and, eq, gt, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { admissionAlertOutbox, admissionAlertSubscriptions } from '@/db/schema';
import { admissionCycleFor } from './cycle';
import { alertRecipientHash, materializeAlertPayload } from './deliveryPreparation';

export const ALERT_DELIVERY_LEASE_MS = 5 * 60_000;
// Resend retains idempotency keys for 24h. Leave an hour for clock/network margin.
export const ALERT_IDEMPOTENCY_RETRY_MS = 23 * 60 * 60_000;
const RETRY_MS = 5 * 60_000;

export type AdmissionAlertMailPayload = NonNullable<
  typeof admissionAlertOutbox.$inferSelect.mailPayload
>;
export type AdmissionAlertSendResult =
  | { status: 'accepted'; providerMessageId: string }
  | { status: 'retryable' | 'permanent' | 'acceptance_unknown' };
export interface AdmissionAlertMailProvider {
  send(input: {
    idempotencyKey: string;
    payload: AdmissionAlertMailPayload;
  }): Promise<AdmissionAlertSendResult>;
}
export interface ClaimedAlertDelivery {
  id: string;
  subscriptionId: string;
  claimToken: string;
  idempotencyKey: string;
  payload: AdmissionAlertMailPayload;
}
export interface AdmissionAlertDeliveryRepository {
  claimNextDelivery(input: {
    now: Date;
    currentCycle: string;
  }): Promise<ClaimedAlertDelivery | null>;
  beginSubmission(input: {
    delivery: ClaimedAlertDelivery;
    now: Date;
    currentCycle: string;
  }): Promise<'ready' | 'suppressed' | 'lease_lost'>;
  recordResult(input: {
    delivery: ClaimedAlertDelivery;
    now: Date;
    result: AdmissionAlertSendResult;
  }): Promise<boolean>;
}

export function createDrizzleAdmissionAlertDeliveryRepository(
  db = getDb(),
  tokenSecret?: string,
): AdmissionAlertDeliveryRepository {
  const owned = (delivery: ClaimedAlertDelivery, now: Date) =>
    and(
      eq(admissionAlertOutbox.id, delivery.id),
      eq(admissionAlertOutbox.claimToken, delivery.claimToken),
      eq(admissionAlertOutbox.status, 'processing'),
      gt(admissionAlertOutbox.leaseExpiresAt, now),
    );
  return {
    async claimNextDelivery({ now, currentCycle }) {
      const at = now.toISOString();
      const retryBoundary = new Date(now.getTime() - ALERT_IDEMPOTENCY_RETRY_MS).toISOString();
      return db.transaction(async (tx) => {
        // A crash before submission is safe to retry. A crash after the boundary is not.
        await tx.execute(sql`
          update admission_alert_outbox set
            status = case when submission_started_at is null then 'retryable'
              else 'acceptance_unknown' end::admission_alert_outbox_status,
            acceptance_unknown_at = case when submission_started_at is not null
              then coalesce(acceptance_unknown_at, ${at}::timestamptz) else acceptance_unknown_at end,
            claim_token = null, lease_expires_at = null, next_attempt_at = ${at}::timestamptz, updated_at = ${at}::timestamptz
          where status = 'processing' and (lease_expires_at is null or lease_expires_at <= ${at}::timestamptz)
        `);
        await tx.execute(sql`
          update admission_alert_outbox o set status = 'suppressed',
            failure_reason = 'consent_or_cycle_changed', mail_payload = null, updated_at = ${at}::timestamptz
          from admission_alert_subscriptions s
          where o.subscription_id = s.id and o.status in ('pending','retryable')
            and (s.status <> 'pending_delivery' or s.cycle <> ${currentCycle}
              or exists (select 1 from admission_alert_email_preferences p
                where p.user_id = s.user_id and not p.opted_in))
        `);
        // Never reopen a delivery after the provider's deduplication window.
        await tx.execute(sql`
          update admission_alert_outbox set next_attempt_at = null,
            failure_reason = 'idempotency_window_elapsed', updated_at = ${at}::timestamptz
          where status in ('retryable','acceptance_unknown') and first_submitted_at is not null
            and first_submitted_at <= ${retryBoundary}::timestamptz
            and failure_reason is distinct from 'idempotency_window_elapsed'
        `);
        const candidates = await tx.execute<{
          id: string;
          subscription_id: string;
          idempotency_key: string;
          mail_payload: AdmissionAlertMailPayload;
          unsubscribe_token_hash: string | null;
        }>(sql`
          select o.id, o.subscription_id, o.idempotency_key, o.mail_payload, o.unsubscribe_token_hash
          from admission_alert_outbox o
          join admission_alert_subscriptions s on s.id = o.subscription_id
          where o.status in ('pending','retryable','acceptance_unknown')
            and s.status = 'pending_delivery' and s.cycle = ${currentCycle}
            and not exists (select 1 from admission_alert_email_preferences p
              where p.user_id = s.user_id and not p.opted_in)
            and o.mail_payload is not null
            and (o.next_attempt_at is null or o.next_attempt_at <= ${at}::timestamptz)
            and (o.first_submitted_at is null
              or o.first_submitted_at > ${retryBoundary}::timestamptz)
          order by o.created_at, o.id limit 1 for update of o skip locked
        `);
        const candidate = candidates[0];
        if (!candidate) return null;
        const claimToken = randomUUID();
        await tx
          .update(admissionAlertOutbox)
          .set({
            status: 'processing',
            claimToken,
            leaseExpiresAt: new Date(now.getTime() + ALERT_DELIVERY_LEASE_MS),
            updatedAt: now,
          })
          .where(eq(admissionAlertOutbox.id, candidate.id));
        return {
          id: candidate.id,
          subscriptionId: candidate.subscription_id,
          claimToken,
          idempotencyKey: candidate.idempotency_key,
          payload: tokenSecret
            ? materializeAlertPayload(
                candidate.mail_payload,
                candidate.id,
                candidate.unsubscribe_token_hash ?? '',
                tokenSecret,
              )
            : candidate.mail_payload,
        };
      });
    },
    async beginSubmission({ delivery, now, currentCycle }) {
      return db.transaction(async (tx) => {
        // Cancellation/profile changes take the subscription lock before the outbox lock too.
        const [subscription] = await tx
          .select()
          .from(admissionAlertSubscriptions)
          .where(eq(admissionAlertSubscriptions.id, delivery.subscriptionId))
          .for('update');
        const [outbox] = await tx
          .select()
          .from(admissionAlertOutbox)
          .where(owned(delivery, now))
          .for('update');
        if (!outbox) return 'lease_lost';
        if (
          outbox.firstSubmittedAt &&
          now.getTime() - outbox.firstSubmittedAt.getTime() >= ALERT_IDEMPOTENCY_RETRY_MS
        ) {
          await tx
            .update(admissionAlertOutbox)
            .set({
              status: outbox.acceptanceUnknownAt ? 'acceptance_unknown' : 'failed',
              failureReason: 'idempotency_window_elapsed',
              claimToken: null,
              leaseExpiresAt: null,
              nextAttemptAt: null,
              updatedAt: now,
            })
            .where(owned(delivery, now));
          return 'suppressed';
        }
        const preferences = subscription
          ? await tx.execute<{ opted_in: boolean }>(sql`
          select opted_in from admission_alert_email_preferences
          where user_id = ${subscription.userId} for update
        `)
          : [];
        const allowed =
          subscription?.status === 'pending_delivery' &&
          subscription.cycle === currentCycle &&
          preferences[0]?.opted_in !== false;
        if (!allowed) {
          // Keep uncertainty visible if a prior submission may have succeeded; never send again.
          await tx
            .update(admissionAlertOutbox)
            .set({
              status: outbox.acceptanceUnknownAt ? 'acceptance_unknown' : 'suppressed',
              failureReason: 'consent_or_cycle_changed',
              claimToken: null,
              leaseExpiresAt: null,
              nextAttemptAt: null,
              mailPayload: null,
              updatedAt: now,
            })
            .where(owned(delivery, now));
          return 'suppressed';
        }
        // Runtime requests always carry a token secret; plain repositories also support provider-neutral tests.
        if (tokenSecret) {
          const [recipient] = await tx.execute<{ email: string | null }>(
            sql`select admission_alert_private.delivery_recipient(${outbox.id}::uuid) as email`,
          );
          if (!recipient?.email || alertRecipientHash(recipient.email) !== outbox.recipientHash) {
            await tx
              .update(admissionAlertOutbox)
              .set({
                status: outbox.acceptanceUnknownAt ? 'acceptance_unknown' : 'failed',
                failureReason: 'verified_recipient_changed',
                mailPayload: null,
                claimToken: null,
                leaseExpiresAt: null,
                nextAttemptAt: null,
                updatedAt: now,
              })
              .where(owned(delivery, now));
            if (!outbox.acceptanceUnknownAt)
              await tx
                .update(admissionAlertSubscriptions)
                .set({ status: 'delivery_failed', updatedAt: now })
                .where(eq(admissionAlertSubscriptions.id, delivery.subscriptionId));
            return 'suppressed';
          }
        }
        await tx
          .update(admissionAlertOutbox)
          .set({
            firstSubmittedAt: outbox.firstSubmittedAt ?? now,
            submissionStartedAt: now,
            lastAttemptAt: now,
            attemptCount: outbox.attemptCount + 1,
            updatedAt: now,
          })
          .where(owned(delivery, now));
        return 'ready';
      });
    },
    async recordResult({ delivery, result, now }) {
      return db.transaction(async (tx) => {
        const [subscription] = await tx
          .select()
          .from(admissionAlertSubscriptions)
          .where(eq(admissionAlertSubscriptions.id, delivery.subscriptionId))
          .for('update');
        const [outbox] = await tx
          .select()
          .from(admissionAlertOutbox)
          .where(owned(delivery, now))
          .for('update');
        if (!outbox) return false;
        // A rejected retry cannot disprove acceptance of an earlier timed-out submission.
        const status =
          result.status === 'accepted'
            ? 'accepted'
            : outbox.acceptanceUnknownAt || result.status === 'acceptance_unknown'
              ? 'acceptance_unknown'
              : result.status === 'permanent'
                ? 'failed'
                : 'retryable';
        await tx
          .update(admissionAlertOutbox)
          .set({
            status,
            claimToken: null,
            leaseExpiresAt: null,
            updatedAt: now,
            nextAttemptAt:
              status === 'retryable' || status === 'acceptance_unknown'
                ? new Date(now.getTime() + RETRY_MS)
                : null,
            acceptanceUnknownAt:
              status === 'acceptance_unknown' ? (outbox.acceptanceUnknownAt ?? now) : null,
            failureReason:
              status === 'accepted'
                ? null
                : status === 'failed'
                  ? 'provider_rejected'
                  : status === 'acceptance_unknown'
                    ? 'provider_acceptance_unknown'
                    : 'provider_retryable',
            ...(result.status === 'accepted'
              ? {
                  providerMessageId: result.providerMessageId,
                  providerAcceptedAt: now,
                  mailPayload: null,
                }
              : status === 'failed'
                ? { mailPayload: null }
                : {}),
            submissionStartedAt: status === 'retryable' ? null : outbox.submissionStartedAt,
          })
          .where(owned(delivery, now));
        if (
          subscription?.status === 'pending_delivery' &&
          (status === 'accepted' || status === 'failed')
        ) {
          await tx
            .update(admissionAlertSubscriptions)
            .set({
              status: status === 'accepted' ? 'notified' : 'delivery_failed',
              ...(status === 'accepted' ? { notifiedAt: now } : {}),
              updatedAt: now,
            })
            .where(eq(admissionAlertSubscriptions.id, delivery.subscriptionId));
        }
        return true;
      });
    },
  };
}

export async function processAdmissionAlertDelivery(input: {
  repository: AdmissionAlertDeliveryRepository;
  provider: AdmissionAlertMailProvider;
  now?: () => Date;
}): Promise<{ status: 'idle' | 'suppressed' | 'lease_lost' | AdmissionAlertSendResult['status'] }> {
  const clock = input.now ?? (() => new Date());
  const claimedAt = clock();
  const delivery = await input.repository.claimNextDelivery({
    currentCycle: admissionCycleFor(claimedAt),
    now: claimedAt,
  });
  if (!delivery) return { status: 'idle' };
  const submissionAt = clock();
  const gate = await input.repository.beginSubmission({
    delivery,
    currentCycle: admissionCycleFor(submissionAt),
    now: submissionAt,
  });
  if (gate !== 'ready') return { status: gate };
  let result: AdmissionAlertSendResult;
  try {
    result = await input.provider.send({
      idempotencyKey: delivery.idempotencyKey,
      payload: delivery.payload,
    });
  } catch {
    result = { status: 'acceptance_unknown' };
  }
  const recorded = await input.repository.recordResult({ delivery, result, now: clock() });
  return { status: recorded ? result.status : 'lease_lost' };
}
