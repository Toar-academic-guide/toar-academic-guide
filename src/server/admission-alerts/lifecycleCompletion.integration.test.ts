import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, describe, expect, it, vi } from 'vitest';
import postgres, { type TransactionSql } from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/db/schema';
vi.mock('server-only', () => ({}));
import { prepareNextAlertDelivery } from './deliveryPreparation';
import {
  createDrizzleAdmissionAlertDeliveryRepository,
  processAdmissionAlertDelivery,
} from './deliveryWorker';
import { admissionCycleFor } from './cycle';
import { deriveAdmissionAlertUnsubscribeToken } from './unsubscribeService';
import { retryFailedAlertDelivery } from './retryDelivery';
import {
  createDrizzleAdmissionAlertSubscriptionRepository,
  createAdmissionAlertSubscription,
} from './subscriptionService';
import { createDrizzleAdmissionAlertExpirationRepository } from './expirationService';
import { createResendAdmissionAlertProvider } from './resendProvider';
import { liveProofConfiguration } from '../../../scripts/admission-alert-live-proof.mjs';

const liveProof = liveProofConfiguration(process.env);
const enabled = process.env.ALERT_DB_INTEGRATION === '1';
const url = process.env.DATABASE_URL ?? 'postgresql://unused';
if (enabled && !['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Use disposable localhost PostgreSQL only.');
describe.skipIf(!enabled)('complete alert lifecycle with real database functions', () => {
  const client = postgres(url, { max: 1, prepare: false });
  const secret = liveProof ? randomBytes(32).toString('base64url') : 's'.repeat(43);
  const config = liveProof?.email ?? {
    from: 'alerts@example.org',
    supportEmail: 'support@example.org',
    origin: 'https://example.org',
  };
  const rollback = new Error('fixture rollback');
  // Drizzle needs connection options and begin(); map nested transactions to real savepoints.
  const database = (tx: TransactionSql) =>
    drizzle(
      Object.assign(tx, {
        options: client.options,
        begin: tx.savepoint,
      }) as unknown as typeof client,
      { schema },
    );
  async function isolated(run: (tx: TransactionSql) => Promise<void>) {
    try {
      await client.begin(async (tx) => {
        await run(tx);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  }
  async function seed(tx: TransactionSql, target = 'tau', cycle = admissionCycleFor()) {
    const userId = randomUUID(),
      profileId = randomUUID(),
      releaseId = randomUUID(),
      transitionId = randomUUID(),
      subId = randomUUID(),
      outboxId = randomUUID();
    await tx`insert into auth.users (id,email,email_confirmed_at) values (${userId},'fixture@example.org',now())`;
    await tx`insert into public.bagrut_profile_versions (id,user_id,schema_version,content_hash,sector,subjects) values (${profileId},${userId},1,${randomUUID()},'jewish','[{"subjectId":"mathematics","units":5,"grade":90}]')`;
    await tx`insert into public.user_profiles (user_id,bagrut_profile_version_id,psychometric_overall,bagrut_weighted_average) values (${userId},${profileId},650,100)`;
    await tx`insert into public.admission_releases (id,manifest_digest,repository_commit,status,published_at) values (${releaseId},${randomUUID()},'fixture','published',now())`;
    await tx`insert into public.admission_target_transitions (id,release_id,institution_id,program_id,cycle,before_version,after_version) values (${transitionId},${releaseId},${target},${target + '_cs'},${cycle},'before','after')`;
    await tx`insert into public.admission_alert_subscriptions (id,user_id,institution_id,program_id,cycle,status,profile_version_id,profile_hash,baseline_rule_version,baseline_verdict) values (${subId},${userId},${target},${target + '_cs'},${cycle},'pending_delivery',${profileId},'fixture','before','{}')`;
    await tx`insert into public.admission_alert_outbox (id,subscription_id,transition_id,idempotency_key) values (${outboxId},${subId},${transitionId},${'admission-alert:' + outboxId.replaceAll('-', '').repeat(2)})`;
    return { userId, profileId, subId, outboxId, transitionId };
  }
  afterAll(async () => client.end());
  it.each(['tau', 'bgu'])(
    'prepares %s without storing its token, accepts once, and never replays',
    async (target) =>
      isolated(async (tx) => {
        const f = await seed(tx, target);
        if (liveProof) {
          await tx`update auth.users set email=${liveProof.recipient} where id=${f.userId}`;
        }
        const db = database(tx);
        expect(await prepareNextAlertDelivery(config, secret, db)).toBe(true);
        // Label only the disposable immutable snapshot, before its first submission.
        // Exercise this in ordinary stub-provider tests too. Fixture tokens never exist in production.
        const notice = 'בדיקה בלבד — אין שינוי אמיתי בתנאי הקבלה. קישור ההסרה בבדיקה אינו פעיל.';
        await tx`update public.admission_alert_outbox set mail_payload = mail_payload || jsonb_build_object(
            'subject', ${`[בדיקה בלבד — ${target.toUpperCase()}] MyWay`}::text,
            'html', replace(mail_payload->>'html', '</body>', ${`<p dir="rtl">${notice}</p></body>`}),
            'text', ${notice + '\n\n'} || (mail_payload->>'text')
          ) where id=${f.outboxId}`;
        const [stored] =
          await tx`select * from public.admission_alert_outbox where id=${f.outboxId}`;
        expect(
          JSON.stringify(stored).includes(deriveAdmissionAlertUnsubscribeToken(f.outboxId, secret)),
        ).toBe(false);
        let providerCalls = 0;
        const send = vi.fn<import('./deliveryWorker').AdmissionAlertMailProvider['send']>(
          async (request) => {
            if (!liveProof) return { status: 'accepted', providerMessageId: 'provider-fixture' };
            if (request.payload.to !== liveProof.recipient || ++providerCalls !== 1)
              throw new Error('Live proof recipient or send-count mismatch.');
            await delay(1100);
            const result = await createResendAdmissionAlertProvider({
              apiKey: liveProof.apiKey,
            }).send(request);
            console.log(
              JSON.stringify({
                target,
                status: result.status,
                ...(result.status === 'accepted'
                  ? { providerMessageId: result.providerMessageId }
                  : {}),
              }),
            );
            return result;
          },
        );
        const repository = createDrizzleAdmissionAlertDeliveryRepository(db, secret);
        expect(await processAdmissionAlertDelivery({ repository, provider: { send } })).toEqual({
          status: 'accepted',
        });
        expect(await processAdmissionAlertDelivery({ repository, provider: { send } })).toEqual({
          status: 'idle',
        });
        expect(send).toHaveBeenCalledTimes(1);
        expect(
          JSON.stringify(send.mock.calls[0]).includes(
            deriveAdmissionAlertUnsubscribeToken(f.outboxId, secret),
          ),
        ).toBe(true);
        expect(
          (
            await tx`select mail_payload from public.admission_alert_outbox where id=${f.outboxId}`
          )[0].mail_payload,
        ).toBeNull();
      }),
    30_000,
  );
  it('blocks a changed or unverified recipient at the submission boundary', async () =>
    isolated(async (tx) => {
      const f = await seed(tx);
      const db = database(tx);
      await prepareNextAlertDelivery(config, secret, db);
      await tx`update auth.users set email_confirmed_at=null where id=${f.userId}`;
      const send = vi.fn();
      expect(
        await processAdmissionAlertDelivery({
          repository: createDrizzleAdmissionAlertDeliveryRepository(db, secret),
          provider: { send },
        }),
      ).toEqual({ status: 'suppressed' });
      expect(send).not.toHaveBeenCalled();
    }));
  it('removes account-linked profiles, delivery records, tokens and webhook identifiers', async () =>
    isolated(async (tx) => {
      const f = await seed(tx);
      await prepareNextAlertDelivery(config, secret, database(tx));
      await tx`insert into public.admission_alert_email_preferences(user_id) values (${f.userId})`;
      await tx`insert into public.admission_alert_webhook_events(id,outbox_id,provider_event_type) values (${randomUUID()},${f.outboxId},'email.sent')`;
      await tx`delete from auth.users where id=${f.userId}`;
      for (const [table, column, id] of [
        ['user_profiles', 'user_id', f.userId],
        ['bagrut_profile_versions', 'id', f.profileId],
        ['admission_alert_subscriptions', 'id', f.subId],
        ['admission_alert_outbox', 'id', f.outboxId],
        ['admission_alert_email_preferences', 'user_id', f.userId],
        ['admission_alert_webhook_events', 'outbox_id', f.outboxId],
      ]) {
        expect(
          await tx.unsafe(`select 1 from public.${table} where ${column}=$1`, [id]),
        ).toHaveLength(0);
      }
    }));
  it('prunes past-retention records, but does not delete a current-cycle subscription', async () =>
    isolated(async (tx) => {
      const f = await seed(tx, 'tau', '2023');
      const current = await seed(tx, 'bgu');
      await tx`insert into public.admission_alert_webhook_events(id,provider_event_type,received_at) values (${randomUUID()},'email.sent',now()-interval '31 days')`;
      const [result] = await tx`select admission_alert_private.prune_retained_data() as result`;
      expect(result.result).toEqual({ webhookEventsDeleted: 1, subscriptionsDeleted: 1 });
      expect(
        await tx`select 1 from public.admission_alert_outbox where id=${f.outboxId}`,
      ).toHaveLength(0);
      expect(
        await tx`select 1 from public.admission_alert_subscriptions where id=${current.subId}`,
      ).toHaveLength(1);
    }));
  it('uses only the owned verified recipient through the narrowly granted runtime function', async () =>
    isolated(async (tx) => {
      const f = await seed(tx);
      await tx`set local role app_runtime`;
      expect(
        (
          await tx`select admission_alert_private.delivery_recipient(${f.outboxId}::uuid) as email`
        )[0].email,
      ).toBe('fixture@example.org');
      await tx`select set_config('request.jwt.claim.sub', ${randomUUID()}, true)`;
      expect(
        (
          await tx`select admission_alert_private.delivery_recipient(${f.outboxId}::uuid) as email`
        )[0].email,
      ).toBeNull();
      await tx`reset role`;
      expect(
        (await tx`select has_table_privilege('app_runtime','auth.users','SELECT') as allowed`)[0]
          .allowed,
      ).toBe(false);
    }));
  it('retries a definitive rejection only after a verified address change, keeping one delivery row', async () =>
    isolated(async (tx) => {
      const f = await seed(tx);
      const db = database(tx);
      const profile = await createDrizzleAdmissionAlertSubscriptionRepository(db).getProfile(
        f.userId,
      );
      await tx`update public.admission_alert_subscriptions set profile_hash=${profile!.profileHash} where id=${f.subId}`;
      await prepareNextAlertDelivery(config, secret, db);
      await processAdmissionAlertDelivery({
        repository: createDrizzleAdmissionAlertDeliveryRepository(db, secret),
        provider: { send: async () => ({ status: 'permanent' }) },
      });
      expect(await retryFailedAlertDelivery(f.userId, f.subId, db)).toEqual({
        status: 'changed_verified_email_required',
      });
      await tx`update auth.users set email='changed@example.org' where id=${f.userId}`;
      expect(await retryFailedAlertDelivery(randomUUID(), f.subId, db)).toEqual({
        status: 'not_found',
      });
      expect(await retryFailedAlertDelivery(f.userId, f.subId, db)).toEqual({
        status: 'retry_queued',
      });
      await prepareNextAlertDelivery(config, secret, db);
      const send = vi
        .fn()
        .mockResolvedValue({ status: 'accepted', providerMessageId: 'retry-fixture' });
      expect(
        await processAdmissionAlertDelivery({
          repository: createDrizzleAdmissionAlertDeliveryRepository(db, secret),
          provider: { send },
        }),
      ).toEqual({ status: 'accepted' });
      expect(JSON.stringify(send.mock.calls)).toContain('changed@example.org');
      expect(
        await tx`select 1 from public.admission_alert_outbox where subscription_id=${f.subId}`,
      ).toHaveLength(1);
      expect(await retryFailedAlertDelivery(f.userId, f.subId, db)).toEqual({
        status: 'not_retryable',
      });
    }));
  it('never queues a new request after acceptance uncertainty', async () =>
    isolated(async (tx) => {
      const f = await seed(tx);
      await tx`update public.admission_alert_subscriptions set status='delivery_failed' where id=${f.subId}`;
      await tx`update public.admission_alert_outbox set status='failed',failure_reason='provider_rejected',acceptance_unknown_at=now() where id=${f.outboxId}`;
      expect(await retryFailedAlertDelivery(f.userId, f.subId, database(tx))).toEqual({
        status: 'not_retryable',
      });
    }));
  it('requires explicit fresh below-baseline confirmation for a paused subscription', async () =>
    isolated(async (tx) => {
      const f = await seed(tx);
      const repository = createDrizzleAdmissionAlertSubscriptionRepository(database(tx));
      await tx`update public.admission_alert_subscriptions set status='needs_profile_refresh' where id=${f.subId}`;
      const evaluate = vi
        .fn()
        .mockResolvedValue({ decision: 'below', ruleVersion: 'new-baseline' });
      const target = { institutionId: 'tau', programId: 'tau_cs' };
      expect(
        await createAdmissionAlertSubscription(target, { userId: f.userId, repository, evaluate }),
      ).toEqual({ status: 'needs_profile_refresh' });
      expect(evaluate).not.toHaveBeenCalled();
      const result = await createAdmissionAlertSubscription(target, {
        userId: f.userId,
        repository,
        evaluate,
        reconfirm: true,
      });
      expect(result.status).toBe('created');
      expect(
        (await tx`select status from public.admission_alert_subscriptions where id=${f.subId}`)[0]
          .status,
      ).toBe('cancelled');
      expect(
        (await tx`select status from public.admission_alert_outbox where id=${f.outboxId}`)[0]
          .status,
      ).toBe('suppressed');
      expect(
        (
          await tx`select opted_in from public.admission_alert_email_preferences where user_id=${f.userId}`
        )[0].opted_in,
      ).toBe(true);
    }));
  it('rejects activation if category consent changes while evaluating', async () =>
    isolated(async (tx) => {
      const f = await seed(tx);
      await tx`update public.admission_alert_subscriptions set status='cancelled' where id=${f.subId}`;
      const repository = createDrizzleAdmissionAlertSubscriptionRepository(database(tx));
      await expect(
        createAdmissionAlertSubscription(
          { institutionId: 'tau', programId: 'tau_cs' },
          {
            userId: f.userId,
            repository,
            reconfirm: true,
            evaluate: async () => {
              await tx`insert into public.admission_alert_email_preferences(user_id,opted_in) values(${f.userId},false)`;
              return { decision: 'below', ruleVersion: 'new-baseline' };
            },
          },
        ),
      ).rejects.toThrow('preference changed');
      expect(
        (
          await tx`select opted_in from public.admission_alert_email_preferences where user_id=${f.userId}`
        )[0].opted_in,
      ).toBe(false);
    }));
  it('expires both targets at cycle reset and removes pending payloads without changing uncertain acceptance', async () =>
    isolated(async (tx) => {
      const tau = await seed(tx, 'tau');
      const bgu = await seed(tx, 'bgu');
      const db = database(tx);
      await prepareNextAlertDelivery(config, secret, db);
      await prepareNextAlertDelivery(config, secret, db);
      await tx`update public.admission_alert_outbox set status='acceptance_unknown',acceptance_unknown_at=now(),submission_started_at=now() where id=${bgu.outboxId}`;
      expect(
        await createDrizzleAdmissionAlertExpirationRepository(db).expirePriorCycles({
          currentCycle: String(Number(admissionCycleFor()) + 1),
        }),
      ).toBe(2);
      const rows =
        await tx`select status,mail_payload,unsubscribe_token_hash from public.admission_alert_outbox where id in (${tau.outboxId},${bgu.outboxId}) order by status`;
      expect(rows.map((r) => r.status)).toEqual(['acceptance_unknown', 'suppressed']);
      expect(rows.every((r) => r.mail_payload === null && r.unsubscribe_token_hash === null)).toBe(
        true,
      );
    }));
  it.each(['anon', 'authenticated', 'ops_readonly'])(
    'does not expose private functions to %s',
    async (role) => {
      await expect(
        client.begin(async (tx) => {
          await tx.unsafe(`set local role ${role}`);
          await tx`select admission_alert_private.delivery_recipient(${randomUUID()}::uuid)`;
        }),
      ).rejects.toMatchObject({ code: '42501' });
    },
  );
});
