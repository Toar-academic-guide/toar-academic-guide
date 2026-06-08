CREATE TYPE "public"."admission_type" AS ENUM('sekhem', 'requirements');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('psychometric', 'bagrut', 'other');--> statement-breakpoint
CREATE TYPE "public"."geographic_region" AS ENUM('center', 'north', 'south', 'any');--> statement-breakpoint
CREATE TYPE "public"."ingestion_job_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'needs_review');--> statement-breakpoint
CREATE TYPE "public"."program_type" AS ENUM('academic', 'certificate', 'vocational');--> statement-breakpoint
CREATE TYPE "public"."review_item_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('seeded', 'reviewed', 'published');--> statement-breakpoint
CREATE TYPE "public"."source_difficulty" AS ENUM('easy', 'browser_required', 'hard_manual');--> statement-breakpoint
CREATE TYPE "public"."source_url_kind" AS ENUM('program', 'calculator', 'institution');--> statement-breakpoint
CREATE TYPE "public"."storage_provider" AS ENUM('local', 'supabase_storage', 's3', 'other');--> statement-breakpoint
CREATE TYPE "public"."threshold_kind" AS ENUM('sekhem', 'direct_psychometric');--> statement-breakpoint
CREATE TABLE "admission_requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"duration_years" integer,
	"estimated_students_per_year" text,
	"quantitative_min_requirement" integer,
	"english_min_requirement" integer,
	"admission_requirements" text[] DEFAULT '{}' NOT NULL,
	"specific_admission_notes" text[] DEFAULT '{}' NOT NULL,
	"program_description" text,
	"review_status" "review_status" DEFAULT 'seeded' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_thresholds" (
	"id" text PRIMARY KEY NOT NULL,
	"program_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"university_id" text NOT NULL,
	"threshold_kind" "threshold_kind" NOT NULL,
	"threshold_value" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"status" "ingestion_job_status" DEFAULT 'pending' NOT NULL,
	"difficulty" "source_difficulty" NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_payloads" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text,
	"program_id" text,
	"difficulty" "source_difficulty" NOT NULL,
	"source_url" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region" "geographic_region" NOT NULL,
	"domain" text,
	"logo_url" text,
	"program_url" text,
	"calculator_url" text,
	"university_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_institutions" (
	"program_id" text NOT NULL,
	"institution_id" text NOT NULL,
	CONSTRAINT "program_institutions_program_id_institution_id_pk" PRIMARY KEY("program_id","institution_id")
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"institution_name" text NOT NULL,
	"institution_id" text,
	"type" "program_type" NOT NULL,
	"category" text NOT NULL,
	"admission_type" "admission_type" NOT NULL,
	"riasec_r" integer NOT NULL,
	"riasec_i" integer NOT NULL,
	"riasec_a" integer NOT NULL,
	"riasec_s" integer NOT NULL,
	"riasec_e" integer NOT NULL,
	"riasec_c" integer NOT NULL,
	"is_tau_engineering" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requirement_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"admission_requirement_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"duration_years" integer,
	"estimated_students_per_year" text,
	"quantitative_min_requirement" integer,
	"english_min_requirement" integer,
	"admission_requirements" text[] DEFAULT '{}' NOT NULL,
	"specific_admission_notes" text[] DEFAULT '{}' NOT NULL,
	"program_description" text,
	"source_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_items" (
	"id" text PRIMARY KEY NOT NULL,
	"payload_id" text NOT NULL,
	"admission_requirement_id" text,
	"target_field" text NOT NULL,
	"proposed_value" jsonb NOT NULL,
	"status" "review_item_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "saved_programs" (
	"user_id" text NOT NULL,
	"program_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_programs_user_id_program_id_pk" PRIMARY KEY("user_id","program_id")
);
--> statement-breakpoint
CREATE TABLE "source_urls" (
	"id" text PRIMARY KEY NOT NULL,
	"admission_requirement_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"program_id" text NOT NULL,
	"kind" "source_url_kind" NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"kind" "document_kind" NOT NULL,
	"storage_provider" "storage_provider" NOT NULL,
	"storage_path" text NOT NULL,
	"original_file_name" text NOT NULL,
	"mime_type" text,
	"size_bytes" integer,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"geographic_preference" "geographic_region" DEFAULT 'any' NOT NULL,
	"psychometric_overall" integer,
	"psychometric_quantitative" integer,
	"psychometric_verbal" integer,
	"psychometric_english" integer,
	"bagrut_weighted_average" integer,
	"riasec_r" integer,
	"riasec_i" integer,
	"riasec_a" integer,
	"riasec_s" integer,
	"riasec_e" integer,
	"riasec_c" integer,
	"avoidance_tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admission_requirements" ADD CONSTRAINT "admission_requirements_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_requirements" ADD CONSTRAINT "admission_requirements_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_thresholds" ADD CONSTRAINT "admission_thresholds_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_thresholds" ADD CONSTRAINT "admission_thresholds_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_source_id_ingestion_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."ingestion_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_payloads" ADD CONSTRAINT "ingestion_payloads_job_id_ingestion_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ingestion_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_sources" ADD CONSTRAINT "ingestion_sources_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_sources" ADD CONSTRAINT "ingestion_sources_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_institutions" ADD CONSTRAINT "program_institutions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_institutions" ADD CONSTRAINT "program_institutions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requirement_versions" ADD CONSTRAINT "requirement_versions_admission_requirement_id_admission_requirements_id_fk" FOREIGN KEY ("admission_requirement_id") REFERENCES "public"."admission_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_payload_id_ingestion_payloads_id_fk" FOREIGN KEY ("payload_id") REFERENCES "public"."ingestion_payloads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_admission_requirement_id_admission_requirements_id_fk" FOREIGN KEY ("admission_requirement_id") REFERENCES "public"."admission_requirements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_programs" ADD CONSTRAINT "saved_programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_programs" ADD CONSTRAINT "saved_programs_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_urls" ADD CONSTRAINT "source_urls_admission_requirement_id_admission_requirements_id_fk" FOREIGN KEY ("admission_requirement_id") REFERENCES "public"."admission_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_urls" ADD CONSTRAINT "source_urls_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_urls" ADD CONSTRAINT "source_urls_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_documents" ADD CONSTRAINT "uploaded_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admission_thresholds_scope_unique" ON "admission_thresholds" USING btree ("program_id","institution_id","university_id","threshold_kind");