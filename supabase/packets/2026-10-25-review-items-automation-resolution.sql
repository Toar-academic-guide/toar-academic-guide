-- GUARDED SQL: Jorje applies 0043 after merge.
-- Companion to src/db/migrations/0043_grant_admissions_automation_review_resolution.sql.
-- Never apply to production/preview during PR verification; preview shares production.
-- Do not replay historical migrations or alter either migration journal.
--
-- BACKUP: save the output of these read-only queries in the private operator record:
-- SELECT relacl FROM pg_class WHERE oid = 'public.review_items'::regclass;
-- SELECT attname, attacl FROM pg_attribute WHERE attrelid = 'public.review_items'::regclass AND attnum > 0;
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'review_items';
-- Confirm 0025 INSERT and 0021 source_freshness_states read/update access remain present.
-- No data rows change. Retain this backup for comparison after apply or rollback.
-- APPLY: deliberately enable only after saving the backup:
-- SET myway.apply_review_resolution = '0043';
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL search_path = public, pg_catalog;
DO $$ BEGIN
  IF current_setting('myway.apply_review_resolution', true) IS DISTINCT FROM '0043' THEN
    RAISE EXCEPTION 'Refusing apply: backup and explicit myway.apply_review_resolution flag required';
  END IF;
  IF to_regclass('public.review_items') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admissions_automation' AND NOT rolsuper AND NOT rolbypassrls)
     OR NOT has_table_privilege('admissions_automation', 'public.review_items', 'INSERT')
     OR NOT has_table_privilege('admissions_automation', 'public.source_freshness_states', 'SELECT')
     OR NOT has_table_privilege('admissions_automation', 'public.source_freshness_states', 'UPDATE') THEN
    RAISE EXCEPTION 'Expected applied 0021/0025 operational access; do not replay historical SQL';
  END IF;
END $$;
GRANT SELECT ON TABLE "review_items" TO admissions_automation;--> statement-breakpoint
GRANT UPDATE ("status", "reviewed_at") ON TABLE "review_items" TO admissions_automation;--> statement-breakpoint
DROP POLICY IF EXISTS "review_items_admissions_automation_read" ON "review_items";--> statement-breakpoint
CREATE POLICY "review_items_admissions_automation_read"
  ON "review_items" FOR SELECT TO admissions_automation USING (true);--> statement-breakpoint
DROP POLICY IF EXISTS "review_items_admissions_automation_update" ON "review_items";--> statement-breakpoint
CREATE POLICY "review_items_admissions_automation_update"
  ON "review_items" FOR UPDATE TO admissions_automation
  USING ("status" = 'pending'::"public"."review_item_status")
  WITH CHECK ("status" IN ('approved'::"public"."review_item_status", 'rejected'::"public"."review_item_status"));

-- VERIFY: fail the transaction if the resulting table/column privileges are broader or missing.
DO $$ BEGIN
  IF NOT has_table_privilege('admissions_automation', 'public.review_items', 'SELECT')
     OR has_table_privilege('admissions_automation', 'public.review_items', 'UPDATE')
     OR has_table_privilege('admissions_automation', 'public.review_items', 'DELETE')
     OR EXISTS (
       SELECT 1 FROM pg_attribute
       WHERE attrelid = 'public.review_items'::regclass AND attnum > 0 AND NOT attisdropped
       AND has_column_privilege('admissions_automation', attrelid, attnum, 'UPDATE')
           IS DISTINCT FROM (attname IN ('status', 'reviewed_at'))
     ) THEN
    RAISE EXCEPTION '0043 review resolution privileges do not match least privilege';
  END IF;
END $$;
SELECT policyname, roles, cmd, qual, with_check FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'review_items' ORDER BY policyname;
COMMIT;

-- ROLLBACK: run separately, only if the backup shows these grants/policies were absent.
-- Restores the pre-0043 permission gap; does not revert resolved rows or 0025 INSERT access.
/*
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
-- SET LOCAL myway.rollback_review_resolution = '0043';
DO $$ BEGIN
  IF current_setting('myway.rollback_review_resolution', true) IS DISTINCT FROM '0043' THEN
    RAISE EXCEPTION 'Refusing rollback: explicit myway.rollback_review_resolution flag required';
  END IF;
END $$;
DROP POLICY IF EXISTS review_items_admissions_automation_read ON public.review_items;
DROP POLICY IF EXISTS review_items_admissions_automation_update ON public.review_items;
REVOKE SELECT ON TABLE public.review_items FROM admissions_automation;
REVOKE UPDATE (status, reviewed_at) ON TABLE public.review_items FROM admissions_automation;
COMMIT;
-- Re-read ACLs/policies and compare with the backup, including app_runtime and ops_readonly.
*/
