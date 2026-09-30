ALTER TABLE "admission_alert_outbox" ADD COLUMN "unsubscribe_token_hash" text;--> statement-breakpoint
ALTER TABLE "admission_alert_outbox" ADD COLUMN "unsubscribe_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admission_alert_outbox" ADD COLUMN "delivery_events" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "admission_alert_outbox_unsubscribe_token_unique" ON "admission_alert_outbox" USING btree ("unsubscribe_token_hash");