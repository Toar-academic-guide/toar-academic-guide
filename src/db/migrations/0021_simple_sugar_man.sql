CREATE TYPE "public"."admission_release_kind" AS ENUM('canonical_bootstrap', 'canonical_change', 'operational_proof');--> statement-breakpoint
CREATE TABLE "admission_operational_proof_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"institution_id" text NOT NULL,
	"program_id" text NOT NULL,
	"cycle" text NOT NULL,
	"rule_kind" text NOT NULL,
	"current_value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admission_releases" ADD COLUMN "release_kind" "admission_release_kind" DEFAULT 'canonical_change' NOT NULL;--> statement-breakpoint
ALTER TABLE "admission_releases" ADD COLUMN "proof_scenario" text;--> statement-breakpoint
ALTER TABLE "admission_review_runs" ADD COLUMN "release_kind" "admission_release_kind" DEFAULT 'canonical_change' NOT NULL;--> statement-breakpoint
ALTER TABLE "admission_review_runs" ADD COLUMN "proof_scenario" text;--> statement-breakpoint
ALTER TABLE "admission_operational_proof_values" ADD CONSTRAINT "admission_operational_proof_values_release_id_admission_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."admission_releases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_operational_proof_values" ADD CONSTRAINT "admission_operational_proof_values_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_operational_proof_values" ADD CONSTRAINT "admission_operational_proof_values_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admission_operational_proof_values_target_rule_unique" ON "admission_operational_proof_values" USING btree ("institution_id","program_id","cycle","rule_kind");--> statement-breakpoint
CREATE INDEX "admission_operational_proof_values_release_idx" ON "admission_operational_proof_values" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "admission_releases_kind_published_at_idx" ON "admission_releases" USING btree ("release_kind","published_at");--> statement-breakpoint
CREATE INDEX "admission_review_runs_kind_status_idx" ON "admission_review_runs" USING btree ("release_kind","status");--> statement-breakpoint
ALTER TABLE "admission_releases"
  ADD CONSTRAINT "admission_releases_proof_scenario_kind_check"
  CHECK (
    ("release_kind" = 'operational_proof' AND "proof_scenario" IS NOT NULL)
    OR ("release_kind" <> 'operational_proof' AND "proof_scenario" IS NULL)
  );--> statement-breakpoint
ALTER TABLE "admission_review_runs"
  ADD CONSTRAINT "admission_review_runs_proof_scenario_kind_check"
  CHECK (
    ("release_kind" = 'operational_proof' AND "proof_scenario" IS NOT NULL)
    OR ("release_kind" <> 'operational_proof' AND "proof_scenario" IS NULL)
  );--> statement-breakpoint
ALTER TABLE "admission_operational_proof_values" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admissions_automation') THEN
    CREATE ROLE admissions_automation
      NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'admissions_automation'
      AND (
        rolsuper
        OR rolcreatedb
        OR rolcreaterole
        OR rolinherit
        OR rolreplication
        OR rolbypassrls
        OR rolcanlogin
      )
  ) THEN
    RAISE EXCEPTION
      'admissions_automation must be a non-login, non-privileged role before grants are applied';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_auth_members membership
    JOIN pg_roles member_role ON member_role.oid = membership.member
    WHERE member_role.rolname = 'admissions_automation'
  ) THEN
    RAISE EXCEPTION
      'admissions_automation must not inherit or assume privileges through role membership';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class relation
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    JOIN pg_roles owner_role ON owner_role.oid = relation.relowner
    WHERE namespace.nspname = 'public'
      AND owner_role.rolname = 'admissions_automation'
    UNION ALL
    SELECT 1 FROM pg_proc routine
    JOIN pg_namespace namespace ON namespace.oid = routine.pronamespace
    JOIN pg_roles owner_role ON owner_role.oid = routine.proowner
    WHERE namespace.nspname = 'public'
      AND owner_role.rolname = 'admissions_automation'
    UNION ALL
    SELECT 1 FROM pg_type type
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    JOIN pg_roles owner_role ON owner_role.oid = type.typowner
    WHERE namespace.nspname = 'public'
      AND owner_role.rolname = 'admissions_automation'
    UNION ALL
    SELECT 1 FROM pg_namespace namespace
    JOIN pg_roles owner_role ON owner_role.oid = namespace.nspowner
    WHERE namespace.nspname = 'public'
      AND owner_role.rolname = 'admissions_automation'
  ) THEN
    RAISE EXCEPTION
      'admissions_automation must not own public database objects';
  END IF;

  REVOKE ALL PRIVILEGES ON SCHEMA public FROM admissions_automation;
  REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM admissions_automation;
  GRANT USAGE ON SCHEMA public TO admissions_automation;
  GRANT SELECT ON TABLE
    "institutions",
    "programs",
    "program_institutions",
    "ingestion_sources",
    "admission_thresholds"
  TO admissions_automation;
  GRANT UPDATE ("threshold_value") ON TABLE "admission_thresholds" TO admissions_automation;
  GRANT SELECT, INSERT, UPDATE ON TABLE
    "source_freshness_checks",
    "source_freshness_states",
    "admission_review_runs",
    "admission_releases",
    "admission_target_transitions",
    "admission_release_items",
    "admission_publication_attempts",
    "admission_operational_proof_values"
  TO admissions_automation;

  REVOKE ALL ON TABLE
    "user_profiles",
    "saved_programs",
    "uploaded_documents",
    "bagrut_profile_versions"
  FROM admissions_automation;

  CREATE POLICY "institutions_admissions_automation_read"
    ON "institutions" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "programs_admissions_automation_read"
    ON "programs" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "program_institutions_admissions_automation_read"
    ON "program_institutions" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "ingestion_sources_admissions_automation_read"
    ON "ingestion_sources" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "admission_thresholds_admissions_automation_read"
    ON "admission_thresholds" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "admission_thresholds_admissions_automation_update"
    ON "admission_thresholds" FOR UPDATE TO admissions_automation
    USING (true) WITH CHECK (true);

  CREATE POLICY "source_freshness_checks_admissions_automation_read"
    ON "source_freshness_checks" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "source_freshness_checks_admissions_automation_insert"
    ON "source_freshness_checks" FOR INSERT TO admissions_automation WITH CHECK (true);
  CREATE POLICY "source_freshness_checks_admissions_automation_update"
    ON "source_freshness_checks" FOR UPDATE TO admissions_automation
    USING (true) WITH CHECK (true);
  CREATE POLICY "source_freshness_states_admissions_automation_read"
    ON "source_freshness_states" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "source_freshness_states_admissions_automation_insert"
    ON "source_freshness_states" FOR INSERT TO admissions_automation WITH CHECK (true);
  CREATE POLICY "source_freshness_states_admissions_automation_update"
    ON "source_freshness_states" FOR UPDATE TO admissions_automation
    USING (true) WITH CHECK (true);

  CREATE POLICY "admission_review_runs_admissions_automation_read"
    ON "admission_review_runs" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "admission_review_runs_admissions_automation_insert"
    ON "admission_review_runs" FOR INSERT TO admissions_automation WITH CHECK (true);
  CREATE POLICY "admission_review_runs_admissions_automation_update"
    ON "admission_review_runs" FOR UPDATE TO admissions_automation
    USING (true) WITH CHECK (true);
  CREATE POLICY "admission_releases_admissions_automation_read"
    ON "admission_releases" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "admission_releases_admissions_automation_insert"
    ON "admission_releases" FOR INSERT TO admissions_automation WITH CHECK (true);
  CREATE POLICY "admission_releases_admissions_automation_update"
    ON "admission_releases" FOR UPDATE TO admissions_automation
    USING (true) WITH CHECK (true);
  CREATE POLICY "admission_target_transitions_admissions_automation_read"
    ON "admission_target_transitions" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "admission_target_transitions_admissions_automation_insert"
    ON "admission_target_transitions" FOR INSERT TO admissions_automation WITH CHECK (true);
  CREATE POLICY "admission_target_transitions_admissions_automation_update"
    ON "admission_target_transitions" FOR UPDATE TO admissions_automation
    USING (true) WITH CHECK (true);
  CREATE POLICY "admission_release_items_admissions_automation_read"
    ON "admission_release_items" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "admission_release_items_admissions_automation_insert"
    ON "admission_release_items" FOR INSERT TO admissions_automation WITH CHECK (true);
  CREATE POLICY "admission_release_items_admissions_automation_update"
    ON "admission_release_items" FOR UPDATE TO admissions_automation
    USING (true) WITH CHECK (true);
  CREATE POLICY "admission_publication_attempts_admissions_automation_read"
    ON "admission_publication_attempts" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "admission_publication_attempts_admissions_automation_insert"
    ON "admission_publication_attempts" FOR INSERT TO admissions_automation WITH CHECK (true);
  CREATE POLICY "admission_publication_attempts_admissions_automation_update"
    ON "admission_publication_attempts" FOR UPDATE TO admissions_automation
    USING (true) WITH CHECK (true);
  CREATE POLICY "admission_operational_proof_values_admissions_automation_read"
    ON "admission_operational_proof_values" FOR SELECT TO admissions_automation USING (true);
  CREATE POLICY "admission_operational_proof_values_admissions_automation_insert"
    ON "admission_operational_proof_values" FOR INSERT TO admissions_automation WITH CHECK (true);
  CREATE POLICY "admission_operational_proof_values_admissions_automation_update"
    ON "admission_operational_proof_values" FOR UPDATE TO admissions_automation
    USING (true) WITH CHECK (true);
END $$;
