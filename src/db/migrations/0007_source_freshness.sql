CREATE TYPE "public"."freshness_capability" AS ENUM('blocked', 'decision_capable', 'score_only');--> statement-breakpoint
CREATE TYPE "public"."freshness_source_class" AS ENUM('api_static_json', 'browser_required', 'official_html', 'pdf_text', 'score_only_calculator');--> statement-breakpoint
CREATE TYPE "public"."source_freshness_status" AS ENUM('blocked', 'changed_needs_review', 'failed', 'fresh');--> statement-breakpoint
CREATE TABLE "source_freshness_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"source_class" "freshness_source_class" NOT NULL,
	"capability" "freshness_capability" NOT NULL,
	"status" "source_freshness_status" NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"successful" boolean NOT NULL,
	"failure_reason" text,
	"blocked_reason" text,
	"raw_fingerprint" text,
	"normalized_fingerprint" text,
	"normalized_decision_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"review_worthy" boolean DEFAULT false NOT NULL,
	"review_item_id" text,
	"next_action" text
);
--> statement-breakpoint
CREATE TABLE "source_freshness_states" (
	"source_id" text PRIMARY KEY NOT NULL,
	"source_class" "freshness_source_class" NOT NULL,
	"capability" "freshness_capability" NOT NULL,
	"status" "source_freshness_status" NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_successful_check_at" timestamp with time zone,
	"last_changed_at" timestamp with time zone,
	"latest_failure_reason" text,
	"blocked_reason" text,
	"raw_fingerprint" text,
	"normalized_fingerprint" text,
	"normalized_decision_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"latest_review_item_id" text,
	"next_action" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "source_freshness_checks" ADD CONSTRAINT "source_freshness_checks_source_id_ingestion_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."ingestion_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_freshness_checks" ADD CONSTRAINT "source_freshness_checks_review_item_id_review_items_id_fk" FOREIGN KEY ("review_item_id") REFERENCES "public"."review_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_freshness_states" ADD CONSTRAINT "source_freshness_states_source_id_ingestion_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."ingestion_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_freshness_states" ADD CONSTRAINT "source_freshness_states_latest_review_item_id_review_items_id_fk" FOREIGN KEY ("latest_review_item_id") REFERENCES "public"."review_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "source_freshness_checks_source_checked_at_idx" ON "source_freshness_checks" USING btree ("source_id","checked_at");--> statement-breakpoint
CREATE INDEX "source_freshness_checks_status_idx" ON "source_freshness_checks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "source_freshness_checks_review_item_idx" ON "source_freshness_checks" USING btree ("review_item_id");--> statement-breakpoint
CREATE INDEX "source_freshness_states_status_idx" ON "source_freshness_states" USING btree ("status");--> statement-breakpoint
CREATE INDEX "source_freshness_states_latest_review_item_idx" ON "source_freshness_states" USING btree ("latest_review_item_id");--> statement-breakpoint
ALTER TABLE "source_freshness_checks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "source_freshness_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    REVOKE ALL ON TABLE
      "source_freshness_checks",
      "source_freshness_states"
    FROM anon, authenticated;

    DROP POLICY IF EXISTS "source_freshness_checks_private_deny_all" ON "source_freshness_checks";
    DROP POLICY IF EXISTS "source_freshness_states_private_deny_all" ON "source_freshness_states";

    CREATE POLICY "source_freshness_checks_private_deny_all"
      ON "source_freshness_checks"
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);

    CREATE POLICY "source_freshness_states_private_deny_all"
      ON "source_freshness_states"
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;
