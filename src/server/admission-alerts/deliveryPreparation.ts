import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { admissionAlertOutbox, admissionAlertSubscriptions } from '@/db/schema';
import type { AdmissionAlertMailPayload } from './deliveryWorker';
import { renderAdmissionAlertEmail, type AdmissionAlertEmailConfig } from './emailTemplate';
import {
  deriveAdmissionAlertUnsubscribeToken,
  hashAdmissionAlertToken,
} from './unsubscribeService';
import { admissionCycleFor } from './cycle';

const TOKEN_PLACEHOLDER = 'ADMISSION_ALERT_TOKEN_PLACEHOLDER_DO_NOT_SEND';
export const alertRecipientHash = (email: string) =>
  createHash('sha256').update(email.trim().toLowerCase()).digest('hex');

export function freezeAlertPayload(
  payload: AdmissionAlertMailPayload,
  token: string,
): AdmissionAlertMailPayload {
  return {
    ...payload,
    html: payload.html.replaceAll(token, TOKEN_PLACEHOLDER),
    text: payload.text.replaceAll(token, TOKEN_PLACEHOLDER),
  };
}
export function materializeAlertPayload(
  payload: AdmissionAlertMailPayload,
  deliveryId: string,
  tokenHash: string,
  secret: string,
): AdmissionAlertMailPayload {
  const token = deriveAdmissionAlertUnsubscribeToken(deliveryId, secret);
  if (hashAdmissionAlertToken(token) !== tokenHash)
    throw new Error('Admission-alert token secret changed; reconcile queued work before rotation.');
  return {
    ...payload,
    html: payload.html.replaceAll(TOKEN_PLACEHOLDER, token),
    text: payload.text.replaceAll(TOKEN_PLACEHOLDER, token),
  };
}

/** Prepare one immutable request; the raw unsubscribe credential never enters the database. */
export async function prepareNextAlertDelivery(
  config: AdmissionAlertEmailConfig,
  secret: string,
  db = getDb(),
  now = new Date(),
) {
  const candidates = await db.execute<{ id: string; subscription_id: string }>(sql`
    select o.id, o.subscription_id from admission_alert_outbox o
    join admission_alert_subscriptions s on s.id=o.subscription_id
    where o.status='pending' and o.mail_payload is null and s.status='pending_delivery'
      and s.cycle=${admissionCycleFor(now)}
    order by o.created_at, o.id limit 1
  `);
  const candidate = candidates[0];
  if (!candidate) return false;
  await db.transaction(async (tx) => {
    const [sub] = await tx
      .select()
      .from(admissionAlertSubscriptions)
      .where(eq(admissionAlertSubscriptions.id, candidate.subscription_id))
      .for('update');
    const [outbox] = await tx
      .select()
      .from(admissionAlertOutbox)
      .where(eq(admissionAlertOutbox.id, candidate.id))
      .for('update');
    if (
      !sub ||
      !outbox ||
      sub.status !== 'pending_delivery' ||
      outbox.status !== 'pending' ||
      outbox.mailPayload
    )
      return;
    const [context] = await tx.execute<{
      email: string | null;
      institution: string;
      program: string;
      published_at: Date;
      opted_in: boolean | null;
    }>(sql`
      select admission_alert_private.delivery_recipient(${outbox.id}::uuid) as email,
        i.name as institution, p.name as program, r.published_at, pref.opted_in
      from admission_target_transitions t
      join admission_releases r on r.id=t.release_id
      join institutions i on i.id=t.institution_id join programs p on p.id=t.program_id
      left join admission_alert_email_preferences pref on pref.user_id=${sub.userId}::uuid
      where t.id=${outbox.transitionId}::uuid and r.status='published'
        and r.release_kind='canonical_change' and r.published_at is not null
        and t.institution_id=${sub.institutionId} and t.program_id=${sub.programId} and t.cycle=${sub.cycle}
    `);
    if (!context || context.opted_in === false || sub.cycle !== admissionCycleFor(now)) {
      await tx
        .update(admissionAlertOutbox)
        .set({ status: 'suppressed', failureReason: 'consent_or_release_changed', updatedAt: now })
        .where(eq(admissionAlertOutbox.id, outbox.id));
      await tx
        .update(admissionAlertSubscriptions)
        .set({
          status:
            context?.opted_in === false
              ? 'cancelled'
              : sub.cycle !== admissionCycleFor(now)
                ? 'expired'
                : 'delivery_failed',
          updatedAt: now,
        })
        .where(eq(admissionAlertSubscriptions.id, sub.id));
      return;
    }
    if (!context.email) {
      await tx
        .update(admissionAlertOutbox)
        .set({ status: 'failed', failureReason: 'verified_recipient_required', updatedAt: now })
        .where(eq(admissionAlertOutbox.id, outbox.id));
      await tx
        .update(admissionAlertSubscriptions)
        .set({ status: 'delivery_failed', updatedAt: now })
        .where(eq(admissionAlertSubscriptions.id, sub.id));
      return;
    }
    const token = deriveAdmissionAlertUnsubscribeToken(outbox.id, secret);
    const payload = await renderAdmissionAlertEmail(
      {
        recipient: context.email,
        institutionName: context.institution,
        programName: context.program,
        reviewedAt: new Date(context.published_at),
        cycle: sub.cycle,
        unsubscribeToken: token,
      },
      config,
    );
    await tx
      .update(admissionAlertOutbox)
      .set({
        mailPayload: freezeAlertPayload(payload, token),
        unsubscribeTokenHash: hashAdmissionAlertToken(token),
        recipientHash: alertRecipientHash(context.email),
        updatedAt: now,
      })
      .where(
        and(eq(admissionAlertOutbox.id, outbox.id), eq(admissionAlertOutbox.status, 'pending')),
      );
  });
  return true;
}
