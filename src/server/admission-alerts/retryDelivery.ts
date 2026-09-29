import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  admissionAlertSubscriptions,
  admissionAlertOutbox,
  admissionAlertEmailPreferences,
  userProfiles,
  bagrutProfileVersions,
} from '@/db/schema';
import { admissionCycleFor } from './cycle';
import { alertRecipientHash } from './deliveryPreparation';
import { buildSavedAlertProfile } from './subscriptionService';

/** Explicit user retry after a definitively failed request and a changed verified address. */
export async function retryFailedAlertDelivery(
  userId: string,
  subscriptionId: string,
  db = getDb(),
) {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .for('update');
    const [sub] = await tx
      .select()
      .from(admissionAlertSubscriptions)
      .where(
        and(
          eq(admissionAlertSubscriptions.id, subscriptionId),
          eq(admissionAlertSubscriptions.userId, userId),
        ),
      )
      .for('update');
    if (!sub) return { status: 'not_found' as const };
    const [delivery] = await tx
      .select()
      .from(admissionAlertOutbox)
      .where(eq(admissionAlertOutbox.subscriptionId, sub.id))
      .for('update');
    const [preference] = await tx
      .select()
      .from(admissionAlertEmailPreferences)
      .where(eq(admissionAlertEmailPreferences.userId, userId))
      .for('update');
    if (
      sub.status !== 'delivery_failed' ||
      sub.cycle !== admissionCycleFor() ||
      preference?.optedIn === false ||
      !delivery ||
      delivery.status !== 'failed' ||
      delivery.acceptanceUnknownAt ||
      delivery.providerAcceptedAt ||
      !['provider_rejected', 'verified_recipient_required', 'verified_recipient_changed'].includes(
        delivery.failureReason ?? '',
      )
    )
      return { status: 'not_retryable' as const };
    const [version] = await tx
      .select()
      .from(bagrutProfileVersions)
      .where(
        and(
          eq(bagrutProfileVersions.id, sub.profileVersionId),
          eq(bagrutProfileVersions.userId, userId),
        ),
      );
    if (
      !profile ||
      !version ||
      profile.bagrutProfileVersionId !== sub.profileVersionId ||
      buildSavedAlertProfile(profile, version)?.profileHash !== sub.profileHash
    )
      return { status: 'profile_changed' as const };
    const [recipient] = await tx.execute<{ email: string | null }>(
      sql`select admission_alert_private.delivery_recipient(${delivery.id}::uuid) as email`,
    );
    if (!recipient?.email || alertRecipientHash(recipient.email) === delivery.recipientHash)
      return { status: 'changed_verified_email_required' as const };
    const hash = alertRecipientHash(recipient.email);
    // A definitive rejection cannot have accepted the old request. Keep the same logical row,
    // but use a new request key because its recipient changed. Never do this for uncertainty.
    const key =
      'admission-alert:' +
      createHash('sha256').update(`${sub.id}:${delivery.transitionId}:${hash}`).digest('hex');
    await tx
      .update(admissionAlertOutbox)
      .set({
        status: 'pending',
        idempotencyKey: key,
        mailPayload: null,
        recipientHash: hash,
        firstSubmittedAt: null,
        submissionStartedAt: null,
        nextAttemptAt: null,
        claimToken: null,
        leaseExpiresAt: null,
        failureReason: null,
        updatedAt: new Date(),
      })
      .where(eq(admissionAlertOutbox.id, delivery.id));
    await tx
      .update(admissionAlertSubscriptions)
      .set({ status: 'pending_delivery', updatedAt: new Date() })
      .where(eq(admissionAlertSubscriptions.id, sub.id));
    return { status: 'retry_queued' as const };
  });
}
