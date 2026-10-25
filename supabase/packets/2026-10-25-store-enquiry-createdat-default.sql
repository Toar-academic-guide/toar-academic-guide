-- GUARDED SQL: Jorje applies after merge
-- Companion to src/db/migrations/0042_store_enquiry_createdat_default.sql.
-- Never run against production/preview during PR verification; preview shares production.
-- Applies only this function replacement. Do not replay 0037–0041 or alter migration history.
--
-- BACKUP (Jorje, after merge + production deployment READY, before APPLY):
-- Save the exact current definition in a private operator file and confirm it is nonempty:
-- psql "$DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 \
--   -c "SELECT pg_get_functiondef('public.store_enquiry(jsonb)'::regprocedure)" \
--   > store-enquiry-before-0042.sql
-- Save owner/ACL separately for comparison after apply/rollback:
-- SELECT p.oid::regprocedure AS identity, pg_get_userbyid(p.proowner) AS owner,
--        p.proacl, p.prosecdef, p.proconfig
-- FROM pg_proc p WHERE p.oid = 'public.store_enquiry(jsonb)'::regprocedure;
-- No enquiry rows change; the rollback restores the captured definition, preserving new leads.
--
-- APPLY: Jorje deliberately enables this session flag only after the backup is saved:
-- SET myway.apply_store_enquiry_createdat = '2026-10-25';
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$ BEGIN
  IF current_setting('myway.apply_store_enquiry_createdat', true) IS DISTINCT FROM '2026-10-25' THEN
    RAISE EXCEPTION 'Refusing apply: backup and explicit myway.apply_store_enquiry_createdat flag required';
  END IF;
  IF to_regprocedure('public.store_enquiry(jsonb)') IS NULL
     OR to_regclass('public.enquiries') IS NULL THEN
    RAISE EXCEPTION 'Expected applied 0041 enquiries schema; do not replay historical SQL';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION public.store_enquiry(payload jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.enquiries (
    request_id, name, phone, program_id, institution_id, program_name,
    institution_name, source_path, consent, consent_text, result_status,
    bagrut, psychometric, evaluation_input, created_at,
    utm_source, utm_medium, utm_campaign, referrer
  ) VALUES (
    (payload->>'requestId')::uuid, payload->>'name', payload->>'phone',
    payload->>'programId', payload->>'institutionId', payload->>'programName',
    payload->>'institutionName', payload->>'sourcePath', (payload->>'consent')::boolean,
    payload->>'consentText', payload->>'resultStatus', (payload->>'bagrut')::real,
    (payload->>'psychometric')::integer, payload->'evaluationInput',
    COALESCE((payload->>'createdAt')::timestamptz, now()),
    payload->'attribution'->>'utm_source', payload->'attribution'->>'utm_medium',
    payload->'attribution'->>'utm_campaign', payload->'attribution'->>'referrer'
  ) ON CONFLICT (request_id) DO NOTHING;
END $$;

-- VERIFY (read-only; do not submit a lead in production to test the default):
SELECT p.oid::regprocedure AS identity,
       pg_get_functiondef(p.oid) LIKE '%COALESCE((payload->>''createdAt'')::timestamptz, now())%' AS created_at_defaults_to_now,
       p.prosecdef AS security_definer,
       p.proconfig = ARRAY['search_path=""']::text[] AS empty_search_path,
       pg_get_userbyid(p.proowner) AS owner,
       p.proacl,
       has_function_privilege('app_runtime', p.oid, 'EXECUTE') AS runtime_can_execute,
       NOT has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_cannot_execute,
       NOT has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_cannot_execute
FROM pg_proc p WHERE p.oid = 'public.store_enquiry(jsonb)'::regprocedure;
COMMIT;

-- ROLLBACK: Jorje runs ONLY this commented block separately with the captured file.
-- Use the same owner/privileged session; CREATE OR REPLACE preserves owner and ACL.
/*
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- SET LOCAL myway.rollback_store_enquiry_createdat = '2026-10-25';
DO $$ BEGIN
  IF current_setting('myway.rollback_store_enquiry_createdat', true) IS DISTINCT FROM '2026-10-25' THEN
    RAISE EXCEPTION 'Refusing rollback: explicit myway.rollback_store_enquiry_createdat flag required';
  END IF;
END $$;
\i store-enquiry-before-0042.sql
COMMIT;
-- Re-read pg_get_functiondef, owner and ACL and compare with the backup.
-- This restores only the function definition, never deletes or replaces enquiry rows.
*/
