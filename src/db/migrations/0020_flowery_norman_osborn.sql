ALTER TABLE "source_freshness_checks" ADD COLUMN "proof_level" text;--> statement-breakpoint
ALTER TABLE "source_freshness_checks" ADD COLUMN "decision_provenance" text;--> statement-breakpoint
ALTER TABLE "source_freshness_checks" ADD COLUMN "reviewed_source_fingerprint" text;--> statement-breakpoint
ALTER TABLE "source_freshness_checks" ADD COLUMN "exact_qualified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "source_freshness_states" ADD COLUMN "proof_level" text;--> statement-breakpoint
ALTER TABLE "source_freshness_states" ADD COLUMN "decision_provenance" text;--> statement-breakpoint
ALTER TABLE "source_freshness_states" ADD COLUMN "reviewed_source_fingerprint" text;--> statement-breakpoint
ALTER TABLE "source_freshness_states" ADD COLUMN "last_exact_check_at" timestamp with time zone;