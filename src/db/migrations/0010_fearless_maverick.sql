ALTER TYPE "public"."admission_fact_field" ADD VALUE 'math_grade' BEFORE 'english_units';--> statement-breakpoint
ALTER TYPE "public"."admission_fact_field" ADD VALUE 'english_grade' BEFORE 'required_subject';--> statement-breakpoint
ALTER TYPE "public"."admission_fact_field" ADD VALUE 'physics_units' BEFORE 'required_subject';--> statement-breakpoint
ALTER TYPE "public"."admission_fact_field" ADD VALUE 'physics_grade' BEFORE 'required_subject';--> statement-breakpoint
ALTER TYPE "public"."admission_fact_field" ADD VALUE 'cs_units' BEFORE 'required_subject';--> statement-breakpoint
ALTER TYPE "public"."admission_fact_field" ADD VALUE 'cs_grade' BEFORE 'required_subject';--> statement-breakpoint
CREATE TABLE "bagrut_profile_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"schema_version" integer NOT NULL,
	"content_hash" text NOT NULL,
	"sector" text NOT NULL,
	"subjects" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "bagrut_profile_version_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "bagrut_profile_versions_user_hash_unique" ON "bagrut_profile_versions" USING btree ("user_id","content_hash");--> statement-breakpoint
CREATE INDEX "bagrut_profile_versions_user_created_at_idx" ON "bagrut_profile_versions" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_bagrut_profile_version_id_bagrut_profile_versions_id_fk" FOREIGN KEY ("bagrut_profile_version_id") REFERENCES "public"."bagrut_profile_versions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bagrut_profile_versions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "bagrut_profile_versions" FROM anon, authenticated;
--> statement-breakpoint
CREATE POLICY "bagrut_profile_versions_private_deny_all"
  ON "bagrut_profile_versions"
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    GRANT SELECT, INSERT ON TABLE "bagrut_profile_versions" TO app_runtime;
  END IF;
END $$;
