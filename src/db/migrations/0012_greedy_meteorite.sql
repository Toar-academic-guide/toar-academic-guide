CREATE TYPE "public"."admission_publication_attempt_status" AS ENUM('started', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."admission_release_status" AS ENUM('pending', 'published', 'failed');--> statement-breakpoint
CREATE TABLE "admission_publication_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"status" "admission_publication_attempt_status" DEFAULT 'started' NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "admission_release_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transition_id" uuid NOT NULL,
	"rule_kind" text NOT NULL,
	"before_value" jsonb NOT NULL,
	"after_value" jsonb NOT NULL,
	"effective_from" text NOT NULL,
	"source_proofs" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manifest_digest" text NOT NULL,
	"repository_commit" text NOT NULL,
	"status" "admission_release_status" DEFAULT 'pending' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_target_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"institution_id" text NOT NULL,
	"program_id" text NOT NULL,
	"cycle" text NOT NULL,
	"before_version" text NOT NULL,
	"after_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admission_publication_attempts" ADD CONSTRAINT "admission_publication_attempts_release_id_admission_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."admission_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_release_items" ADD CONSTRAINT "admission_release_items_transition_id_admission_target_transitions_id_fk" FOREIGN KEY ("transition_id") REFERENCES "public"."admission_target_transitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_target_transitions" ADD CONSTRAINT "admission_target_transitions_release_id_admission_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."admission_releases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_target_transitions" ADD CONSTRAINT "admission_target_transitions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_target_transitions" ADD CONSTRAINT "admission_target_transitions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admission_publication_attempts_release_started_at_idx" ON "admission_publication_attempts" USING btree ("release_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_release_items_transition_rule_kind_unique" ON "admission_release_items" USING btree ("transition_id","rule_kind");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_releases_manifest_digest_unique" ON "admission_releases" USING btree ("manifest_digest");--> statement-breakpoint
CREATE INDEX "admission_releases_published_at_idx" ON "admission_releases" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_target_transitions_release_target_unique" ON "admission_target_transitions" USING btree ("release_id","institution_id","program_id","cycle");--> statement-breakpoint
CREATE INDEX "admission_target_transitions_target_lookup_idx" ON "admission_target_transitions" USING btree ("institution_id","program_id","cycle");--> statement-breakpoint
ALTER TABLE "admission_publication_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admission_release_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admission_releases" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admission_target_transitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
    AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE
      "admission_publication_attempts",
      "admission_release_items",
      "admission_releases",
      "admission_target_transitions"
    FROM anon, authenticated;

    CREATE POLICY "admission_publication_attempts_private_deny_all"
      ON "admission_publication_attempts" AS RESTRICTIVE FOR ALL TO anon, authenticated
      USING (false) WITH CHECK (false);
    CREATE POLICY "admission_release_items_private_deny_all"
      ON "admission_release_items" AS RESTRICTIVE FOR ALL TO anon, authenticated
      USING (false) WITH CHECK (false);
    CREATE POLICY "admission_releases_private_deny_all"
      ON "admission_releases" AS RESTRICTIVE FOR ALL TO anon, authenticated
      USING (false) WITH CHECK (false);
    CREATE POLICY "admission_target_transitions_private_deny_all"
      ON "admission_target_transitions" AS RESTRICTIVE FOR ALL TO anon, authenticated
      USING (false) WITH CHECK (false);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    GRANT SELECT, INSERT ON TABLE
      "admission_publication_attempts",
      "admission_release_items",
      "admission_releases",
      "admission_target_transitions"
    TO app_runtime;
    GRANT UPDATE ON TABLE "admission_publication_attempts", "admission_releases" TO app_runtime;

    CREATE POLICY "admission_publication_attempts_app_runtime_read"
      ON "admission_publication_attempts" FOR SELECT TO app_runtime USING (true);
    CREATE POLICY "admission_release_items_app_runtime_read"
      ON "admission_release_items" FOR SELECT TO app_runtime USING (true);
    CREATE POLICY "admission_releases_app_runtime_read"
      ON "admission_releases" FOR SELECT TO app_runtime USING (true);
    CREATE POLICY "admission_target_transitions_app_runtime_read"
      ON "admission_target_transitions" FOR SELECT TO app_runtime USING (true);

    CREATE POLICY "admission_publication_attempts_app_runtime_insert"
      ON "admission_publication_attempts" FOR INSERT TO app_runtime WITH CHECK (true);
    CREATE POLICY "admission_release_items_app_runtime_insert"
      ON "admission_release_items" FOR INSERT TO app_runtime WITH CHECK (true);
    CREATE POLICY "admission_releases_app_runtime_insert"
      ON "admission_releases" FOR INSERT TO app_runtime WITH CHECK (true);
    CREATE POLICY "admission_target_transitions_app_runtime_insert"
      ON "admission_target_transitions" FOR INSERT TO app_runtime WITH CHECK (true);

    CREATE POLICY "admission_publication_attempts_app_runtime_update"
      ON "admission_publication_attempts" FOR UPDATE TO app_runtime USING (true) WITH CHECK (true);
    CREATE POLICY "admission_releases_app_runtime_update"
      ON "admission_releases" FOR UPDATE TO app_runtime USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ops_readonly') THEN
    GRANT SELECT ON TABLE
      "admission_publication_attempts",
      "admission_release_items",
      "admission_releases",
      "admission_target_transitions"
    TO ops_readonly;

    CREATE POLICY "admission_publication_attempts_ops_readonly_read"
      ON "admission_publication_attempts" FOR SELECT TO ops_readonly USING (true);
    CREATE POLICY "admission_release_items_ops_readonly_read"
      ON "admission_release_items" FOR SELECT TO ops_readonly USING (true);
    CREATE POLICY "admission_releases_ops_readonly_read"
      ON "admission_releases" FOR SELECT TO ops_readonly USING (true);
    CREATE POLICY "admission_target_transitions_ops_readonly_read"
      ON "admission_target_transitions" FOR SELECT TO ops_readonly USING (true);
  END IF;
END $$;
