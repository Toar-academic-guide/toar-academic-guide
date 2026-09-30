import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import postgres, { type TransactionSql } from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/db/schema';
vi.mock('server-only', () => ({}));
import { runAccountAlertSimulation } from './admission-alert-account-simulation-runtime';
import { recordAdmissionAlertWebhook } from '@/server/admission-alerts/webhookService';
import {
  unsubscribeAdmissionAlerts,
  deriveAdmissionAlertUnsubscribeToken,
} from '@/server/admission-alerts/unsubscribeService';

const enabled = process.env.ALERT_DB_INTEGRATION === '1';
const url = process.env.DATABASE_URL ?? 'postgresql://unused';
if (enabled && !['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Use disposable localhost PostgreSQL only.');

describe.skipIf(!enabled)('account simulation with real persistence', () => {
  const client = postgres(url, { max: 1, prepare: false });
  const secret = 's'.repeat(43);
  const rollback = new Error('fixture rollback');
  afterAll(async () => client.end());
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
  const database = (tx: TransactionSql) =>
    drizzle(
      Object.assign(tx, {
        options: client.options,
        begin: tx.savepoint,
      }) as unknown as typeof client,
      { schema },
    );

  it('sends only two labelled messages, persists telemetry, unsubscribes, and never resends', async () =>
    isolated(async (tx) => {
      const userId = randomUUID();
      await tx`insert into auth.users(id,email,email_confirmed_at) values(${userId},'amitm1630@gmail.com',now())`;
      await tx`insert into user_profiles(user_id,psychometric_overall) values(${userId},623)`;
      const before = (
        await tx`select to_jsonb(p) as profile from user_profiles p where user_id=${userId}`
      )[0].profile;
      const db = database(tx);
      const send = vi.fn(async (request) => {
        expect(request.payload.to).toBe('amitm1630@gmail.com');
        expect(request.payload.subject).toContain('[SIMULATION');
        expect(request.payload.text).toContain('אין שינוי אמיתי');
        return { status: 'accepted' as const, providerMessageId: randomUUID() };
      });
      const options = { db, userId, secret, provider: { send } };
      expect((await runAccountAlertSimulation(options)).map((r) => r.status)).toEqual([
        'accepted',
        'accepted',
      ]);
      await runAccountAlertSimulation(options);
      expect(send).toHaveBeenCalledTimes(2);
      expect(
        (await tx`select to_jsonb(p) as profile from user_profiles p where user_id=${userId}`)[0]
          .profile,
      ).toEqual(before);
      const rows =
        await tx`select o.id,o.provider_message_id,r.release_kind from admission_alert_outbox o join admission_alert_subscriptions s on s.id=o.subscription_id join admission_target_transitions t on t.id=o.transition_id join admission_releases r on r.id=t.release_id where s.user_id=${userId}`;
      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.release_kind === 'operational_proof')).toBe(true);
      for (const row of rows) {
        const recorded = await recordAdmissionAlertWebhook(
          {
            id: randomUUID(),
            type: 'email.delivered',
            occurredAt: new Date().toISOString(),
            providerMessageId: row.provider_message_id,
          },
          db,
        );
        expect(recorded.status).toBe('recorded');
      }
      expect(
        (
          await tx`select o.delivery_events from admission_alert_outbox o join admission_alert_subscriptions s on s.id=o.subscription_id where s.user_id=${userId}`
        ).every((row) => Boolean(row.delivery_events['email.delivered'])),
      ).toBe(true);
      expect(
        (
          await unsubscribeAdmissionAlerts(
            deriveAdmissionAlertUnsubscribeToken(rows[0].id, secret),
            db,
          )
        ).status,
      ).toBe('unsubscribed');
      expect(
        (
          await unsubscribeAdmissionAlerts(
            deriveAdmissionAlertUnsubscribeToken(rows[0].id, secret),
            db,
          )
        ).status,
      ).toBe('unsubscribed');
      expect(
        (
          await tx`select opted_in from admission_alert_email_preferences where user_id=${userId}`
        )[0].opted_in,
      ).toBe(false);
      await runAccountAlertSimulation(options);
      expect(send).toHaveBeenCalledTimes(2);
    }));

  it('rolls back all fixture creation for any other recipient', async () =>
    isolated(async (tx) => {
      const userId = randomUUID();
      await tx`insert into auth.users(id,email,email_confirmed_at) values(${userId},'other@example.org',now())`;
      await tx`insert into user_profiles(user_id) values(${userId})`;
      const send = vi.fn();
      await expect(
        runAccountAlertSimulation({ db: database(tx), userId, secret, provider: { send } }),
      ).rejects.toThrow('approved recipient');
      expect(send).not.toHaveBeenCalled();
      expect(
        await tx`select id from admission_alert_subscriptions where user_id=${userId}`,
      ).toHaveLength(0);
    }));

  it('stops after uncertainty and never resumes sending on a new dispatch', async () =>
    isolated(async (tx) => {
      const userId = randomUUID();
      await tx`insert into auth.users(id,email,email_confirmed_at) values(${userId},'amitm1630@gmail.com',now())`;
      await tx`insert into user_profiles(user_id) values(${userId})`;
      const send = vi.fn(async () => ({ status: 'acceptance_unknown' as const }));
      const options = { db: database(tx), userId, secret, provider: { send } };
      await expect(runAccountAlertSimulation(options)).rejects.toThrow('Simulation stopped');
      await expect(runAccountAlertSimulation(options)).rejects.toThrow(
        'Inspect existing simulation',
      );
      expect(send).toHaveBeenCalledTimes(1);
    }));
});
