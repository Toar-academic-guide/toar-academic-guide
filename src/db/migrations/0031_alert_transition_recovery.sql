ALTER TABLE "admission_alert_transition_work" ADD COLUMN "claim_token" uuid;--> statement-breakpoint
ALTER TABLE "admission_alert_transition_work" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admission_alert_transition_work" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admission_alert_transition_work" ADD COLUMN "retry_state" jsonb DEFAULT '{}'::jsonb NOT NULL;