GRANT INSERT ON TABLE "ingestion_jobs", "ingestion_payloads", "review_items" TO admissions_automation;--> statement-breakpoint
CREATE POLICY "ingestion_jobs_admissions_automation_insert"
  ON "ingestion_jobs" FOR INSERT TO admissions_automation WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "ingestion_payloads_admissions_automation_insert"
  ON "ingestion_payloads" FOR INSERT TO admissions_automation WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "review_items_admissions_automation_insert"
  ON "review_items" FOR INSERT TO admissions_automation WITH CHECK (true);
