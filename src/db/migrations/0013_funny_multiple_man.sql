CREATE TYPE "public"."admission_alert_outbox_status" AS ENUM('pending', 'processing', 'accepted', 'acceptance_unknown', 'retryable', 'failed', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."admission_alert_subscription_status" AS ENUM('active', 'needs_profile_refresh', 'pending_delivery', 'notified', 'cancelled', 'expired', 'delivery_failed');--> statement-breakpoint
CREATE TYPE "public"."admission_alert_transition_work_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "admission_alert_baseline_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"profile_version_id" uuid NOT NULL,
	"profile_hash" text NOT NULL,
	"rule_version" text NOT NULL,
	"verdict" jsonb NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_alert_email_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"opted_in" boolean DEFAULT true NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_alert_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"transition_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "admission_alert_outbox_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" text,
	"provider_accepted_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"acceptance_unknown_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_alert_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"institution_id" text NOT NULL,
	"program_id" text NOT NULL,
	"cycle" text NOT NULL,
	"status" "admission_alert_subscription_status" DEFAULT 'active' NOT NULL,
	"profile_version_id" uuid NOT NULL,
	"profile_hash" text NOT NULL,
	"baseline_rule_version" text NOT NULL,
	"baseline_verdict" jsonb NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"notified_at" timestamp with time zone,
	"refreshed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_alert_transition_work" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transition_id" uuid NOT NULL,
	"status" "admission_alert_transition_work_status" DEFAULT 'pending' NOT NULL,
	"cursor" text,
	"claimed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admission_alert_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"outbox_id" uuid,
	"provider_event_type" text NOT NULL,
	"provider_message_id" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admission_alert_baseline_history" ADD CONSTRAINT "admission_alert_baseline_history_subscription_id_admission_alert_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."admission_alert_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_alert_baseline_history" ADD CONSTRAINT "admission_alert_baseline_history_profile_version_id_bagrut_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."bagrut_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_alert_outbox" ADD CONSTRAINT "admission_alert_outbox_subscription_id_admission_alert_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."admission_alert_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_alert_outbox" ADD CONSTRAINT "admission_alert_outbox_transition_id_admission_target_transitions_id_fk" FOREIGN KEY ("transition_id") REFERENCES "public"."admission_target_transitions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_alert_subscriptions" ADD CONSTRAINT "admission_alert_subscriptions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_alert_subscriptions" ADD CONSTRAINT "admission_alert_subscriptions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_alert_subscriptions" ADD CONSTRAINT "admission_alert_subscriptions_profile_version_id_bagrut_profile_versions_id_fk" FOREIGN KEY ("profile_version_id") REFERENCES "public"."bagrut_profile_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_alert_transition_work" ADD CONSTRAINT "admission_alert_transition_work_transition_id_admission_target_transitions_id_fk" FOREIGN KEY ("transition_id") REFERENCES "public"."admission_target_transitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_alert_webhook_events" ADD CONSTRAINT "admission_alert_webhook_events_outbox_id_admission_alert_outbox_id_fk" FOREIGN KEY ("outbox_id") REFERENCES "public"."admission_alert_outbox"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admission_alert_baseline_history_subscription_recorded_idx" ON "admission_alert_baseline_history" USING btree ("subscription_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_alert_outbox_logical_delivery_unique" ON "admission_alert_outbox" USING btree ("subscription_id","transition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_alert_outbox_idempotency_key_unique" ON "admission_alert_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_alert_outbox_subscription_unique" ON "admission_alert_outbox" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "admission_alert_outbox_queue_idx" ON "admission_alert_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_alert_subscriptions_active_target_unique" ON "admission_alert_subscriptions" USING btree ("user_id","institution_id","program_id","cycle") WHERE "admission_alert_subscriptions"."status" in ('active', 'needs_profile_refresh', 'pending_delivery');--> statement-breakpoint
CREATE INDEX "admission_alert_subscriptions_user_lifecycle_idx" ON "admission_alert_subscriptions" USING btree ("user_id","status","cycle");--> statement-breakpoint
CREATE INDEX "admission_alert_subscriptions_target_lifecycle_idx" ON "admission_alert_subscriptions" USING btree ("institution_id","program_id","cycle","status");--> statement-breakpoint
CREATE UNIQUE INDEX "admission_alert_transition_work_transition_unique" ON "admission_alert_transition_work" USING btree ("transition_id");--> statement-breakpoint
CREATE INDEX "admission_alert_transition_work_status_idx" ON "admission_alert_transition_work" USING btree ("status");
--> statement-breakpoint
ALTER TABLE "admission_alert_baseline_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admission_alert_email_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admission_alert_outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admission_alert_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admission_alert_transition_work" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admission_alert_webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$
DECLARE
  alert_table text;
BEGIN
  FOREACH alert_table IN ARRAY ARRAY[
    'admission_alert_baseline_history',
    'admission_alert_email_preferences',
    'admission_alert_outbox',
    'admission_alert_subscriptions',
    'admission_alert_transition_work',
    'admission_alert_webhook_events'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
      AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM anon, authenticated', alert_table);
      EXECUTE format(
        'CREATE POLICY %I ON %I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        alert_table || '_private_deny_all',
        alert_table
      );
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE %I TO app_runtime', alert_table);
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT TO app_runtime USING (true)',
        alert_table || '_app_runtime_read',
        alert_table
      );
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR INSERT TO app_runtime WITH CHECK (true)',
        alert_table || '_app_runtime_insert',
        alert_table
      );
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR UPDATE TO app_runtime USING (true) WITH CHECK (true)',
        alert_table || '_app_runtime_update',
        alert_table
      );
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ops_readonly') THEN
      EXECUTE format('GRANT SELECT ON TABLE %I TO ops_readonly', alert_table);
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT TO ops_readonly USING (true)',
        alert_table || '_ops_readonly_read',
        alert_table
      );
    END IF;
  END LOOP;
END $$;
