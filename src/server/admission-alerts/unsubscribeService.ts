import 'server-only';
import { createHash, createHmac } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  admissionAlertEmailPreferences,
  admissionAlertOutbox,
  admissionAlertSubscriptions,
  userProfiles,
} from '@/db/schema';
import { admissionCycleFor } from './cycle';

export function hashAdmissionAlertToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/** A secret PRF over the random delivery UUID: opaque, stable across retries, never stored raw. */
export function deriveAdmissionAlertUnsubscribeToken(deliveryId: string, secret: string) {
  if (!/^[A-Za-z0-9_-]{43,}$/.test(secret) || Buffer.from(secret, 'base64url').length < 32) {
    throw new Error('Admission-alert token secret must contain at least 32 random bytes.');
  }
  return createHmac('sha256', Buffer.from(secret, 'base64url'))
    .update(`admission-alert-unsubscribe:v1:${deliveryId}`)
    .digest('base64url');
}

export async function unsubscribeAdmissionAlerts(token: string, db = getDb(), now = new Date()) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { status: 'invalid' as const };
  const tokenHash = hashAdmissionAlertToken(token);
  const [owner] = await db
    .select({ userId: admissionAlertSubscriptions.userId })
    .from(admissionAlertOutbox)
    .innerJoin(
      admissionAlertSubscriptions,
      eq(admissionAlertSubscriptions.id, admissionAlertOutbox.subscriptionId),
    )
    .where(eq(admissionAlertOutbox.unsubscribeTokenHash, tokenHash));
  if (!owner) return { status: 'invalid' as const };
  return db.transaction(async (tx) => {
    // Creation/profile refresh take the profile lock first, then subscriptions and outbox.
    await tx
      .select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(eq(userProfiles.userId, owner.userId))
      .for('update');
    const subscriptions = await tx
      .select()
      .from(admissionAlertSubscriptions)
      .where(eq(admissionAlertSubscriptions.userId, owner.userId))
      .orderBy(admissionAlertSubscriptions.id)
      .for('update');
    if (!subscriptions.length) return { status: 'invalid' as const };
    const deliveries = await tx
      .select()
      .from(admissionAlertOutbox)
      .where(
        inArray(
          admissionAlertOutbox.subscriptionId,
          subscriptions.map((s) => s.id),
        ),
      )
      .orderBy(admissionAlertOutbox.id)
      .for('update');
    const target = deliveries.find((d) => d.unsubscribeTokenHash === tokenHash);
    if (
      !target ||
      subscriptions.find((s) => s.id === target.subscriptionId)?.cycle !== admissionCycleFor(now)
    ) {
      return { status: 'invalid' as const };
    }
    const mayStillArrive = deliveries.some(
      (d) =>
        d.status === 'accepted' ||
        d.status === 'acceptance_unknown' ||
        (d.status === 'processing' && Boolean(d.submissionStartedAt || d.acceptanceUnknownAt)),
    );
    // A used link must never undo a later explicit category opt-in.
    if (target.unsubscribeUsedAt) {
      const [preference] = await tx
        .select()
        .from(admissionAlertEmailPreferences)
        .where(eq(admissionAlertEmailPreferences.userId, owner.userId));
      return preference?.optedIn
        ? { status: 'invalid' as const }
        : { status: 'unsubscribed' as const, mayStillArrive };
    }
    await tx
      .update(admissionAlertSubscriptions)
      .set({ status: 'cancelled', cancelledAt: now, updatedAt: now })
      .where(
        and(
          eq(admissionAlertSubscriptions.userId, owner.userId),
          inArray(admissionAlertSubscriptions.status, [
            'active',
            'needs_profile_refresh',
            'pending_delivery',
            'delivery_failed',
          ]),
        ),
      );
    for (const delivery of deliveries) {
      const suppress =
        ['pending', 'retryable', 'processing'].includes(delivery.status) &&
        !delivery.submissionStartedAt &&
        !delivery.acceptanceUnknownAt;
      await tx
        .update(admissionAlertOutbox)
        .set({
          unsubscribeUsedAt: now,
          updatedAt: now,
          ...(suppress
            ? {
                status: 'suppressed' as const,
                mailPayload: null,
                claimToken: null,
                leaseExpiresAt: null,
                nextAttemptAt: null,
              }
            : {}),
        })
        .where(eq(admissionAlertOutbox.id, delivery.id));
    }
    await tx
      .insert(admissionAlertEmailPreferences)
      .values({ userId: owner.userId, optedIn: false, unsubscribedAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: admissionAlertEmailPreferences.userId,
        set: { optedIn: false, unsubscribedAt: now, updatedAt: now },
      });
    return { status: 'unsubscribed' as const, mayStillArrive };
  });
}
