# Retire the simulation-only admission release

The packet removes one account simulation from the published-release gate without changing admission thresholds, release identity, or callback records. **GUARDED SQL: Jorje applies.** No production writes or workflow dispatches were performed. Production dependency counts are **unverified**: the Supabase connector returned `UNAUTHORIZED` (reauthentication required), and this checkout has no database credentials. Complete the SELECT checks below before applying.

## Cause and provenance

- [PR #209](https://github.com/Toar-academic-guide/toar-academic-guide/pull/209), merged as `5cfa1a6252b9abb58496e7fc7a3a41f775e29947` on September 30, introduced the account simulation. [Run 36693998581](https://github.com/Toar-academic-guide/toar-academic-guide/actions/runs/36693998581) executed the runner at 09:07:20 UTC and reported both simulated messages accepted at 09:07:30 UTC. The reported release timestamp, 09:07:22.109 UTC, falls inside that execution. The subsequent repeat dispatch, [36694162722](https://github.com/Toar-academic-guide/toar-academic-guide/actions/runs/36694162722), reused the scenario.
- `scripts/admission-alert-account-simulation-runtime.ts:101` inserts `repositoryCommit: 'simulation-only'`, `status: 'published'`, `releaseKind: 'operational_proof'`, and `proofScenario: 'plan004-account-simulation-v1'`. Its stable manifest prevents duplicate fixture creation for the same account. It inserts two transitions (`tau/tau_cs`, `bgu/bgu_cs`), subscriptions, completed work, and outbox records, without calling the canonical cutoff publisher.
- `git log --all -S 'simulation-only'` points to `7e8deab` (#227), whose imported history includes the script. GitHub PR/run evidence identifies the original September 30 deployment; the October history entry is not the creation timestamp. The script blob at the original merge is `6d01bdb110ea5eecd1e1f8170ff89d38cd7ae390`.
- [Failed run 40152194843](https://github.com/Toar-academic-guide/toar-academic-guide/actions/runs/40152194843) stopped at `db:operational:publication`, before publisher identity verification, publication, or alert processing. The schema report was current through 0036; publication reported one malformed published release. Local evidence: `/workspace/seo/technion_winter_2026-10-25/live/post-283/workflow_run_40152194843_failed.log` and `/workspace/pm-research/db_changes.md`.
- `scripts/verify-operational-db.mjs`, `loadPublicationDatabaseState`, checks **all** published releases, including proofs. The sentinel fails `^[0-9a-f]{7,64}$`. Dry-run seed/review paths do not explain this insert: this manual simulation writes persistent fixtures by design.

## Schema and dependencies

Migration 0012 defines `admission_release_status` as `pending | published | failed`. There is no `retired`/`simulation` status. Migration 0021 adds `release_kind=operational_proof` and the required scenario marker. `docs/admission-alert-operations.md`, “Approved account-only change simulation,” documents retaining these records for callbacks and audit; it does not define a retirement operation. The packet uses the publisher's existing failure representation (`status='failed', published_at=NULL`; `admissionsReleasePublisher.ts:439`). The original timestamp remains in the backup.

| Relationship | Expected from the simulation code; must confirm in production |
| --- | --- |
| `admission_publication_attempts.release_id → admission_releases.id` | 0; packet refuses any attempt |
| `admission_target_transitions.release_id → admission_releases.id` | Exactly 2, TAU/BGU simulation versions |
| `admission_release_items.transition_id → transitions.id` | 0; packet refuses any rule item |
| `admission_operational_proof_values.release_id → admission_releases.id` | 0; this is the only schema-defined current-value release pointer; packet refuses any |
| `admission_alert_transition_work.transition_id → transitions.id` | Two created; backed up, preserved |
| `admission_alert_outbox.transition_id → transitions.id` | Two created; backed up, preserved |
| `admission_alert_webhook_events.outbox_id → outbox.id` | Callback-dependent count; backed up, preserved |

`admission_thresholds` and `admission_requirements` have no `release_id` in the repository schema. Public catalogue queries read thresholds directly (`src/server/catalogue/queries.ts:264`). Reviewed-rule selection joins release items and includes only published **canonical** kinds (`weeklyReviewPreparation.ts:125`); simulation transitions have no items. Normal alert selection also excludes operational proofs. No release/transition is deleted, so foreign keys, existing signed callbacks, unsubscribe references, subscriptions, and profile records remain intact. The packet rejects unexpected release FKs, public release-ID columns, or release triggers instead of assuming the deployed schema matches.

## Required production SELECT checks

Use project `kfxcdbjeidczltkrjazk` (`toar-academic-guide`). Inspect results; do not run the packet if they contradict the expectations above. No account IDs, recipient addresses, payloads, or tokens are needed.

```sql
SELECT id, repository_commit, status, published_at, release_kind, proof_scenario
FROM public.admission_releases WHERE id='6b88405e-a824-41f0-9293-85b9bc724b60';
SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
WHERE t.typname IN ('admission_release_status','admission_release_kind')
ORDER BY t.typname,e.enumsortorder;
SELECT conrelid::regclass AS dependent_table, pg_get_constraintdef(oid)
FROM pg_constraint WHERE confrelid='public.admission_releases'::regclass
   OR conrelid='public.admission_releases'::regclass;
SELECT table_schema,table_name,column_name FROM information_schema.columns
WHERE table_schema='public' AND column_name ILIKE '%release%';
SELECT tgname,pg_get_triggerdef(oid) FROM pg_trigger
WHERE tgrelid='public.admission_releases'::regclass AND NOT tgisinternal;
WITH t AS (SELECT id FROM public.admission_target_transitions
  WHERE release_id='6b88405e-a824-41f0-9293-85b9bc724b60'),
o AS (SELECT id FROM public.admission_alert_outbox WHERE transition_id IN (SELECT id FROM t))
SELECT 'attempts' AS dependency,count(*) FROM public.admission_publication_attempts
  WHERE release_id='6b88405e-a824-41f0-9293-85b9bc724b60'
UNION ALL SELECT 'transitions',count(*) FROM t
UNION ALL SELECT 'items',count(*) FROM public.admission_release_items WHERE transition_id IN (SELECT id FROM t)
UNION ALL SELECT 'current_proof_values',count(*) FROM public.admission_operational_proof_values
  WHERE release_id='6b88405e-a824-41f0-9293-85b9bc724b60'
UNION ALL SELECT 'work',count(*) FROM public.admission_alert_transition_work WHERE transition_id IN (SELECT id FROM t)
UNION ALL SELECT 'outbox',count(*) FROM o
UNION ALL SELECT 'webhooks',count(*) FROM public.admission_alert_webhook_events WHERE outbox_id IN (SELECT id FROM o);
SELECT institution_id,program_id,cycle,before_version,after_version
FROM public.admission_target_transitions
WHERE release_id='6b88405e-a824-41f0-9293-85b9bc724b60';
```

Run the packet's standalone `WITH gate AS (...)` verification SELECT before and after, and the full `npm run db:operational:publication` with the existing ops connection afterward. The packet backs up the release and all seven dependent tables into private, RLS-enabled `retire_simulation_20261025` tables, then updates exactly one guarded row in a serializable transaction. It aborts if any publication blocker remains. Its commented rollback restores only the original status/timestamp, rejects intervening release changes, and deliberately restores the original blocker. Keep the backup and log Jorje's application/live verification in `/workspace/pm-research/db_changes.md`.

## Disposable PostgreSQL verification

PostgreSQL 17.11 on `127.0.0.1:55483/pubgate`; no production connection. The fixture uses the actual 0012/0013 ledger and alert DDL plus 0021 proof DDL, stub parent tables, one valid canonical release, the reported simulation identity, two transitions/work/outbox/callback rows, and representative thresholds. Historical repair migrations 0037–0039 were not run.

The harness `/tmp/pubgate-local-verify.mjs` loads the **exact** `loadPublicationDatabaseState` function from the unchanged verifier source and the real `assessPublicationDatabaseState` against PostgreSQL (no query/assessor mocks). `/tmp/pubgate-local-verify.log` records:

```text
before: {"ready":false,"issues":["1 published admission release has incomplete identity evidence."]}
after: {"ready":true,"issues":[]}
thresholds and every dependent row unchanged: PASS
private backup access: PASS
repeat application: PASS (rejected)
rollback restores release exactly; all other rows unchanged: PASS
after rollback: {"ready":false,"issues":["1 published admission release has incomplete identity evidence."]}
```

Eight refusal cases also passed with unchanged transactions: wrong commit, canonical kind, rule item, current-proof pointer, unrelated pending release, unrelated started attempt, new FK, and new non-FK release pointer. Backup counts were release 1, attempts 0, transitions 2, items 0, proof values 0, work 2, outbox 2, callbacks 2. These are **fixture counts**, not production findings. The full CLI was attempted separately; this focused fixture lacks the Supabase migration journal/full operational schema, so it cannot establish full-schema readiness. No deployed browser/UI claim is made: this PR changes neither application code nor UI and production application is reserved for Jorje.

No application code change is needed to clear this incident: the gate correctly rejects fabricated commit identities, and the allowed terminal status removes this fixture from its published set. For future simulations, the runner's hard-coded sentinel remains a recurrence risk if another account creates a new release; a separate authorized code change should record the real executing commit. This packet does not change the runner or weaken the gate.

## Publication workflow inputs

For `.github/workflows/admissions-publication.yml`, dispatch from `main` with `repository_commit=818cd9c9e9c46ac58ced35676a570ba4856f56da`. The other two inputs, `proof_failure_stage` and `proof_confirmation_id`, are optional fault-injection controls and must both be **omitted** for this canonical Technion release. No other dispatch input is needed. Do not redispatch the simulation.

The existing `admissions-publication` environment supplies `OPS_DATABASE_URL` (read gate) and `DATABASE_URL` (publisher), subject to its configured protection rules. The commit must remain an ancestor of `origin/main`; the runner loads its manifest from that commit while running current `main` code. The four manifest rows must still match before values: `technion_ee`/`ee` = 94 and `technion_me`/`me` = 92. On success the returned release ID automatically feeds `admission-alert-processing.yml`; no manual `release_id` input is required here. Existing worker flags/secrets govern downstream processing. No environment changes are proposed.
