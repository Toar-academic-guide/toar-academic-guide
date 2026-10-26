-- GUARDED SQL: Jorje applies after merge
-- Companion migration: src/db/migrations/0044_enquiries_prep_consent.sql.
-- Never run in PR verification: preview shares the PRODUCTION database.
-- Only Jorje applies this packet; never replay historical migrations or alter history.
--
-- BACKUP: before APPLY, capture the CURRENT definition and owner/ACL to PRIVATE
-- operator files (never commit or share enquiry data or connection credentials):
-- psql "$DATABASE_URL" -X -A -t -v ON_ERROR_STOP=1 \
--   -c "SELECT pg_get_functiondef('public.store_enquiry(jsonb)'::regprocedure)" \
--   > store-enquiry-before-0044.sql
-- SELECT p.oid::regprocedure, pg_get_userbyid(p.proowner) AS owner, p.proacl,
--        p.prosecdef, p.proconfig
-- FROM pg_proc p WHERE p.oid = 'public.store_enquiry(jsonb)'::regprocedure;
-- Save that owner/ACL result separately in a private operator file.
-- Compare the captured definition with the verbatim 0042 restore below. STOP
-- on unexpected differences; do not roll back to a definition that differs
-- from the captured pre-0044 function. pg_get_functiondef reformats SQL, so
-- diff its definition as well as comparing semantic content and owner/ACL.
--
-- PRE-0044 SHA256: 7e0821667259f7d88520166482dff18f83042cb450f260df7c1bbeef5546ea45
-- Computed with: sha256sum /tmp/myway-pre-0044-store-enquiry.sql
-- Exact UTF-8 bytes: from CREATE OR REPLACE FUNCTION through END $$; inclusive,
-- LF line endings, final LF INCLUDED; exclude the 0042 leading comment.
-- To reproduce from repository 0042: extract starting at CREATE OR REPLACE
-- FUNCTION to EOF without altering whitespace, then run sha256sum. A raw
-- pg_get_functiondef export has different formatting and is not byte-identical.
-- The clearly delimited verbatim definition is inside ROLLBACK below.
--
-- APPLY: after BACKUP, deliberately enable the session flag:
-- SET myway.apply_enquiries_prep_consent = '2026-10-26';
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- PREFLIGHT: require 0041 table/security/grants and the 0042 timestamp default.
DO $preflight$
DECLARE
  definition text;
  disallowed_grantees text;
  col record;
  actual record;
BEGIN
  IF current_setting('myway.apply_enquiries_prep_consent', true) IS DISTINCT FROM '2026-10-26' THEN
    RAISE EXCEPTION 'Refusing apply: backup and explicit apply_enquiries_prep_consent flag required';
  END IF;
  IF to_regclass('public.enquiries') IS NULL OR to_regprocedure('public.store_enquiry(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'Expected applied 0041/0042; do not replay historical SQL';
  END IF;
  SELECT pg_get_functiondef(p.oid) INTO definition
  FROM pg_proc p WHERE p.oid = 'public.store_enquiry(jsonb)'::regprocedure
    AND p.prosecdef AND p.proconfig = ARRAY['search_path=""']::text[];
  IF definition IS NULL OR regexp_replace(lower(definition), '\s+', '', 'g')
     NOT LIKE '%coalesce((payload->>''createdat'')::timestamptz,now())%' THEN
    RAISE EXCEPTION 'Expected secured 0042 timestamp default';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.enquiries'::regclass)
     OR EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'public.enquiries'::regclass) THEN
    RAISE EXCEPTION 'Unexpected 0041 security or function grants';
  END IF;
  -- PREFLIGHT EXECUTE: reject every grantee outside the trusted allowlist.
  SELECT string_agg(grantee_name, ', ' ORDER BY grantee_name) INTO disallowed_grantees
  FROM (
    SELECT DISTINCT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee_name
    FROM pg_proc p,
         LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
    WHERE p.oid = 'public.store_enquiry(jsonb)'::regprocedure
      AND a.privilege_type = 'EXECUTE'
  ) AS execute_grants
  WHERE grantee_name NOT IN ('postgres', 'service_role', 'app_runtime');
  IF disallowed_grantees IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected store_enquiry EXECUTE grantees: %', disallowed_grantees;
  END IF;
  IF NOT has_function_privilege('app_runtime', 'public.store_enquiry(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'app_runtime EXECUTE on public.store_enquiry(jsonb) is required';
  END IF;
  IF has_function_privilege('anon', 'public.store_enquiry(jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.store_enquiry(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon/authenticated must not be able to EXECUTE public.store_enquiry(jsonb) (direct or inherited)';
  END IF;
  FOR col IN SELECT * FROM (VALUES
    ('prep_consent', 'boolean', 'NO', 'false'),
    ('prep_consent_text', 'text', 'YES', NULL),
    ('prep_consent_at', 'timestamp with time zone', 'YES', NULL)
  ) AS expected(name, data_type, nullable, default_value) LOOP
    SELECT data_type, is_nullable, column_default INTO actual
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enquiries' AND column_name = col.name;
    IF FOUND AND (actual.data_type IS DISTINCT FROM col.data_type
      OR actual.is_nullable IS DISTINCT FROM col.nullable
      OR actual.column_default IS DISTINCT FROM col.default_value) THEN
      RAISE EXCEPTION 'Unexpected existing prep column definition: %', col.name;
    END IF;
  END LOOP;
END $preflight$;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS "prep_consent" boolean DEFAULT false NOT NULL;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS "prep_consent_text" text;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS "prep_consent_at" timestamp with time zone;
CREATE OR REPLACE FUNCTION public.store_enquiry(payload jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.enquiries (
    request_id, name, phone, program_id, institution_id, program_name,
    institution_name, source_path, consent, consent_text, result_status,
    bagrut, psychometric, evaluation_input, created_at,
    utm_source, utm_medium, utm_campaign, referrer,
    prep_consent, prep_consent_text, prep_consent_at
  ) VALUES (
    (payload->>'requestId')::uuid, payload->>'name', payload->>'phone',
    payload->>'programId', payload->>'institutionId', payload->>'programName',
    payload->>'institutionName', payload->>'sourcePath', (payload->>'consent')::boolean,
    payload->>'consentText', payload->>'resultStatus', (payload->>'bagrut')::real,
    (payload->>'psychometric')::integer, payload->'evaluationInput',
    COALESCE((payload->>'createdAt')::timestamptz, now()),
    payload->'attribution'->>'utm_source', payload->'attribution'->>'utm_medium',
    payload->'attribution'->>'utm_campaign', payload->'attribution'->>'referrer',
    COALESCE((payload->>'prepConsent')::boolean, false),
    CASE WHEN COALESCE((payload->>'prepConsent')::boolean, false)
      THEN payload->>'prepConsentText' ELSE NULL END,
    CASE WHEN COALESCE((payload->>'prepConsent')::boolean, false)
      THEN (payload->>'prepConsentAt')::timestamptz ELSE NULL END
  ) ON CONFLICT (request_id) DO NOTHING;
END $$;

-- VERIFY (read-only, inside the same transaction; no synthetic lead writes):
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'enquiries'
  AND column_name IN ('prep_consent', 'prep_consent_text', 'prep_consent_at')
ORDER BY column_name;
SELECT p.oid::regprocedure AS identity,
       pg_get_functiondef(p.oid) LIKE '%prep_consent%' AS writes_prep_consent,
       p.prosecdef AS security_definer,
       p.proconfig = ARRAY['search_path=""']::text[] AS empty_search_path,
       pg_get_userbyid(p.proowner) AS owner, p.proacl,
       has_function_privilege('app_runtime', p.oid, 'EXECUTE') AS runtime_can_execute,
       NOT has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_cannot_execute,
       NOT has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_cannot_execute,
       NOT EXISTS (SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
                   WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') AS public_cannot_execute,
       NOT EXISTS (
         SELECT 1 FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
         WHERE a.privilege_type = 'EXECUTE'
           AND CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END
               NOT IN ('postgres', 'service_role', 'app_runtime')
       ) AS execute_allowlist_ok
FROM pg_proc p WHERE p.oid = 'public.store_enquiry(jsonb)'::regprocedure;
-- Compare owner/ACL to the private backup before accepting this transaction.
COMMIT;

-- ROLLBACK: run ONLY this commented block, separately, after comparing the
-- verbatim restore with the private captured pre-0044 definition. The function
-- MUST be restored FIRST so lead capture continues when columns are dropped.
-- Before rollback: (a) export the prep-consent rows to a PRIVATE operator file;
-- never commit or share it. For example, in the private operator session:
-- \copy (SELECT request_id, prep_consent, prep_consent_text, prep_consent_at FROM public.enquiries WHERE prep_consent OR prep_consent_text IS NOT NULL OR prep_consent_at IS NOT NULL) TO 'enquiries-prep-consent-before-rollback.csv' CSV HEADER
-- (b) revert the R7e app code first, so no deployed code depends on these columns.
/*
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- SET LOCAL myway.rollback_enquiries_prep_consent = '2026-10-26';
DO $rollback_guard$ BEGIN
  IF current_setting('myway.rollback_enquiries_prep_consent', true) IS DISTINCT FROM '2026-10-26' THEN
    RAISE EXCEPTION 'Refusing rollback: explicit rollback_enquiries_prep_consent flag required';
  END IF;
END $rollback_guard$;
-- BEGIN VERBATIM PRE-0044 DEFINITION (0042; hashed bytes start next line)
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
-- END VERBATIM PRE-0044 DEFINITION (hashed bytes end before this line)
ALTER TABLE public.enquiries DROP COLUMN IF EXISTS prep_consent;
ALTER TABLE public.enquiries DROP COLUMN IF EXISTS prep_consent_text;
ALTER TABLE public.enquiries DROP COLUMN IF EXISTS prep_consent_at;
COMMIT;
-- Re-read definition, owner and ACL and compare with the private backup.
-- No other columns, rows, grants, policies or migration history are touched.
*/
