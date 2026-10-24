-- Enquiries backup/apply/rollback packet. DO NOT run as part of app startup or PR verification.
-- Preview shares production. An authorized operator must run this separately.
-- Does not replay any historical migration (especially 0037-0039).
--
-- BACKUP (operator shell, before APPLY):
-- 1. Record database identity and whether public.enquiries / public.store_enquiry exist.
-- 2. If enquiries exists, export with pg_dump in a private, encrypted location:
--    pg_dump "$DATABASE_URL" --format=custom --table=public.enquiries --file=enquiries-before-2026-10-24.dump
--    pg_dump "$DATABASE_URL" --schema-only --schema=public --file=public-schema-before-enquiries.sql
--    Verify the archives with pg_restore --list; keep them private (contain contact data).
--    If absent, record that fact; there are no existing rows to back up.
-- 3. Save the existing function definition/owner/ACL, if any, from pg_get_functiondef/pg_proc.
--
-- APPLY: in a privileged SQL session, deliberately set this session flag first:
-- SET myway.apply_enquiries = '2026-10-24';
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $$ BEGIN
  IF current_setting('myway.apply_enquiries', true) IS DISTINCT FROM '2026-10-24' THEN
    RAISE EXCEPTION 'Refusing apply: backup and explicit myway.apply_enquiries flag required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role' AND rolbypassrls) THEN
    RAISE EXCEPTION 'Expected Supabase service_role with BYPASSRLS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    RAISE EXCEPTION 'Expected existing restricted server role app_runtime';
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.enquiries (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"program_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"program_name" text NOT NULL,
	"institution_name" text NOT NULL,
	"source_path" text NOT NULL,
	"consent" boolean NOT NULL,
	"consent_text" text NOT NULL,
	"result_status" text NOT NULL,
	"bagrut" real,
	"psychometric" integer,
	"evaluation_input" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enquiries_result_status_check" CHECK ("enquiries"."result_status" in ('accepted', 'below', 'eligible_to_apply', 'unknown')),
	CONSTRAINT "enquiries_consent_check" CHECK ("enquiries"."consent" = true)
);
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.enquiries FROM PUBLIC, anon, authenticated, app_runtime;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE public.enquiries TO service_role;
  END IF;
END $$;
-- The server role may submit leads, but cannot list or read any contact details.
CREATE OR REPLACE FUNCTION public.store_enquiry(payload jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.enquiries (
    request_id, name, phone, program_id, institution_id, program_name,
    institution_name, source_path, consent, consent_text, result_status,
    bagrut, psychometric, evaluation_input, created_at
  ) VALUES (
    (payload->>'requestId')::uuid, payload->>'name', payload->>'phone',
    payload->>'programId', payload->>'institutionId', payload->>'programName',
    payload->>'institutionName', payload->>'sourcePath', (payload->>'consent')::boolean,
    payload->>'consentText', payload->>'resultStatus', (payload->>'bagrut')::real,
    (payload->>'psychometric')::integer, payload->'evaluationInput',
    (payload->>'createdAt')::timestamptz
  ) ON CONFLICT (request_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.store_enquiry(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_enquiry(jsonb) TO app_runtime;

-- VERIFY (read-only, same authorized operator session):
-- SELECT relrowsecurity FROM pg_class WHERE oid = 'public.enquiries'::regclass;
-- SELECT has_table_privilege('anon','public.enquiries','SELECT'),
--        has_table_privilege('authenticated','public.enquiries','SELECT'),
--        has_table_privilege('app_runtime','public.enquiries','SELECT'); -- all false
-- SELECT has_function_privilege('app_runtime','public.store_enquiry(jsonb)','EXECUTE'); -- true
-- SELECT count(*) FROM public.enquiries; -- privileged session only; do not print contacts
COMMIT;

-- ROLLBACK: run ONLY this commented block separately, after backup and operator authorization.
-- Preserve newly received leads by archiving the table; do not drop contact data.
-- Re-running this rollback is harmless; do not re-apply until the archived rows are reconciled.
/*
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF current_setting('myway.rollback_enquiries', true) IS DISTINCT FROM '2026-10-24' THEN
    RAISE EXCEPTION 'Refusing rollback: explicit myway.rollback_enquiries flag required';
  END IF;
  IF to_regclass('public.enquiries') IS NOT NULL THEN
    IF to_regclass('public.enquiries_rollback_20261024') IS NOT NULL THEN
      RAISE EXCEPTION 'Archive already exists; reconcile before rollback';
    END IF;
    ALTER TABLE public.enquiries RENAME TO enquiries_rollback_20261024;
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.store_enquiry(jsonb);
COMMIT;
-- If replacing a pre-existing table/function, restore its definition/ACL from the schema backup
-- after reconciling archived rows. Never restore an old dump over newly received leads.
*/
