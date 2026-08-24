-- Custom SQL migration file, put your code below! --
ALTER TABLE "admission_alternative_paths" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admission_facts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admissions_source_candidates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "source_freshness_checks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "source_freshness_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY IF EXISTS "admission_alternative_paths_private_deny_all" ON "admission_alternative_paths";--> statement-breakpoint
DROP POLICY IF EXISTS "admission_facts_private_deny_all" ON "admission_facts";--> statement-breakpoint
DROP POLICY IF EXISTS "admissions_source_candidates_private_deny_all" ON "admissions_source_candidates";--> statement-breakpoint
DROP POLICY IF EXISTS "source_freshness_checks_private_deny_all" ON "source_freshness_checks";--> statement-breakpoint
DROP POLICY IF EXISTS "source_freshness_states_private_deny_all" ON "source_freshness_states";--> statement-breakpoint
DROP POLICY IF EXISTS "admission_alternative_paths_app_runtime_read" ON "admission_alternative_paths";--> statement-breakpoint
DROP POLICY IF EXISTS "admission_facts_app_runtime_read" ON "admission_facts";--> statement-breakpoint
DROP POLICY IF EXISTS "admissions_source_candidates_app_runtime_read" ON "admissions_source_candidates";--> statement-breakpoint
DROP POLICY IF EXISTS "source_freshness_checks_app_runtime_read" ON "source_freshness_checks";--> statement-breakpoint
DROP POLICY IF EXISTS "source_freshness_states_app_runtime_read" ON "source_freshness_states";--> statement-breakpoint
DROP POLICY IF EXISTS "source_freshness_checks_app_runtime_insert" ON "source_freshness_checks";--> statement-breakpoint
DROP POLICY IF EXISTS "source_freshness_states_app_runtime_insert" ON "source_freshness_states";--> statement-breakpoint
DROP POLICY IF EXISTS "source_freshness_states_app_runtime_update" ON "source_freshness_states";--> statement-breakpoint
DROP POLICY IF EXISTS "admission_alternative_paths_ops_readonly_read" ON "admission_alternative_paths";--> statement-breakpoint
DROP POLICY IF EXISTS "admission_facts_ops_readonly_read" ON "admission_facts";--> statement-breakpoint
DROP POLICY IF EXISTS "admissions_source_candidates_ops_readonly_read" ON "admissions_source_candidates";--> statement-breakpoint
DROP POLICY IF EXISTS "source_freshness_checks_ops_readonly_read" ON "source_freshness_checks";--> statement-breakpoint
DROP POLICY IF EXISTS "source_freshness_states_ops_readonly_read" ON "source_freshness_states";--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
    AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE
      "admission_alternative_paths",
      "admission_facts",
      "admissions_source_candidates",
      "source_freshness_checks",
      "source_freshness_states"
    FROM anon, authenticated;

    CREATE POLICY "admission_alternative_paths_private_deny_all"
      ON "admission_alternative_paths"
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);

    CREATE POLICY "admission_facts_private_deny_all"
      ON "admission_facts"
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);

    CREATE POLICY "admissions_source_candidates_private_deny_all"
      ON "admissions_source_candidates"
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);

    CREATE POLICY "source_freshness_checks_private_deny_all"
      ON "source_freshness_checks"
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);

    CREATE POLICY "source_freshness_states_private_deny_all"
      ON "source_freshness_states"
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    GRANT SELECT ON TABLE
      "admission_alternative_paths",
      "admission_facts",
      "admissions_source_candidates",
      "source_freshness_checks",
      "source_freshness_states"
    TO app_runtime;
    GRANT INSERT ON TABLE "source_freshness_checks", "source_freshness_states" TO app_runtime;
    GRANT UPDATE ON TABLE "source_freshness_states" TO app_runtime;

    CREATE POLICY "admission_alternative_paths_app_runtime_read"
      ON "admission_alternative_paths"
      FOR SELECT
      TO app_runtime
      USING (true);

    CREATE POLICY "admission_facts_app_runtime_read"
      ON "admission_facts"
      FOR SELECT
      TO app_runtime
      USING (true);

    CREATE POLICY "admissions_source_candidates_app_runtime_read"
      ON "admissions_source_candidates"
      FOR SELECT
      TO app_runtime
      USING (true);

    CREATE POLICY "source_freshness_checks_app_runtime_read"
      ON "source_freshness_checks"
      FOR SELECT
      TO app_runtime
      USING (true);

    CREATE POLICY "source_freshness_states_app_runtime_read"
      ON "source_freshness_states"
      FOR SELECT
      TO app_runtime
      USING (true);

    CREATE POLICY "source_freshness_checks_app_runtime_insert"
      ON "source_freshness_checks"
      FOR INSERT
      TO app_runtime
      WITH CHECK (true);

    CREATE POLICY "source_freshness_states_app_runtime_insert"
      ON "source_freshness_states"
      FOR INSERT
      TO app_runtime
      WITH CHECK (true);

    CREATE POLICY "source_freshness_states_app_runtime_update"
      ON "source_freshness_states"
      FOR UPDATE
      TO app_runtime
      USING (true)
      WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ops_readonly') THEN
    GRANT SELECT ON TABLE
      "admission_alternative_paths",
      "admission_facts",
      "admissions_source_candidates",
      "source_freshness_checks",
      "source_freshness_states"
    TO ops_readonly;

    CREATE POLICY "admission_alternative_paths_ops_readonly_read"
      ON "admission_alternative_paths"
      FOR SELECT
      TO ops_readonly
      USING (true);

    CREATE POLICY "admission_facts_ops_readonly_read"
      ON "admission_facts"
      FOR SELECT
      TO ops_readonly
      USING (true);

    CREATE POLICY "admissions_source_candidates_ops_readonly_read"
      ON "admissions_source_candidates"
      FOR SELECT
      TO ops_readonly
      USING (true);

    CREATE POLICY "source_freshness_checks_ops_readonly_read"
      ON "source_freshness_checks"
      FOR SELECT
      TO ops_readonly
      USING (true);

    CREATE POLICY "source_freshness_states_ops_readonly_read"
      ON "source_freshness_states"
      FOR SELECT
      TO ops_readonly
      USING (true);
  END IF;
END $$;
