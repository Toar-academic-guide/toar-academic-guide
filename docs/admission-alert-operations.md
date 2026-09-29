# Admission alert operations

## Persistence and health

`npm run db:operational:verify` verifies the deployed alert tables, role grants,
RLS policies, uniqueness and queue indexes as part of the production schema
contract. Its `alerts` section and the allowlisted `/internal/data-health` page
use the same aggregate query. Missing tables or denied reads fail reporting;
they are never treated as empty queues.

Sign in with an allowlisted operations account, open `/internal/data-health`,
and find **Admission alert operations**. Check the current cycle, subscription,
transition and delivery counts, stuck claims, and retention status. Browser roles
must remain unable to read alert tables directly. The dashboard uses `ops_readonly`.

- A processing claim with no timestamp or at least 15 minutes of age needs
  investigation. A count is not proof that recovery ran or that an email was sent.
- Failed and acceptance-unknown deliveries need investigation; do not manually
  requeue an uncertain provider submission.
- October 1 at midnight in `Asia/Jerusalem` advances the cycle. Prior-cycle active,
  refresh-needed and pending-delivery subscriptions are reported for expiration.
- Webhook deduplication events reach their retention limit after 30 days.
- Subscription metadata reaches its retention limit at October 1, 12 months
  after its cycle ends. Associated delivery and baseline rows cascade on deletion.
  Invalid cycle identifiers are reported for investigation.
- **Within policy** describes the stored rows at query time. It does not assert
  that automated retention cleanup or delivery activation is configured.

Only counts and lifecycle states leave the alert query. Recipients, user IDs,
academic inputs, hashes, baseline verdicts and webhook bodies are not reported.

## Verification

The existing disposable PostgreSQL CI job applies the migrations and runs
`ALERT_DB_INTEGRATION=1 npx vitest run src/server/admission-alerts/health.integration.test.ts`.
It checks actual uniqueness, browser-role denial, operations reads, stuck queues,
and the Jerusalem cycle and retention boundaries. Fixture rows use session-local
temporary copies; they do not populate production alert tables.

On 2026-09-29, production project `kfxcdbjeidczltkrjazk` was healthy: all six alert
tables had RLS, explicit private deny policies, application SELECT/INSERT/UPDATE
and operations SELECT grants, and the expected unique/queue indexes. Subscription,
transition, outbox and webhook tables were empty. Subsequent units must rerun the
checks after changing persistence or worker behavior.
