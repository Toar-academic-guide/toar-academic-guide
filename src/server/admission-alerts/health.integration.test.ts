import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { loadAdmissionAlertHealth } from './health';

const enabled = process.env.ALERT_DB_INTEGRATION === '1';
if (enabled && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

describe.skipIf(!enabled)('alert persistence and health with PostgreSQL', () => {
  const client = postgres(process.env.DATABASE_URL ?? 'postgresql://unused', {
    max: 1,
    prepare: false,
  });
  const db = drizzle(client);
  const now = new Date('2026-09-30T21:00:00.000Z'); // October 1 in Jerusalem
  const readHealth = (at = now) => loadAdmissionAlertHealth((query) => db.execute(query), at);

  beforeAll(async () => {
    // Session-local copies preserve real column types, defaults and uniqueness without touching live rows.
    for (const name of [
      'admission_alert_subscriptions',
      'admission_alert_transition_work',
      'admission_alert_outbox',
      'admission_alert_webhook_events',
    ]) {
      await client.unsafe(`create temporary table ${name} (like public.${name} including all)`);
    }
  });
  afterAll(async () => {
    await client.end();
  });

  it('reports empty queues without personal data', async () => {
    expect(await readHealth()).toEqual({
      currentCycle: '2027',
      subscriptions: {},
      transitions: {},
      deliveries: {},
      stuckTransitions: 0,
      stuckDeliveries: 0,
      staleCycleSubscriptions: 0,
      expiredWebhookEvents: 0,
      overdueSubscriptions: 0,
      invalidCycles: 0,
      retentionStatus: 'within_policy',
    });
  });

  it('counts stale cycles, failed and stuck claims, and retention at the exact boundary', async () => {
    await client`insert into admission_alert_subscriptions
      (user_id,institution_id,program_id,cycle,profile_version_id,profile_hash,baseline_rule_version,baseline_verdict)
      values (gen_random_uuid(),'tau','tau_cs','2025',gen_random_uuid(),'private-hash','v1','{}'),
             (gen_random_uuid(),'bgu','bgu_cs','2026',gen_random_uuid(),'private-hash','v1','{}')`;
    await client`insert into admission_alert_transition_work (transition_id,status,claimed_at)
      values (gen_random_uuid(),'processing','2026-09-30T20:45:00Z'), (gen_random_uuid(),'failed',null)`;
    await client`insert into admission_alert_outbox (subscription_id,transition_id,idempotency_key,status,last_attempt_at)
      values (gen_random_uuid(),gen_random_uuid(),'health-test-stuck','processing',null),
             (gen_random_uuid(),gen_random_uuid(),'health-test-unknown','acceptance_unknown',null)`;
    await client`insert into admission_alert_webhook_events (id,provider_event_type,received_at)
      values ('health-test-event','email.delivered','2026-08-31T21:00:00Z')`;
    expect(await readHealth(new Date(now.getTime() - 1))).toMatchObject({
      currentCycle: '2026',
      staleCycleSubscriptions: 1,
      overdueSubscriptions: 0,
      expiredWebhookEvents: 0,
      stuckTransitions: 0,
      stuckDeliveries: 1,
    });
    const report = await readHealth();
    expect(report).toMatchObject({
      currentCycle: '2027',
      staleCycleSubscriptions: 2,
      overdueSubscriptions: 1,
      expiredWebhookEvents: 1,
      stuckTransitions: 1,
      stuckDeliveries: 1,
      transitions: { processing: 1, failed: 1 },
      deliveries: { processing: 1, acceptance_unknown: 1 },
      retentionStatus: 'cleanup_required',
    });
    expect(JSON.stringify(report)).not.toMatch(/private-hash|health-test|user_id|profile|verdict/);
  });

  it('enforces logical delivery and per-subscription uniqueness', async () => {
    await expect(client`insert into admission_alert_outbox (subscription_id,transition_id,idempotency_key)
      select subscription_id,transition_id,'duplicate-logical' from admission_alert_outbox limit 1`).rejects.toMatchObject(
      { code: '23505' },
    );
    await expect(client`insert into admission_alert_outbox (subscription_id,transition_id,idempotency_key)
      select subscription_id,gen_random_uuid(),'duplicate-subscription' from admission_alert_outbox limit 1`).rejects.toMatchObject(
      { code: '23505' },
    );
  });

  it.each(['anon', 'authenticated'])(
    'denies direct alert reads for browser role %s',
    async (role) => {
      await expect(
        client.begin(async (tx) => {
          await tx.unsafe(`set local role ${role}`);
          await tx`select * from public.admission_alert_subscriptions`;
        }),
      ).rejects.toMatchObject({ code: '42501' });
    },
  );

  it('allows the operations role to read deployed alert state', async () => {
    await client.begin(async (tx) => {
      await tx`set local role ops_readonly`;
      await expect(tx`select count(*) from public.admission_alert_outbox`).resolves.toHaveLength(1);
    });
  });
});
