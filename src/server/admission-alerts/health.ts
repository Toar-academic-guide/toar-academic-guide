import { sql, type SQL } from 'drizzle-orm';

import { admissionCycleFor } from './cycle';

export const ALERT_STUCK_AFTER_MINUTES = 15;
export const ALERT_WEBHOOK_RETENTION_DAYS = 30;

export interface AdmissionAlertHealth {
  currentCycle: string;
  subscriptions: Record<string, number>;
  transitions: Record<string, number>;
  deliveries: Record<string, number>;
  stuckTransitions: number;
  stuckDeliveries: number;
  staleCycleSubscriptions: number;
  expiredWebhookEvents: number;
  overdueSubscriptions: number;
  invalidCycles: number;
  retentionStatus: 'within_policy' | 'cleanup_required';
}

interface HealthRow extends Record<string, unknown> {
  kind: string;
  state: string;
  count: number;
}

// Only aggregate state leaves the database: no recipient, profile, verdict or row IDs.
export async function loadAdmissionAlertHealth(
  execute: (query: SQL) => PromiseLike<Record<string, unknown>[]>,
  now = new Date(),
): Promise<AdmissionAlertHealth> {
  const currentCycle = admissionCycleFor(now);
  const timestamp = now.toISOString();
  const stuckBefore = new Date(now.getTime() - ALERT_STUCK_AFTER_MINUTES * 60_000).toISOString();
  const webhookBefore = new Date(
    now.getTime() - ALERT_WEBHOOK_RETENTION_DAYS * 86_400_000,
  ).toISOString();
  const rows = (await execute(sql`
    select 'subscriptions' as kind, status::text as state, count(*)::int as count
    from admission_alert_subscriptions group by status
    union all
    select 'transitions', status::text, count(*)::int
    from admission_alert_transition_work group by status
    union all
    select 'deliveries', status::text, count(*)::int
    from admission_alert_outbox group by status
    union all
    select 'risk', 'stuckTransitions', count(*)::int
    from admission_alert_transition_work
    where status = 'processing' and (claimed_at is null or claimed_at <= ${stuckBefore}::timestamptz)
    union all
    select 'risk', 'stuckDeliveries', count(*)::int
    from admission_alert_outbox
    where status = 'processing' and (last_attempt_at is null or last_attempt_at <= ${stuckBefore}::timestamptz)
    union all
    select 'risk', 'staleCycleSubscriptions', count(*)::int
    from admission_alert_subscriptions
    where cycle < ${currentCycle} and status in ('active', 'needs_profile_refresh', 'pending_delivery')
    union all
    select 'risk', 'expiredWebhookEvents', count(*)::int
    from admission_alert_webhook_events where received_at <= ${webhookBefore}::timestamptz
    union all
    select 'risk', 'overdueSubscriptions', count(*)::int
    from admission_alert_subscriptions
    where case when cycle ~ '^[0-9]{4}$' then
      make_timestamptz(cycle::int + 1, 10, 1, 0, 0, 0, 'Asia/Jerusalem') <= ${timestamp}::timestamptz
      else false end
    union all
    select 'risk', 'invalidCycles', count(*)::int
    from admission_alert_subscriptions where cycle !~ '^[0-9]{4}$'
  `)) as HealthRow[];
  const counts = (kind: string) =>
    Object.fromEntries(
      rows.filter((row) => row.kind === kind).map((row) => [row.state, Number(row.count)]),
    );
  const risks = counts('risk');
  return {
    currentCycle,
    subscriptions: counts('subscriptions'),
    transitions: counts('transitions'),
    deliveries: counts('deliveries'),
    stuckTransitions: risks.stuckTransitions ?? 0,
    stuckDeliveries: risks.stuckDeliveries ?? 0,
    staleCycleSubscriptions: risks.staleCycleSubscriptions ?? 0,
    expiredWebhookEvents: risks.expiredWebhookEvents ?? 0,
    overdueSubscriptions: risks.overdueSubscriptions ?? 0,
    invalidCycles: risks.invalidCycles ?? 0,
    retentionStatus:
      risks.expiredWebhookEvents || risks.overdueSubscriptions || risks.invalidCycles
        ? 'cleanup_required'
        : 'within_policy',
  };
}
