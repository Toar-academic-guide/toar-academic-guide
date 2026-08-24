DROP POLICY IF EXISTS "bagrut_profile_versions_ops_readonly_read"
  ON "bagrut_profile_versions";--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ops_readonly') THEN
    GRANT SELECT ON TABLE "bagrut_profile_versions" TO ops_readonly;

    CREATE POLICY "bagrut_profile_versions_ops_readonly_read"
      ON "bagrut_profile_versions"
      FOR SELECT
      TO ops_readonly
      USING (true);
  END IF;
END $$;
