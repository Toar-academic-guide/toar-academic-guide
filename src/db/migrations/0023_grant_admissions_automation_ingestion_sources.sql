GRANT INSERT, UPDATE ON TABLE "ingestion_sources" TO admissions_automation;--> statement-breakpoint
CREATE POLICY "ingestion_sources_admissions_automation_insert"
  ON "ingestion_sources" FOR INSERT TO admissions_automation WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "ingestion_sources_admissions_automation_update"
  ON "ingestion_sources" FOR UPDATE TO admissions_automation
  USING (true) WITH CHECK (true);
