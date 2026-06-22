ALTER TABLE "university_calculator_configs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "saved_programs" DROP CONSTRAINT IF EXISTS "saved_programs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "uploaded_documents" DROP CONSTRAINT IF EXISTS "uploaded_documents_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "user_profiles_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "saved_programs" ALTER COLUMN "user_id" SET DATA TYPE uuid USING user_id::uuid;--> statement-breakpoint
ALTER TABLE "uploaded_documents" ALTER COLUMN "user_id" SET DATA TYPE uuid USING user_id::uuid;--> statement-breakpoint
ALTER TABLE "user_profiles" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "user_profiles" ALTER COLUMN "user_id" SET DATA TYPE uuid USING user_id::uuid;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD PRIMARY KEY ("user_id");--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "saved_programs" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "uploaded_documents" ENABLE ROW LEVEL SECURITY;

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
  END IF;
END $$;
