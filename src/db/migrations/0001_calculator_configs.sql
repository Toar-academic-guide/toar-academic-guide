CREATE TYPE "public"."calculator_formula_type" AS ENUM('weighted_scaled', 'technion_linear');--> statement-breakpoint
CREATE TABLE "university_calculator_configs" (
	"institution_id" text PRIMARY KEY NOT NULL,
	"formula_type" "calculator_formula_type" NOT NULL,
	"psy_weight" real,
	"bagrut_weight" real,
	"scale_description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "university_calculator_configs" ADD CONSTRAINT "university_calculator_configs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public"."university_calculator_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
