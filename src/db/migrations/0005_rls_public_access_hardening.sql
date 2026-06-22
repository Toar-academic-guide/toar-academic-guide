ALTER TABLE "institutions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "university_calculator_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "programs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "program_institutions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admission_requirements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admission_thresholds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "source_urls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "requirement_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "saved_programs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "uploaded_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ingestion_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ingestion_payloads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "review_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    REVOKE ALL ON TABLE
      "institutions",
      "university_calculator_configs",
      "programs",
      "program_institutions",
      "admission_requirements",
      "admission_thresholds",
      "source_urls",
      "requirement_versions",
      "user_profiles",
      "saved_programs",
      "uploaded_documents",
      "ingestion_sources",
      "ingestion_jobs",
      "ingestion_payloads",
      "review_items"
    FROM anon, authenticated;

    GRANT SELECT ON TABLE
      "institutions",
      "university_calculator_configs",
      "programs",
      "program_institutions",
      "admission_requirements",
      "admission_thresholds",
      "source_urls"
    TO anon, authenticated;

    GRANT SELECT, INSERT, UPDATE ON TABLE "user_profiles" TO authenticated;
    GRANT SELECT, INSERT, DELETE ON TABLE "saved_programs" TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "uploaded_documents" TO authenticated;

    DROP POLICY IF EXISTS "institutions_public_read" ON "institutions";
    DROP POLICY IF EXISTS "university_calculator_configs_public_read" ON "university_calculator_configs";
    DROP POLICY IF EXISTS "programs_public_read" ON "programs";
    DROP POLICY IF EXISTS "program_institutions_public_read" ON "program_institutions";
    DROP POLICY IF EXISTS "admission_requirements_public_read" ON "admission_requirements";
    DROP POLICY IF EXISTS "admission_thresholds_public_read" ON "admission_thresholds";
    DROP POLICY IF EXISTS "source_urls_public_read" ON "source_urls";

    DROP POLICY IF EXISTS "user_profiles_select_own" ON "user_profiles";
    DROP POLICY IF EXISTS "user_profiles_insert_own" ON "user_profiles";
    DROP POLICY IF EXISTS "user_profiles_update_own" ON "user_profiles";
    DROP POLICY IF EXISTS "saved_programs_select_own" ON "saved_programs";
    DROP POLICY IF EXISTS "saved_programs_insert_own" ON "saved_programs";
    DROP POLICY IF EXISTS "saved_programs_delete_own" ON "saved_programs";
    DROP POLICY IF EXISTS "uploaded_documents_select_own" ON "uploaded_documents";
    DROP POLICY IF EXISTS "uploaded_documents_insert_own" ON "uploaded_documents";
    DROP POLICY IF EXISTS "uploaded_documents_update_own" ON "uploaded_documents";
    DROP POLICY IF EXISTS "uploaded_documents_delete_own" ON "uploaded_documents";

    CREATE POLICY "institutions_public_read"
      ON "institutions"
      FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "university_calculator_configs_public_read"
      ON "university_calculator_configs"
      FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "programs_public_read"
      ON "programs"
      FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "program_institutions_public_read"
      ON "program_institutions"
      FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "admission_requirements_public_read"
      ON "admission_requirements"
      FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "admission_thresholds_public_read"
      ON "admission_thresholds"
      FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "source_urls_public_read"
      ON "source_urls"
      FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "user_profiles_select_own"
      ON "user_profiles"
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY "user_profiles_insert_own"
      ON "user_profiles"
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "user_profiles_update_own"
      ON "user_profiles"
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "saved_programs_select_own"
      ON "saved_programs"
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY "saved_programs_insert_own"
      ON "saved_programs"
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "saved_programs_delete_own"
      ON "saved_programs"
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY "uploaded_documents_select_own"
      ON "uploaded_documents"
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY "uploaded_documents_insert_own"
      ON "uploaded_documents"
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "uploaded_documents_update_own"
      ON "uploaded_documents"
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "uploaded_documents_delete_own"
      ON "uploaded_documents"
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
