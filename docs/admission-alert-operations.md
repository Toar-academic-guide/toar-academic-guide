# Admission alert operations

## Hebrew email rendering

The server-only React Email renderer produces both RTL HTML and plain text. Its
input is limited to the verified recipient, public institution/program names,
reviewed date, cycle and an opaque unsubscribe token. Never pass a profile or
evaluation result to the renderer. The Resend adapter sends only the six
allowlisted mail fields; provider metadata must not contain academic inputs.

Delivery configuration (not enabled by the template PR):

- `ADMISSION_ALERT_FROM_EMAIL`: mailbox on a domain verified in Resend. A personal
  Gmail address is not a production sender. Resend's test sender is restricted to
  the Resend account's own email address.
- `ADMISSION_ALERT_SUPPORT_EMAIL`: support/reply-to mailbox; Gmail is acceptable.
- `ADMISSION_ALERT_APP_ORIGIN`: canonical HTTPS origin, without a path, query or
  credentials. Links must point to the deployed app, not the workflow runner.

The unsubscribe token is in the link fragment to keep it out of access logs.
The confirmation page and delivery integration are separate U6/U7 work. Do not
enable sending until those controls and the controlled provider proof are ready.

Verify the rendered TAU and BGU messages in Hebrew: the programme and review date
are visible, the call to action opens `/app/calculator`, management points to
`/app/profile#admission-alerts`, removal opens the category-unsubscribe page,
and support opens the configured mailbox. No grades, scores or profile hashes
should appear in HTML, plain text, or the provider request.

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

## Transition recovery

Each claim processes at most 100 subscriptions. Its 15-minute lease has a unique
token: an expired owner cannot commit another decision. Each decision and cursor
advance commit together, so a replacement resumes after the last saved result.
Duplicate release enqueue uses the transition's existing work row.

Unavailable evaluations and evaluator errors retry independently after five
minutes. After three unsuccessful attempts, that subscription is quarantined for
that transition; healthy subscriptions and later releases can continue. The retry
map stores subscription IDs, attempt counts and scheduling state, never grades or
exception text. Cancellation and profile-refresh state remove obsolete retries.
A later reviewed release evaluates the still-active subscription afresh and can
recover it using its last confirmed below baseline. Do not clear a cursor or
replay a historical version manually after a newer release has completed.

Published canonical transitions run oldest first per target/cycle. An earlier
published transition without a work row blocks a newer one until it is enqueued;
the protected runtime must enqueue missed releases before draining the queue.
Bootstrap and operational-proof releases never enter the alert processor.

Run the recovery tests against disposable PostgreSQL:

```sh
ALERT_DB_INTEGRATION=1 npx vitest run src/server/admission-alerts/transitionProcessor.integration.test.ts
```

They cover 250 subscriptions, isolated retry and quarantine, recovery on the next
release, concurrent claims, expired-owner rejection, committed-cursor recovery,
release ordering, duplicate enqueue and cancellation. They create and remove an
isolated test schema; never point this test command at production.

## Protected processing

`.github/workflows/admission-alert-processing.yml` receives a published canonical
release UUID after successful publication. It can also be dispatched manually
without a UUID to enqueue missed current-cycle releases and recover due work.
Maintenance runs every 15 minutes, but only existing published canonical releases
can create work. No public processor endpoint exists and this workflow does not
send email.

Provision `ADMISSION_ALERT_DATABASE_URL` in the existing `admissions-publication`
GitHub environment using the application's `app_runtime` database role. The
publisher's `DATABASE_URL` uses `admissions_automation`, which deliberately cannot
read private profiles or alerts; do not broaden that role. Set the repository
variable `ADMISSION_ALERT_PROCESSING_ENABLED=true` only after a controlled manual
run succeeds. Scheduled and publication-triggered processing remain off otherwise.
Manual dispatch still requires the protected environment's approval.

Each run processes at most ten batches and has a 45-minute workflow timeout.
Release-scoped concurrency prevents duplicate invocations, while a shared job
concurrency group serializes all official-source access. The fetch queue starts
at most one request per two seconds (30/minute), with one concurrent request.
Timeouts leave recoverable leases; due retries continue on a later maintenance
run. Logs contain only counts, status and cleanup phases.

TAU and BGU baselines use the same canonical evaluator as the calculator, including
saved psychometric subscores, the structured certificate, institution averages,
and admissions answers. The profile digest covers those inputs. A concurrent
profile edit cannot establish a stale baseline. Historical releases do not scan
subscriptions activated or refreshed after the change. A live verdict must match
the reviewed cutoff's rule digest; drift or missing inputs cause an isolated retry,
never a substituted estimate. Full academic inputs remain in the existing profile
store, not the alert work or delivery rows.

To verify the protected runtime after merge: open GitHub Actions → **Process
Reviewed Admission Alerts** → **Run workflow**, leave the release UUID blank,
approve the protected environment, and expect an aggregate `idle` or `batch_limit`
result followed by completed database/Vite cleanup. Then sign in to
`/internal/data-health` and check transition counts. This proves worker invocation,
not provider delivery or the final TAU/BGU live proof.

## Outbox delivery recovery (U4)

The **Deliver Admission Alerts** workflow uses the same protected environment and
`ADMISSION_ALERT_DATABASE_URL`. Manual dispatch defaults to **dry run**, which only
reads aggregate queue counts. It neither claims work nor contacts Resend. Verify
the connection after merge by running that workflow with **dry_run** checked and
expecting `status: dry_run` and completed cleanup. No UI changes are part of U4.

Live delivery requires `ADMISSION_ALERT_DELIVERY_ENABLED=true` and the environment
secret `ADMISSION_ALERT_RESEND_API_KEY` (a sending-only Resend key). **Do not enable
it yet:** U5 must prepare the Hebrew message and U6 must implement its unsubscribe
and signed webhook paths before the controlled TAU/BGU proof. U4 only consumes
prepared immutable `mail_payload` snapshots; pending rows without one are not
sendable. Do not manually populate production payloads to bypass those units.

Once activated, the protected schedule drains at most 500 rows per run, with one
second between attempts. It never accepts arbitrary recipients as CLI inputs.
Claims expire after five minutes. Before each provider request, the worker locks
and rechecks subscription state, the current Jerusalem admissions cycle, and
category preference. Cancellation before submission suppresses the row and clears
its prepared payload. Cancellation after the submission boundary reports that an
email may still arrive; it prevents subsequent submissions, not a request already
in flight. Acceptance records the provider ID without changing a cancelled
subscription back to notified.

The request snapshot and database idempotency key are reused exactly on recovery.
An HTTP 429 is retryable; ordinary validation/authentication failures are terminal.
Timeouts, network failures, server errors, and idempotency conflicts are
`acceptance_unknown`. A later rejected reconciliation cannot erase that earlier
uncertainty. The next attempt is at least five minutes later. Unknown/retryable
submissions stop automatically 23 hours after the first submission, leaving a
one-hour margin before [Resend's 24-hour key expiry](https://resend.com/docs/dashboard/emails/idempotency-keys).
Rows then carry `idempotency_window_elapsed` for operator reconciliation. Never
clear their first-submission time, replace their key, or blindly requeue them.
Cancellation/category opt-out/prior-cycle state blocks reconciliation that could
initiate another send. Signed provider telemetry in U6 will resolve confirmed
acceptance without initiating mail.

The prepared payload contains only recipient/sender addresses, support content,
and management links, never academic inputs. It is cleared on acceptance,
definitive failure, or safe suppression. No provider error body or request content
is logged. U6/U7 own token handling and remaining retention/account-deletion cleanup.

Focused disposable database verification (never production):

```sh
ALERT_DB_INTEGRATION=1 npx vitest run src/server/admission-alerts/deliveryWorker.integration.test.ts
```

Tests exercise concurrent claims, expired-owner fencing, cancellation after
claim, category/cycle/profile rechecks, post-submit recovery, idempotent acceptance,
unknown acceptance, retry scheduling, and the idempotency-window boundary. Live
provider acceptance remains unproven until the authorized controlled send after
the template and unsubscribe implementation.
