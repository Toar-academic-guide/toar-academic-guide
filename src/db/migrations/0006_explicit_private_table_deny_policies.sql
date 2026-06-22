DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    DROP POLICY IF EXISTS "requirement_versions_private_deny_all" ON "requirement_versions";
    DROP POLICY IF EXISTS "ingestion_sources_private_deny_all" ON "ingestion_sources";
    DROP POLICY IF EXISTS "ingestion_jobs_private_deny_all" ON "ingestion_jobs";
    DROP POLICY IF EXISTS "ingestion_payloads_private_deny_all" ON "ingestion_payloads";
    DROP POLICY IF EXISTS "review_items_private_deny_all" ON "review_items";

    CREATE POLICY "requirement_versions_private_deny_all"
      ON "requirement_versions"
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);

    CREATE POLICY "ingestion_sources_private_deny_all"
      ON "ingestion_sources"
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);

    CREATE POLICY "ingestion_jobs_private_deny_all"
      ON "ingestion_jobs"
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);

    CREATE POLICY "ingestion_payloads_private_deny_all"
      ON "ingestion_payloads"
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);

    CREATE POLICY "review_items_private_deny_all"
      ON "review_items"
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;
