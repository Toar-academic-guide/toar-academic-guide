CREATE TYPE "public"."admission_comparison" AS ENUM('gte', 'lte', 'eq', 'present', 'not_required', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."admission_fact_field" AS ENUM('sekhem', 'psychometric', 'bagrut_average', 'psychometric_quantitative', 'psychometric_english', 'math_units', 'english_units', 'required_subject', 'interview', 'exam', 'committee', 'portfolio', 'document_check', 'prior_studies', 'open_admission', 'other');--> statement-breakpoint
CREATE TYPE "public"."admission_fact_kind" AS ENUM('numeric_gate', 'manual_gate', 'open_admission', 'explicit_absence', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."admission_fact_unit" AS ENUM('points', 'average', 'units', 'boolean', 'text');--> statement-breakpoint
CREATE TYPE "public"."admissions_confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."admissions_source_origin" AS ENUM('board_column', 'item_update', 'catalogue_url', 'manual');--> statement-breakpoint
CREATE TYPE "public"."admissions_source_specificity" AS ENUM('program_admissions', 'program', 'calculator', 'institution_admissions', 'institution', 'generic');--> statement-breakpoint
CREATE TYPE "public"."alternative_path_kind" AS ENUM('prep_program', 'transfer_path', 'prior_studies', 'exceptions_committee', 'special_population', 'similar_program', 'lower_threshold_institution', 'online_or_abroad', 'manual_check');--> statement-breakpoint
CREATE TABLE "admission_alternative_paths" (
	"id" text PRIMARY KEY NOT NULL,
	"admission_requirement_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"program_id" text NOT NULL,
	"source_candidate_id" text,
	"kind" "alternative_path_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"url" text,
	"priority" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_facts" (
	"id" text PRIMARY KEY NOT NULL,
	"admission_requirement_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"program_id" text NOT NULL,
	"source_candidate_id" text,
	"kind" "admission_fact_kind" NOT NULL,
	"field" "admission_fact_field" NOT NULL,
	"comparison" "admission_comparison" NOT NULL,
	"value_number" real,
	"value_text" text,
	"unit" "admission_fact_unit" NOT NULL,
	"description" text NOT NULL,
	"confidence" "admissions_confidence" NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admissions_source_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"admission_requirement_id" text NOT NULL,
	"institution_id" text NOT NULL,
	"program_id" text NOT NULL,
	"origin" "admissions_source_origin" NOT NULL,
	"specificity" "admissions_source_specificity" NOT NULL,
	"confidence" "admissions_confidence" NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admission_alternative_paths" ADD CONSTRAINT "admission_alternative_paths_admission_requirement_id_admission_requirements_id_fk" FOREIGN KEY ("admission_requirement_id") REFERENCES "public"."admission_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_alternative_paths" ADD CONSTRAINT "admission_alternative_paths_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_alternative_paths" ADD CONSTRAINT "admission_alternative_paths_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_alternative_paths" ADD CONSTRAINT "admission_alternative_paths_source_candidate_id_admissions_source_candidates_id_fk" FOREIGN KEY ("source_candidate_id") REFERENCES "public"."admissions_source_candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_facts" ADD CONSTRAINT "admission_facts_admission_requirement_id_admission_requirements_id_fk" FOREIGN KEY ("admission_requirement_id") REFERENCES "public"."admission_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_facts" ADD CONSTRAINT "admission_facts_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_facts" ADD CONSTRAINT "admission_facts_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_facts" ADD CONSTRAINT "admission_facts_source_candidate_id_admissions_source_candidates_id_fk" FOREIGN KEY ("source_candidate_id") REFERENCES "public"."admissions_source_candidates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions_source_candidates" ADD CONSTRAINT "admissions_source_candidates_admission_requirement_id_admission_requirements_id_fk" FOREIGN KEY ("admission_requirement_id") REFERENCES "public"."admission_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions_source_candidates" ADD CONSTRAINT "admissions_source_candidates_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions_source_candidates" ADD CONSTRAINT "admissions_source_candidates_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;