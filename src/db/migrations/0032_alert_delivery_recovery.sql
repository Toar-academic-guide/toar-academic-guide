ALTER TABLE "admission_alert_outbox" ADD COLUMN "claim_token" uuid;--> statement-breakpoint
ALTER TABLE "admission_alert_outbox" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admission_alert_outbox" ADD COLUMN "first_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admission_alert_outbox" ADD COLUMN "submission_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admission_alert_outbox" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "admission_alert_outbox" ADD COLUMN "mail_payload" jsonb;