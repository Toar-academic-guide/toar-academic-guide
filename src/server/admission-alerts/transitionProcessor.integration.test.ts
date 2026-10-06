import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

vi.mock('server-only', () => ({}));
import {
  ALERT_TRANSITION_LEASE_MS,
  createDrizzleAdmissionAlertTransitionProcessorRepository,
  processAdmissionAlertTransitionWork,
} from './transitionProcessor';
import { createDrizzleAdmissionAlertSubscriptionRepository } from './subscriptionService';
import { alertCutoffRuleVersion } from './baselineEvaluator';
import { createAdmissionAlertTransitionEvaluator } from './transitionEvaluator';

const enabled = process.env.ALERT_DB_INTEGRATION === '1';
if (enabled && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

describe.skipIf(!enabled)('transition recovery with PostgreSQL', () => {
  const namespace = `alert_test_${randomUUID().replaceAll('-', '')}`;
  const client = postgres(process.env.DATABASE_URL ?? 'postgresql://unused', {
    max: 2,
    prepare: false,
    connection: { search_path: `${namespace},public` },
  });
  const db = drizzle(client, { schema });
  const repository = createDrizzleAdmissionAlertTransitionProcessorRepository(db);
  const tables = [
    'admission_releases',
    'admission_target_transitions',
    'admission_alert_subscriptions',
    'admission_alert_transition_work',
    'admission_alert_outbox',
    'admission_alert_baseline_history',
    'user_profiles',
    'bagrut_profile_versions',
    'admission_release_items',
  ];
  const now = new Date('2026-09-29T10:00:00Z');
  const below = async ({ ruleVersion }: { ruleVersion: string }) => ({
    decision: 'below' as const,
    isMathematicallyVerified: true,
    ruleVersion,
  });
  const claim = (at = now) => repository.claimNextWork({ currentCycle: '2026', now: at });
  async function seed(count = 1, version = 'v2', createdAt = now) {
    const [release] =
      await client`insert into admission_releases (manifest_digest,repository_commit,status) values (${randomUUID()},'test','published') returning id`;
    const [transition] =
      await client`insert into admission_target_transitions (release_id,institution_id,program_id,cycle,before_version,after_version,created_at)
      values (${release.id},'tau','tau_cs','2026','v1',${version},${createdAt.toISOString()}::timestamptz) returning id`;
    await client`insert into admission_alert_transition_work (transition_id) values (${transition.id})`;
    for (let i = 0; i < count; i++) {
      await client`insert into admission_alert_subscriptions (user_id,institution_id,program_id,cycle,profile_version_id,profile_hash,baseline_rule_version,baseline_verdict,activated_at)
        values (gen_random_uuid(),'tau','tau_cs','2026',gen_random_uuid(),'private-hash','v1','{"decision":"below"}',${new Date(createdAt.getTime() - 1000).toISOString()}::timestamptz)`;
    }
    return transition.id as string;
  }
  beforeAll(async () => {
    await client.unsafe(`create schema ${namespace}`);
    // Isolated schema copies retain actual types and uniqueness; both workers share it.
    for (const table of tables)
      await client.unsafe(
        `create table ${namespace}.${table} (like public.${table} including all)`,
      );
  });
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    await client.unsafe(`truncate ${tables.map((table) => `${namespace}.${table}`).join(',')}`);
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  afterAll(async () => {
    await client.unsafe(`drop schema ${namespace} cascade`);
    await client.end();
  });

  it('checkpoints 250 subscriptions in bounded batches while isolating one unavailable profile', async () => {
    await seed(250);
    const [bad] = await client`select id from admission_alert_subscriptions order by id limit 1`;
    const evaluate = async (input: { subscriptionId: string; ruleVersion: string }) =>
      input.subscriptionId === bad.id
        ? {
            decision: 'unavailable' as const,
            isMathematicallyVerified: false,
            ruleVersion: input.ruleVersion,
          }
        : below(input);
    for (const size of [100, 100, 50])
      expect(
        await processAdmissionAlertTransitionWork({ repository, evaluate, now }),
      ).toMatchObject({ status: 'pending', processedSubscriptionCount: size });
    const [counts] =
      await client`select count(*)::int as count from admission_alert_baseline_history`;
    expect(counts.count).toBe(249);
    expect(await claim()).toBeNull();
    for (const minutes of [5, 10])
      await processAdmissionAlertTransitionWork({
        repository,
        evaluate,
        now: new Date(now.getTime() + minutes * 60_000),
      });
    const [work] = await client`select status,retry_state from admission_alert_transition_work`;
    expect(work.status).toBe('completed');
    expect(work.retry_state[bad.id]).toMatchObject({ attempts: 3, quarantined: true });
    await seed(0, 'v3', new Date(now.getTime() + 20 * 60_000));
    for (let i = 0; i < 3; i++)
      await processAdmissionAlertTransitionWork({
        repository,
        evaluate: below,
        now: new Date(now.getTime() + 20 * 60_000),
      });
    const [recovered] =
      await client`select baseline_rule_version from admission_alert_subscriptions where id=${bad.id}`;
    expect(recovered.baseline_rule_version).toBe('v3');
  }, 20_000);

  it('allows one concurrent owner and rejects stale writes after an expired lease', async () => {
    await seed();
    const attempts = await Promise.all([claim(), claim()]);
    expect(attempts.filter(Boolean)).toHaveLength(1);
    const first = attempts.find(Boolean)!;
    const later = new Date(now.getTime() + ALERT_TRANSITION_LEASE_MS);
    const recovered = (await claim(later))!;
    expect(recovered.claimToken).not.toBe(first.claimToken);
    expect(
      await repository.recordDecision({
        work: first,
        subscription: first.subscriptions[0],
        decision: { action: 'queue_delivery', ruleVersion: 'v2' },
        now: later,
      }),
    ).toBe(false);
    expect(
      await repository.recordDecision({
        work: recovered,
        subscription: recovered.subscriptions[0],
        decision: { action: 'queue_delivery', ruleVersion: 'v2' },
        now: later,
      }),
    ).toBe(true);
    await repository.finishBatch(recovered, later);
    expect(await client`select * from admission_alert_outbox`).toHaveLength(1);
  });

  it('resumes from the committed cursor after a worker disappears', async () => {
    await seed(2);
    const first = (await claim())!;
    await repository.recordDecision({
      work: first,
      subscription: first.subscriptions[0],
      decision: { action: 'advance_baseline', ruleVersion: 'v2' },
      now,
    });
    const recovered = (await claim(new Date(now.getTime() + ALERT_TRANSITION_LEASE_MS)))!;
    expect(recovered.subscriptions.map((row) => row.id)).toEqual([first.subscriptions[1].id]);
    expect(await client`select * from admission_alert_baseline_history`).toHaveLength(1);
  });

  it('waits for an earlier release even if its work is enqueued later and ignores duplicate enqueue', async () => {
    const earlier = await seed(1);
    await client`delete from admission_alert_transition_work where transition_id=${earlier}`;
    await seed(0, 'v3', new Date(now.getTime() + 1000));
    expect(await claim()).toBeNull();
    for (let i = 0; i < 2; i++)
      await client`insert into admission_alert_transition_work (transition_id) values (${earlier}) on conflict do nothing`;
    await processAdmissionAlertTransitionWork({ repository, evaluate: below, now });
    expect((await claim())?.afterVersion).toBe('v3');
    expect(await client`select * from admission_alert_transition_work`).toHaveLength(2);
  });

  it('drops retries for cancelled subscriptions instead of stranding the target', async () => {
    await seed();
    await processAdmissionAlertTransitionWork({
      repository,
      now,
      evaluate: async () => {
        throw new Error('sensitive input');
      },
    });
    await client`update admission_alert_subscriptions set status='cancelled'`;
    expect(
      await processAdmissionAlertTransitionWork({
        repository,
        evaluate: below,
        now: new Date(now.getTime() + 5 * 60_000),
      }),
    ).toMatchObject({ status: 'completed', processedSubscriptionCount: 0 });
    const [work] =
      await client`select retry_state,failure_reason from admission_alert_transition_work`;
    expect(work).toEqual({ retry_state: {}, failure_reason: null });
  });

  it('does not replay a release against subscriptions activated after that change', async () => {
    await seed();
    await client`update admission_alert_subscriptions set activated_at=${new Date(now.getTime() + 1).toISOString()}::timestamptz`;
    expect((await claim())?.subscriptions).toHaveLength(0);
  });

  it('binds TAU and BGU work to saved inputs and the exact reviewed cutoff', async () => {
    const ruleVersion = alertCutoffRuleVersion(700);
    const tauTransition = await seed(0, ruleVersion);
    const [release] =
      await client`select release_id from admission_target_transitions where id=${tauTransition}`;
    const [bguTransition] =
      await client`insert into admission_target_transitions (release_id,institution_id,program_id,cycle,before_version,after_version,created_at)
      values (${release.release_id},'bgu','bgu_cs','2026','v1',${ruleVersion},${now.toISOString()}::timestamptz) returning id`;
    const profiles = createDrizzleAdmissionAlertSubscriptionRepository(db);
    const canonical = vi.fn(async () => ({ decision: 'eligible' as const, ruleVersion }));
    const evaluate = createAdmissionAlertTransitionEvaluator({ db, evaluate: canonical });
    for (const [institutionId, transitionId] of [
      ['tau', tauTransition],
      ['bgu', bguTransition.id],
    ]) {
      const userId = randomUUID();
      const [version] =
        await client`insert into bagrut_profile_versions (user_id,schema_version,content_hash,sector,subjects)
        values (${userId},1,'subjects','jewish','[{"subjectId":"mathematics","units":5,"grade":90}]') returning id`;
      await client`insert into user_profiles (user_id,psychometric_overall,psychometric_quantitative,bagrut_weighted_average,bagrut_profile_version_id,admissions_inputs)
        values (${userId},680,135,108,${version.id},'{"tauApplicationRequirementsConfirmed":true,"bguLanguageRequirementsConfirmed":true,"bguBagrutAverage":112}')`;
      const profile = (await profiles.getProfile(userId))!;
      const subscription = await profiles.createSubscription({
        userId,
        institutionId,
        programId: `${institutionId}_cs`,
        cycle: '2026',
        profileVersionId: profile.profileVersionId,
        profileHash: profile.profileHash,
        baselineRuleVersion: 'v1',
        baselineVerdict: { decision: 'below' },
      });
      await client`insert into admission_release_items (transition_id,rule_kind,before_value,after_value,effective_from,source_proofs)
        values (${transitionId},'admission_cutoff','{"value":710}','{"value":700}','2026-09-29','[]')`;
      const input = {
        subscriptionId: subscription.id,
        transitionId,
        institutionId,
        programId: `${institutionId}_cs`,
        ruleVersion,
        profileHash: profile.profileHash,
        profileVersionId: profile.profileVersionId,
      };
      expect(await evaluate(input)).toEqual({
        decision: 'eligible',
        isMathematicallyVerified: true,
        ruleVersion,
      });
      expect(canonical).toHaveBeenLastCalledWith(
        expect.objectContaining({
          profile: expect.objectContaining({
            extraInputs: expect.objectContaining({ psychometricMath: 135, bguBagrutAverage: 112 }),
          }),
        }),
        expect.anything(),
      );
      await client`update user_profiles set psychometric_overall=681 where user_id=${userId}`;
      expect((await evaluate(input)).decision).toBe('unavailable');
      await expect(
        profiles.createSubscription({
          userId,
          institutionId,
          programId: `${institutionId}_cs`,
          cycle: '2026',
          profileVersionId: profile.profileVersionId,
          profileHash: profile.profileHash,
          baselineRuleVersion: 'v1',
          baselineVerdict: { decision: 'below' },
        }),
      ).rejects.toThrow('profile changed');
    }
    expect(canonical).toHaveBeenCalledTimes(2);
  });
});
