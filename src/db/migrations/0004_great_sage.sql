ALTER TYPE "public"."calculator_formula_type" ADD VALUE 'minimum_floors';--> statement-breakpoint
ALTER TABLE "university_calculator_configs" ADD COLUMN "min_psychometric" integer;--> statement-breakpoint
ALTER TABLE "university_calculator_configs" ADD COLUMN "min_bagrut" integer;