-- GUARDED SQL: Jorje applies
-- Single-use data packet, NOT a migration. Codex has NOT applied this to production.
-- Use an owner connection with psql -X -v ON_ERROR_STOP=1 -f <this file>.
-- Read the companion investigation first; production SELECT checks require access.
-- Retain the simulation identity and callback history; never forge a Git commit.
-- 'failed' is the existing terminal non-published status, not a new retired enum.

BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- Block writers while checking and backing up the dependency graph. Readers continue.
LOCK TABLE public.admission_releases, public.admission_publication_attempts,
  public.admission_target_transitions, public.admission_release_items,
  public.admission_operational_proof_values, public.admission_alert_transition_work,
  public.admission_alert_outbox, public.admission_alert_webhook_events
  IN SHARE ROW EXCLUSIVE MODE;

DO $guard$
BEGIN
  IF (SELECT count(*) FROM public.admission_releases
      WHERE id = '6b88405e-a824-41f0-9293-85b9bc724b60'
        AND repository_commit = 'simulation-only' AND status = 'published'
        AND release_kind = 'operational_proof'
        AND proof_scenario = 'plan004-account-simulation-v1'
        AND published_at = '2026-09-30 09:07:22.109+00'::timestamptz) <> 1 THEN
    RAISE EXCEPTION 'Simulation identity/state changed; inspect, do not rerun';
  END IF;
  -- Only the two targets created by runAccountAlertSimulation are allowed.
  IF (SELECT count(*) FROM public.admission_target_transitions
      WHERE release_id = '6b88405e-a824-41f0-9293-85b9bc724b60') <> 2
    OR (SELECT count(DISTINCT (institution_id, program_id))
      FROM public.admission_target_transitions
      WHERE release_id = '6b88405e-a824-41f0-9293-85b9bc724b60') <> 2
    OR EXISTS (SELECT 1 FROM public.admission_target_transitions
      WHERE release_id = '6b88405e-a824-41f0-9293-85b9bc724b60'
        AND ((institution_id, program_id) NOT IN (('tau', 'tau_cs'), ('bgu', 'bgu_cs'))
          OR before_version <> 'plan004-account-simulation-v1:below'
          OR after_version <> 'plan004-account-simulation-v1:eligible')) THEN
    RAISE EXCEPTION 'Expected exactly two account-simulation transitions';
  END IF;
  IF EXISTS (SELECT 1 FROM public.admission_release_items i
      JOIN public.admission_target_transitions t ON t.id = i.transition_id
      WHERE t.release_id = '6b88405e-a824-41f0-9293-85b9bc724b60')
    OR EXISTS (SELECT 1 FROM public.admission_operational_proof_values
      WHERE release_id = '6b88405e-a824-41f0-9293-85b9bc724b60') THEN
    RAISE EXCEPTION 'Release owns rule items/current proof values; do not unpublish';
  END IF;
  IF EXISTS (SELECT 1 FROM public.admission_publication_attempts
      WHERE release_id = '6b88405e-a824-41f0-9293-85b9bc724b60') THEN
    RAISE EXCEPTION 'Simulation unexpectedly has publication attempts';
  END IF;
  -- Fail closed if the live schema has acquired another release FK/pointer.
  IF EXISTS (SELECT 1 FROM pg_constraint
      WHERE contype = 'f' AND confrelid = 'public.admission_releases'::regclass
        AND (conrelid NOT IN ('public.admission_publication_attempts'::regclass,
          'public.admission_target_transitions'::regclass,
          'public.admission_operational_proof_values'::regclass)
          OR conkey <> ARRAY[(SELECT attnum FROM pg_attribute
            WHERE attrelid = conrelid AND attname = 'release_id')]::smallint[]
          OR confkey <> ARRAY[(SELECT attnum FROM pg_attribute
            WHERE attrelid = confrelid AND attname = 'id')]::smallint[])) THEN
    RAISE EXCEPTION 'Unexpected release foreign key; inspect dependencies';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name LIKE '%release%id%'
        AND (table_name, column_name) NOT IN (
          ('admission_publication_attempts', 'release_id'),
          ('admission_target_transitions', 'release_id'),
          ('admission_operational_proof_values', 'release_id')))
    OR EXISTS (SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.admission_releases'::regclass AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Unexpected release pointer/trigger; inspect before retiring';
  END IF;
END $guard$;

-- Private, single-use backup. No IF NOT EXISTS: never overwrite the original.
CREATE SCHEMA retire_simulation_20261025;
REVOKE ALL ON SCHEMA retire_simulation_20261025
  FROM PUBLIC, anon, authenticated, app_runtime, ops_readonly, admissions_automation;
CREATE TABLE retire_simulation_20261025.admission_releases AS
  SELECT * FROM public.admission_releases
  WHERE id = '6b88405e-a824-41f0-9293-85b9bc724b60'
    AND repository_commit = 'simulation-only';
CREATE TABLE retire_simulation_20261025.admission_publication_attempts AS
  SELECT * FROM public.admission_publication_attempts
  WHERE release_id IN (SELECT id FROM retire_simulation_20261025.admission_releases);
CREATE TABLE retire_simulation_20261025.admission_target_transitions AS
  SELECT * FROM public.admission_target_transitions
  WHERE release_id IN (SELECT id FROM retire_simulation_20261025.admission_releases);
CREATE TABLE retire_simulation_20261025.admission_release_items AS
  SELECT * FROM public.admission_release_items
  WHERE transition_id IN (SELECT id FROM retire_simulation_20261025.admission_target_transitions);
CREATE TABLE retire_simulation_20261025.admission_operational_proof_values AS
  SELECT * FROM public.admission_operational_proof_values
  WHERE release_id IN (SELECT id FROM retire_simulation_20261025.admission_releases);
CREATE TABLE retire_simulation_20261025.admission_alert_transition_work AS
  SELECT * FROM public.admission_alert_transition_work
  WHERE transition_id IN (SELECT id FROM retire_simulation_20261025.admission_target_transitions);
CREATE TABLE retire_simulation_20261025.admission_alert_outbox AS
  SELECT * FROM public.admission_alert_outbox
  WHERE transition_id IN (SELECT id FROM retire_simulation_20261025.admission_target_transitions);
CREATE TABLE retire_simulation_20261025.admission_alert_webhook_events AS
  SELECT * FROM public.admission_alert_webhook_events
  WHERE outbox_id IN (SELECT id FROM retire_simulation_20261025.admission_alert_outbox);
REVOKE ALL ON ALL TABLES IN SCHEMA retire_simulation_20261025
  FROM PUBLIC, anon, authenticated, app_runtime, ops_readonly, admissions_automation;
DO $private$
DECLARE backup_table text;
BEGIN
  FOR backup_table IN SELECT tablename FROM pg_tables
    WHERE schemaname = 'retire_simulation_20261025'
  LOOP
    EXECUTE format('ALTER TABLE retire_simulation_20261025.%I ENABLE ROW LEVEL SECURITY', backup_table);
  END LOOP;
END $private$;

DO $apply$
DECLARE changed integer;
BEGIN
  UPDATE public.admission_releases SET status = 'failed', published_at = NULL
  WHERE id = '6b88405e-a824-41f0-9293-85b9bc724b60'
    AND repository_commit = 'simulation-only' AND status = 'published'
    AND release_kind = 'operational_proof'
    AND proof_scenario = 'plan004-account-simulation-v1';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one retired simulation release, got %', changed;
  END IF;
  -- Mirror loadPublicationDatabaseState in scripts/verify-operational-db.mjs.
  IF EXISTS (SELECT 1 FROM public.admission_releases
      WHERE status = 'pending' OR (status = 'published' AND (
        published_at IS NULL OR repository_commit !~ '^[0-9a-f]{7,64}$'
        OR manifest_digest !~ '^sha256:[0-9a-f]{64}$')))
    OR EXISTS (SELECT 1 FROM public.admission_publication_attempts WHERE status = 'started') THEN
    RAISE EXCEPTION 'Publication gate still blocked; roll back the entire packet';
  END IF;
END $apply$;
COMMIT;

-- VERIFY: exact gate query + ready derived from the same three counts.
WITH gate AS (
  SELECT count(*) FILTER (WHERE status = 'pending')::int AS pending_release_count,
    (SELECT count(*)::int FROM public.admission_publication_attempts
      WHERE status = 'started') AS started_attempt_count,
    count(*) FILTER (WHERE status = 'published' AND (
      published_at IS NULL OR repository_commit !~ '^[0-9a-f]{7,64}$'
      OR manifest_digest !~ '^sha256:[0-9a-f]{64}$'
    ))::int AS malformed_published_release_count
  FROM public.admission_releases
)
SELECT *, pending_release_count = 0 AND started_attempt_count = 0
  AND malformed_published_release_count = 0 AS ready FROM gate;
SELECT id, repository_commit, status, published_at, release_kind, proof_scenario
FROM public.admission_releases WHERE id = '6b88405e-a824-41f0-9293-85b9bc724b60';
SELECT 'transitions' AS dependency, count(*) FROM public.admission_target_transitions
WHERE release_id = '6b88405e-a824-41f0-9293-85b9bc724b60'
UNION ALL SELECT 'items', count(*) FROM public.admission_release_items
WHERE transition_id IN (SELECT id FROM retire_simulation_20261025.admission_target_transitions)
UNION ALL SELECT 'current_proof_values', count(*) FROM public.admission_operational_proof_values
WHERE release_id = '6b88405e-a824-41f0-9293-85b9bc724b60';
-- Also run npm run db:operational:publication using the existing ops-readonly role.
-- Jorje records apply/verify evidence in /workspace/pm-research/db_changes.md.

-- ROLLBACK (manual, separate execution; intentionally commented out).
-- Restores only the changed columns, never overwrites callbacks or dependent rows.
-- This deliberately restores the original publication blocker. Keep the backup.
/* ROLLBACK BEGIN
BEGIN ISOLATION LEVEL SERIALIZABLE;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.admission_releases IN SHARE ROW EXCLUSIVE MODE;
DO $rollback$
DECLARE changed integer;
BEGIN
  UPDATE public.admission_releases r
  SET status = b.status, published_at = b.published_at
  FROM retire_simulation_20261025.admission_releases b
  WHERE r.id = b.id AND r.id = '6b88405e-a824-41f0-9293-85b9bc724b60'
    AND r.repository_commit = 'simulation-only' AND b.repository_commit = 'simulation-only'
    AND r.status = 'failed' AND r.published_at IS NULL
    AND (to_jsonb(r) - 'status' - 'published_at') = (to_jsonb(b) - 'status' - 'published_at');
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN
    RAISE EXCEPTION 'Expected one unchanged retired simulation; inspect before rollback';
  END IF;
END $rollback$;
COMMIT;
ROLLBACK END */
