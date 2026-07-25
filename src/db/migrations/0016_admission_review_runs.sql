CREATE TYPE "public"."admission_review_run_status" AS ENUM('prepared', 'reviewable', 'no_changes', 'validation_failed');--> statement-breakpoint
CREATE TYPE "public"."admission_review_slack_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "admission_review_runs" (
	"run_key" text PRIMARY KEY NOT NULL,
	"source_digest" text NOT NULL,
	"status" "admission_review_run_status" DEFAULT 'prepared' NOT NULL,
	"candidate_count" integer DEFAULT 0 NOT NULL,
	"exclusion_count" integer DEFAULT 0 NOT NULL,
	"pull_request_number" integer,
	"pull_request_url" text,
	"slack_status" "admission_review_slack_status" DEFAULT 'pending' NOT NULL,
	"slack_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "admission_review_runs_status_idx" ON "admission_review_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "admission_review_runs_slack_status_idx" ON "admission_review_runs" USING btree ("slack_status");--> statement-breakpoint
ALTER TABLE "admission_review_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
    AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "admission_review_runs" FROM anon, authenticated;

    CREATE POLICY "admission_review_runs_private_deny_all"
      ON "admission_review_runs" AS RESTRICTIVE FOR ALL TO anon, authenticated
      USING (false) WITH CHECK (false);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE "admission_review_runs" TO app_runtime;

    CREATE POLICY "admission_review_runs_app_runtime_read"
      ON "admission_review_runs" FOR SELECT TO app_runtime USING (true);
    CREATE POLICY "admission_review_runs_app_runtime_insert"
      ON "admission_review_runs" FOR INSERT TO app_runtime WITH CHECK (true);
    CREATE POLICY "admission_review_runs_app_runtime_update"
      ON "admission_review_runs" FOR UPDATE TO app_runtime USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ops_readonly') THEN
    GRANT SELECT ON TABLE "admission_review_runs" TO ops_readonly;

    CREATE POLICY "admission_review_runs_ops_readonly_read"
      ON "admission_review_runs" FOR SELECT TO ops_readonly USING (true);
  END IF;
END $$;
