import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
vi.mock('server-only', () => ({}));
import {
  ALERT_DELIVERY_LEASE_MS,
  ALERT_IDEMPOTENCY_RETRY_MS,
  createDrizzleAdmissionAlertDeliveryRepository,
  processAdmissionAlertDelivery,
} from './deliveryWorker';
import { createDrizzleAdmissionAlertAccountRepository } from './accountService';

const enabled = process.env.ALERT_DB_INTEGRATION === '1';
if (enabled && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
describe.skipIf(!enabled)('delivery recovery with PostgreSQL', () => {
  const namespace = `alert_delivery_test_${randomUUID().replaceAll('-', '')}`;
  const client = postgres(process.env.DATABASE_URL ?? 'postgresql://unused', {
    max: 3,
    prepare: false,
    connection: { search_path: `${namespace},public` },
  });
  const db = drizzle(client, { schema });
  const repository = createDrizzleAdmissionAlertDeliveryRepository(db);
  const accounts = createDrizzleAdmissionAlertAccountRepository(db);
  const tables = [
    'admission_alert_subscriptions',
    'admission_alert_outbox',
    'admission_alert_email_preferences',
  ];
  const now = new Date('2026-09-29T10:00:00Z');
  const payload = {
    from: 'support@example.org',
    to: 'recipient@example.org',
    subject: 'עדכון',
    html: '<p>עדכון</p>',
    text: 'עדכון',
    reply_to: 'support@example.org',
  };
  const claim = (at = now) => repository.claimNextDelivery({ now: at, currentCycle: '2026' });
  const begin = (delivery: NonNullable<Awaited<ReturnType<typeof claim>>>, at = now) =>
    repository.beginSubmission({ delivery, now: at, currentCycle: '2026' });
  async function seed() {
    const userId = randomUUID();
    const [subscription] = await client`insert into admission_alert_subscriptions
      (user_id,institution_id,program_id,cycle,status,profile_version_id,profile_hash,baseline_rule_version,baseline_verdict)
      values (${userId},'tau','tau_cs','2026','pending_delivery',gen_random_uuid(),'private','v1','{"decision":"below"}') returning id`;
    await client`insert into admission_alert_email_preferences (user_id) values (${userId})`;
    const [outbox] =
      await client`insert into admission_alert_outbox (subscription_id,transition_id,idempotency_key,mail_payload)
      values (${subscription.id},gen_random_uuid(),${randomUUID()},${JSON.stringify(payload)}::jsonb) returning id`;
    return { userId, subscriptionId: subscription.id as string, outboxId: outbox.id as string };
  }
  const state = async () =>
    (
      await client`select status,claim_token,mail_payload,failure_reason,provider_message_id from admission_alert_outbox`
    )[0];
  beforeAll(async () => {
    await client.unsafe(`create schema ${namespace}`);
    for (const table of tables)
      await client.unsafe(
        `create table ${namespace}.${table} (like public.${table} including all)`,
      );
  });
  beforeEach(async () => {
    await client.unsafe(`truncate ${tables.map((table) => `${namespace}.${table}`).join(',')}`);
  });
  afterAll(async () => {
    await client.unsafe(`drop schema ${namespace} cascade`);
    await client.end();
  });

  it('allows one concurrent owner, recovers before submission, and fences the old owner', async () => {
    await seed();
    const claims = await Promise.all([claim(), claim()]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const first = claims.find(Boolean)!;
    const later = new Date(now.getTime() + ALERT_DELIVERY_LEASE_MS);
    const second = (await claim(later))!;
    expect(second.claimToken).not.toBe(first.claimToken);
    expect(await begin(first, later)).toBe('lease_lost');
    expect(await begin(second, later)).toBe('ready');
  });
  it('durably suppresses cancellation after claim and permits repeated cancellation', async () => {
    const target = await seed();
    const delivery = (await claim())!;
    expect(await accounts.cancelSubscription(target)).toEqual({ mayStillArrive: false });
    expect(await accounts.cancelSubscription(target)).toEqual({ mayStillArrive: false });
    expect(await begin(delivery)).toBe('lease_lost');
    expect(await state()).toMatchObject({
      status: 'suppressed',
      claim_token: null,
      mail_payload: null,
    });
  });
  it.each(['category', 'cycle', 'profile'] as const)(
    'rechecks %s consent before submission and suppresses durably',
    async (change) => {
      await seed();
      const delivery = (await claim())!;
      if (change === 'category')
        await client`update admission_alert_email_preferences set opted_in=false`;
      if (change === 'cycle') await client`update admission_alert_subscriptions set cycle='2025'`;
      if (change === 'profile')
        await client`update admission_alert_subscriptions set status='needs_profile_refresh'`;
      expect(await begin(delivery)).toBe('suppressed');
      expect(await state()).toMatchObject({ status: 'suppressed', claim_token: null });
    },
  );
  it('recovers a crash after submission with the same payload/key and closes exactly once', async () => {
    await seed();
    const delivery = (await claim())!;
    expect(await begin(delivery)).toBe('ready');
    const later = new Date(now.getTime() + ALERT_DELIVERY_LEASE_MS);
    const retry = (await claim(later))!;
    expect(retry.payload).toEqual(payload);
    expect(retry.idempotencyKey).toBe(delivery.idempotencyKey);
    expect(
      await repository.recordResult({
        delivery,
        now: later,
        result: { status: 'accepted', providerMessageId: 'old' },
      }),
    ).toBe(false);
    expect(await begin(retry, later)).toBe('ready');
    await repository.recordResult({
      delivery: retry,
      now: later,
      result: { status: 'accepted', providerMessageId: 'email-1' },
    });
    expect(await state()).toMatchObject({
      status: 'accepted',
      mail_payload: null,
      provider_message_id: 'email-1',
    });
    expect((await client`select status from admission_alert_subscriptions`)[0].status).toBe(
      'notified',
    );
    expect(await claim(later)).toBeNull();
  });
  it('never retries unknown acceptance after the idempotency window', async () => {
    await seed();
    await processAdmissionAlertDelivery({
      repository,
      now: () => now,
      provider: {
        send: async () => {
          throw new Error('timeout');
        },
      },
    });
    expect(await state()).toMatchObject({ status: 'acceptance_unknown' });
    expect(await claim(new Date(now.getTime() + ALERT_IDEMPOTENCY_RETRY_MS))).toBeNull();
    expect(await state()).toMatchObject({
      status: 'acceptance_unknown',
      failure_reason: 'idempotency_window_elapsed',
    });
  });
  it('also enforces the idempotency boundary if it elapses after claim', async () => {
    await seed();
    await processAdmissionAlertDelivery({
      repository,
      now: () => now,
      provider: { send: async () => ({ status: 'acceptance_unknown' }) },
    });
    const beforeBoundary = new Date(now.getTime() + ALERT_IDEMPOTENCY_RETRY_MS - 1);
    const retry = (await claim(beforeBoundary))!;
    expect(await begin(retry, new Date(beforeBoundary.getTime() + 1))).toBe('suppressed');
    expect(await state()).toMatchObject({ status: 'acceptance_unknown', claim_token: null });
  });
  it('preserves uncertainty after cancellation and a rejected reconciliation', async () => {
    const target = await seed();
    const first = (await claim())!;
    await begin(first);
    await repository.recordResult({
      delivery: first,
      now,
      result: { status: 'acceptance_unknown' },
    });
    const later = new Date(now.getTime() + 5 * 60_000);
    const retry = (await claim(later))!;
    await begin(retry, later);
    expect(await accounts.cancelSubscription(target)).toEqual({ mayStillArrive: true });
    await repository.recordResult({ delivery: retry, now: later, result: { status: 'permanent' } });
    expect(await state()).toMatchObject({ status: 'acceptance_unknown' });
    expect(await claim(new Date(later.getTime() + 5 * 60_000))).toBeNull();
  });
  it.each(['accepted', 'retryable', 'permanent'] as const)(
    'persists %s and does not strand a claim',
    async (status) => {
      await seed();
      await processAdmissionAlertDelivery({
        repository,
        now: () => now,
        provider: {
          send: async () =>
            status === 'accepted' ? { status, providerMessageId: 'email-1' } : { status },
        },
      });
      expect(await state()).toMatchObject({
        status: status === 'permanent' ? 'failed' : status,
        claim_token: null,
      });
      const expected =
        status === 'accepted'
          ? 'notified'
          : status === 'permanent'
            ? 'delivery_failed'
            : 'pending_delivery';
      expect((await client`select status from admission_alert_subscriptions`)[0].status).toBe(
        expected,
      );
      expect(await claim()).toBeNull();
    },
  );
});
