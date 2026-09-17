-- Supabase projects created before the opt-in default privilege change grant
-- new public tables to API roles. The proof lane is intentionally private.
REVOKE ALL PRIVILEGES ON TABLE "admission_operational_proof_values" FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
    AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON TABLE "admission_operational_proof_values"
      FROM anon, authenticated;

    CREATE POLICY "admission_operational_proof_values_private_deny_all"
      ON "admission_operational_proof_values" AS RESTRICTIVE FOR ALL TO anon, authenticated
      USING (false) WITH CHECK (false);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    REVOKE ALL PRIVILEGES ON TABLE "admission_operational_proof_values" FROM app_runtime;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ops_readonly') THEN
    REVOKE ALL PRIVILEGES ON TABLE "admission_operational_proof_values" FROM ops_readonly;
  END IF;
END $$;
