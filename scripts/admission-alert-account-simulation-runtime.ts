/** Manual proof only. Never imported by application routes or scheduled workers. */
import { createHash, randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import type { AppDatabase } from '@/db/client';
import { queryRows } from '@/db/queryRows';
import * as schema from '@/db/schema';
import { admissionCycleFor } from '@/server/admission-alerts/cycle';
import {
  processAdmissionAlertTransitionWork,
  createDrizzleAdmissionAlertTransitionProcessorRepository,
} from '@/server/admission-alerts/transitionProcessor';
import {
  processAdmissionAlertDelivery,
  createDrizzleAdmissionAlertDeliveryRepository,
  type AdmissionAlertMailProvider,
} from '@/server/admission-alerts/deliveryWorker';
import { renderAdmissionAlertEmail } from '@/server/admission-alerts/emailTemplate';
import {
  alertRecipientHash,
  freezeAlertPayload,
  materializeAlertPayload,
} from '@/server/admission-alerts/deliveryPreparation';
import {
  deriveAdmissionAlertUnsubscribeToken,
  hashAdmissionAlertToken,
} from '@/server/admission-alerts/unsubscribeService';

const SCENARIO = 'plan004-account-simulation-v1';
const RECIPIENT = 'amitm1630@gmail.com';
const NOTICE =
  'בדיקת סימולציה בלבד — אין שינוי אמיתי בתנאי הקבלה. קישור ההסרה פעיל עבור חשבון הבדיקה.';

function manifest(userId: string) {
  return `sha256:${createHash('sha256').update(`${SCENARIO}:${userId}`).digest('hex')}`;
}

export async function accountSimulationStatus(db: AppDatabase, userId: string) {
  return queryRows(
    await db.execute<{
      target: string;
      status: string;
      provider_message_id: string | null;
      delivery_events: unknown;
      unsubscribed: boolean;
    }>(sql`
    select s.institution_id as target,o.status::text,o.provider_message_id,o.delivery_events,
      o.unsubscribe_used_at is not null as unsubscribed
    from admission_alert_outbox o join admission_alert_subscriptions s on s.id=o.subscription_id
    join admission_target_transitions t on t.id=o.transition_id
    join admission_releases r on r.id=t.release_id
    where s.user_id=${userId}::uuid and r.manifest_digest=${manifest(userId)}
      and r.release_kind='operational_proof' and r.proof_scenario=${SCENARIO}
    order by s.institution_id
  `),
  );
}

export async function runAccountAlertSimulation(input: {
  db: AppDatabase;
  userId: string;
  secret: string;
  provider: AdmissionAlertMailProvider;
}) {
  const { db, userId, secret } = input;
  if (!/^[a-f0-9-]{36}$/.test(userId)) throw new Error('A test account UUID is required.');
  deriveAdmissionAlertUnsubscribeToken('configuration-check', secret);
  // A stable scenario per account prevents a fresh dispatch from creating new sends.
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${manifest(userId)}))`);
    const existing = queryRows(
      await tx.execute(
        sql`select id from admission_releases where manifest_digest=${manifest(userId)}`,
      ),
    );
    if (existing.length) return;
    const profiles = queryRows(
      await tx.execute(
        sql`select user_id from user_profiles where user_id=${userId}::uuid for update`,
      ),
    );
    if (profiles.length !== 1) throw new Error('The approved account must have a saved profile.');
    const active = queryRows(
      await tx.execute(
        sql`select id from admission_alert_subscriptions where user_id=${userId}::uuid and status in ('active','needs_profile_refresh','pending_delivery')`,
      ),
    );
    if (active.length)
      throw new Error('Finish existing account alerts before running the simulation.');
    const now = new Date(),
      cycle = admissionCycleFor(now),
      releaseId = randomUUID(),
      profileId = randomUUID();
    await tx.insert(schema.bagrutProfileVersions).values({
      id: profileId,
      userId,
      schemaVersion: 1,
      contentHash: manifest(userId),
      sector: 'jewish',
      subjects: [{ subjectId: 'mathematics', units: 5, grade: 85 }],
    });
    await tx.insert(schema.admissionReleases).values({
      id: releaseId,
      manifestDigest: manifest(userId),
      repositoryCommit: 'simulation-only',
      status: 'published',
      publishedAt: now,
      releaseKind: 'operational_proof',
      proofScenario: SCENARIO,
    });
    // Explicit user approval is confined to this test account. Its saved profile is untouched.
    await tx
      .insert(schema.admissionAlertEmailPreferences)
      .values({ userId, optedIn: true })
      .onConflictDoUpdate({
        target: schema.admissionAlertEmailPreferences.userId,
        set: { optedIn: true, unsubscribedAt: null, updatedAt: now },
      });
    for (const institutionId of ['tau', 'bgu']) {
      const transitionId = randomUUID(),
        subscriptionId = randomUUID(),
        workId = randomUUID(),
        claimToken = randomUUID();
      const programId = `${institutionId}_cs`,
        afterVersion = `${SCENARIO}:eligible`;
      await tx.insert(schema.admissionTargetTransitions).values({
        id: transitionId,
        releaseId,
        institutionId,
        programId,
        cycle,
        beforeVersion: `${SCENARIO}:below`,
        afterVersion,
      });
      await tx.insert(schema.admissionAlertSubscriptions).values({
        id: subscriptionId,
        userId,
        institutionId,
        programId,
        cycle,
        status: 'active',
        profileVersionId: profileId,
        profileHash: SCENARIO,
        baselineRuleVersion: `${SCENARIO}:below`,
        baselineVerdict: { decision: 'below' },
      });
      await tx.insert(schema.admissionAlertTransitionWork).values({
        id: workId,
        transitionId,
        status: 'processing',
        claimToken,
        claimedAt: now,
        leaseExpiresAt: new Date(now.getTime() + 60_000),
      });
      const transitions = createDrizzleAdmissionAlertTransitionProcessorRepository(tx);
      const result = await processAdmissionAlertTransitionWork({
        now,
        repository: {
          ...transitions,
          // Do not invoke global queue claims: this proof may touch only its own rows.
          claimNextWork: async () => ({
            id: workId,
            claimToken,
            transitionId,
            institutionId,
            programId,
            afterVersion,
            transitionAt: now,
            subscriptions: [
              {
                id: subscriptionId,
                status: 'active',
                profileVersionId: profileId,
                profileHash: SCENARIO,
                baselineVerdict: { decision: 'below' },
              },
            ],
          }),
          finishBatch: async () => {
            await tx
              .update(schema.admissionAlertTransitionWork)
              .set({
                status: 'completed',
                claimToken: null,
                leaseExpiresAt: null,
                completedAt: now,
              })
              .where(eq(schema.admissionAlertTransitionWork.id, workId));
            return 'completed';
          },
        },
        // Deliberately simulated authority, not a live canonical admission evaluation.
        evaluate: async () => ({
          decision: 700 >= 699 ? 'eligible' : 'below',
          isMathematicallyVerified: true,
          ruleVersion: afterVersion,
        }),
      });
      if (result.status !== 'completed') throw new Error('Simulated transition did not complete.');
      const [outbox] = await tx
        .select()
        .from(schema.admissionAlertOutbox)
        .where(eq(schema.admissionAlertOutbox.subscriptionId, subscriptionId));
      if (!outbox) throw new Error('Simulated transition did not queue delivery.');
      const [verified] = queryRows(
        await tx.execute<{ email: string | null }>(
          sql`select admission_alert_private.delivery_recipient(${outbox.id}::uuid) as email`,
        ),
      );
      if (verified?.email?.toLowerCase() !== RECIPIENT)
        throw new Error('This is not the approved recipient.');
      const token = deriveAdmissionAlertUnsubscribeToken(outbox.id, secret);
      const payload = await renderAdmissionAlertEmail(
        {
          recipient: RECIPIENT,
          institutionName: institutionId === 'tau' ? 'אוניברסיטת תל אביב' : 'אוניברסיטת בן־גוריון',
          programName: 'מדעי המחשב',
          reviewedAt: now,
          cycle,
          unsubscribeToken: token,
        },
        {
          from: 'onboarding@resend.dev',
          supportEmail: RECIPIENT,
          origin: 'https://toar-academic-guide.vercel.app',
        },
      );
      payload.subject = `[SIMULATION — ${institutionId.toUpperCase()}] MyWay`;
      payload.text = `${NOTICE}\n\n${payload.text}`;
      payload.html = payload.html.replace('</body>', `<p dir="rtl">${NOTICE}</p></body>`);
      // Production preparation correctly rejects operational proofs. Only this manual
      // runner prepares labelled fixture mail; that production gate stays unchanged.
      await tx
        .update(schema.admissionAlertOutbox)
        .set({
          mailPayload: freezeAlertPayload(payload, token),
          unsubscribeTokenHash: hashAdmissionAlertToken(token),
          recipientHash: alertRecipientHash(RECIPIENT),
        })
        .where(eq(schema.admissionAlertOutbox.id, outbox.id));
    }
  });

  const previous = await accountSimulationStatus(db, userId);
  if (
    previous.length !== 2 ||
    previous.some((row) => !['pending', 'accepted'].includes(row.status))
  )
    throw new Error('Inspect existing simulation before any further sending.');
  const delivery = createDrizzleAdmissionAlertDeliveryRepository(db, secret);
  let sends = 0;
  for (let i = 0; i < 2; i++) {
    const result = await processAdmissionAlertDelivery({
      repository: {
        ...delivery,
        claimNextDelivery: async ({ now, currentCycle }) =>
          db.transaction(async (tx) => {
            const [row] = queryRows(
              await tx.execute<{
                id: string;
                subscription_id: string;
                idempotency_key: string;
                mail_payload: NonNullable<
                  typeof schema.admissionAlertOutbox.$inferSelect.mailPayload
                >;
                unsubscribe_token_hash: string;
              }>(sql`
            select o.id,o.subscription_id,o.idempotency_key,o.mail_payload,o.unsubscribe_token_hash
            from admission_alert_outbox o join admission_alert_subscriptions s on s.id=o.subscription_id
            join admission_target_transitions t on t.id=o.transition_id join admission_releases r on r.id=t.release_id
            where s.user_id=${userId}::uuid and r.manifest_digest=${manifest(userId)}
              and r.release_kind='operational_proof' and r.proof_scenario=${SCENARIO}
              and s.status='pending_delivery' and s.cycle=${currentCycle}
              and o.status='pending' and o.first_submitted_at is null and o.mail_payload is not null
            order by s.institution_id limit 1 for update of o skip locked
          `),
            );
            if (!row) return null;
            const claimToken = randomUUID();
            await tx
              .update(schema.admissionAlertOutbox)
              .set({
                status: 'processing',
                claimToken,
                leaseExpiresAt: new Date(now.getTime() + 300_000),
              })
              .where(eq(schema.admissionAlertOutbox.id, row.id));
            return {
              id: row.id,
              subscriptionId: row.subscription_id,
              idempotencyKey: row.idempotency_key,
              claimToken,
              payload: materializeAlertPayload(
                row.mail_payload,
                row.id,
                row.unsubscribe_token_hash,
                secret,
              ),
            };
          }),
      },
      provider: {
        send: async (request) => {
          if (
            request.payload.to !== RECIPIENT ||
            !request.payload.subject.startsWith('[SIMULATION — ') ||
            ++sends > 2
          )
            throw new Error('Simulation scope mismatch.');
          return input.provider.send(request);
        },
      },
    });
    if (result.status === 'idle') break;
    if (result.status !== 'accepted')
      throw new Error('Simulation stopped. Inspect persisted status; do not retry uncertain mail.');
  }
  return accountSimulationStatus(db, userId);
}
