import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
vi.mock('server-only', () => ({}));
import { unsubscribeAdmissionAlerts, hashAdmissionAlertToken } from './unsubscribeService';
import { recordAdmissionAlertWebhook, type VerifiedAlertEvent } from './webhookService';
import { createDrizzleAdmissionAlertDeliveryRepository } from './deliveryWorker';

const enabled = process.env.ALERT_DB_INTEGRATION === '1';
if (enabled && !process.env.DATABASE_URL) throw new Error('DATABASE_URL required.');
describe.skipIf(!enabled)('webhook and unsubscribe PostgreSQL transactions', () => {
  const namespace = `alert_webhook_test_${randomUUID().replaceAll('-', '')}`;
  const client = postgres(process.env.DATABASE_URL ?? 'postgresql://unused', {
    max: 3,
    prepare: false,
    connection: { search_path: `${namespace},public` },
  });
  const db = drizzle(client, { schema });
  const tables = [
    'user_profiles',
    'admission_alert_subscriptions',
    'admission_alert_outbox',
    'admission_alert_email_preferences',
    'admission_alert_webhook_events',
  ];
  const now = new Date('2026-09-29T12:00:00Z');
  async function seed(status = 'pending', cycle = '2026') {
    const userId = randomUUID();
    const token = randomBytes(32).toString('base64url');
    await client`insert into user_profiles (user_id) values (${userId})`;
    const [sub] =
      await client`insert into admission_alert_subscriptions (user_id,institution_id,program_id,cycle,status,profile_version_id,profile_hash,baseline_rule_version,baseline_verdict)
      values (${userId},'tau','tau_cs',${cycle},'pending_delivery',gen_random_uuid(),'private','v1','{}') returning id`;
    const key = `admission-alert:${randomBytes(32).toString('hex')}`;
    const [outbox] =
      await client`insert into admission_alert_outbox (subscription_id,transition_id,idempotency_key,status,unsubscribe_token_hash,mail_payload)
      values (${sub.id},gen_random_uuid(),${key},${status},${hashAdmissionAlertToken(token)},'{}') returning id`;
    return { userId, token, subscriptionId: sub.id, outboxId: outbox.id, key };
  }
  const state = async (id: string) =>
    (await client`select * from admission_alert_outbox where id=${id}`)[0];
  const event = (key: string, type = 'email.delivered'): VerifiedAlertEvent => ({
    id: randomUUID(),
    type,
    occurredAt: now.toISOString(),
    providerMessageId: 'provider-1',
    idempotencyKey: key,
  });
  beforeAll(async () => {
    await client.unsafe(`create schema ${namespace}`);
    for (const table of tables)
      await client.unsafe(
        `create table ${namespace}.${table} (like public.${table} including all)`,
      );
  });
  beforeEach(async () => {
    await client.unsafe(`truncate ${tables.map((t) => `${namespace}.${t}`).join(',')}`);
  });
  afterAll(async () => {
    await client.unsafe(`drop schema ${namespace} cascade`);
    await client.end();
  });

  it('suppresses claimed-before-send work and disables the category idempotently', async () => {
    const target = await seed();
    const repository = createDrizzleAdmissionAlertDeliveryRepository(db);
    const delivery = (await repository.claimNextDelivery({ now, currentCycle: '2026' }))!;
    expect(await unsubscribeAdmissionAlerts(target.token, db, now)).toEqual({
      status: 'unsubscribed',
      mayStillArrive: false,
    });
    expect(await repository.beginSubmission({ delivery, now, currentCycle: '2026' })).toBe(
      'lease_lost',
    );
    expect(await state(target.outboxId)).toMatchObject({
      status: 'suppressed',
      mail_payload: null,
      claim_token: null,
    });
    expect((await client`select opted_in from admission_alert_email_preferences`)[0].opted_in).toBe(
      false,
    );
    expect(await unsubscribeAdmissionAlerts(target.token, db, now)).toEqual({
      status: 'unsubscribed',
      mayStillArrive: false,
    });
  });
  it('rejects invalid and expired tokens without changing preferences', async () => {
    const target = await seed('pending', '2025');
    expect(await unsubscribeAdmissionAlerts(target.token, db, now)).toEqual({ status: 'invalid' });
    expect(await unsubscribeAdmissionAlerts('bogus', db, now)).toEqual({ status: 'invalid' });
    expect(await client`select * from admission_alert_email_preferences`).toHaveLength(0);
  });
  it('a used token cannot revoke a later explicit opt-in', async () => {
    const target = await seed();
    await unsubscribeAdmissionAlerts(target.token, db, now);
    await client`update admission_alert_email_preferences set opted_in=true`;
    expect(await unsubscribeAdmissionAlerts(target.token, db, now)).toEqual({ status: 'invalid' });
    expect((await client`select opted_in from admission_alert_email_preferences`)[0].opted_in).toBe(
      true,
    );
  });
  it('reconciles cancelled uncertain submissions by observation without reopening', async () => {
    const target = await seed('acceptance_unknown');
    await client`update admission_alert_outbox set first_submitted_at=${now.toISOString()},submission_started_at=${now.toISOString()},acceptance_unknown_at=${now.toISOString()}`;
    expect(await unsubscribeAdmissionAlerts(target.token, db, now)).toEqual({
      status: 'unsubscribed',
      mayStillArrive: true,
    });
    expect(
      await createDrizzleAdmissionAlertDeliveryRepository(db).claimNextDelivery({
        now,
        currentCycle: '2026',
      }),
    ).toBeNull();
    expect(await recordAdmissionAlertWebhook(event(target.key), db, now)).toEqual({
      status: 'recorded',
    });
    expect(await state(target.outboxId)).toMatchObject({
      status: 'accepted',
      mail_payload: null,
      provider_message_id: 'provider-1',
    });
    expect((await client`select status from admission_alert_subscriptions`)[0].status).toBe(
      'cancelled',
    );
  });
  it.each([
    ['email.bounced', 'email.delivered'],
    ['email.delivered', 'email.bounced'],
  ])('deduplicates concurrent %s events and preserves the later %s fact', async (first, second) => {
    const target = await seed('acceptance_unknown');
    await client`update admission_alert_outbox set first_submitted_at=${now.toISOString()}`;
    const initial = event(target.key, first);
    const results = await Promise.all([
      recordAdmissionAlertWebhook(initial, db, now),
      recordAdmissionAlertWebhook(initial, db, now),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(['duplicate', 'recorded']);
    await recordAdmissionAlertWebhook(event(target.key, second), db, now);
    await recordAdmissionAlertWebhook(event(target.key, 'email.sent'), db, now);
    expect((await state(target.outboxId)).delivery_events).toEqual({
      'email.bounced': now.toISOString(),
      'email.delivered': now.toISOString(),
      'email.sent': now.toISOString(),
    });
    expect((await client`select status from admission_alert_subscriptions`)[0].status).toBe(
      'notified',
    );
    const stored = await client`select payload_metadata from admission_alert_webhook_events`;
    expect(stored.every((row) => Object.keys(row.payload_metadata).join() === 'occurredAt')).toBe(
      true,
    );
  });
  it('does not correlate an event to work that was never submitted', async () => {
    const target = await seed();
    expect(await recordAdmissionAlertWebhook(event(target.key), db, now)).toEqual({
      status: 'ignored',
    });
    expect((await state(target.outboxId)).status).toBe('pending');
  });
});
