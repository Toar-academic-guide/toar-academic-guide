-- Dashboard summaries need operational metadata, not source notes or raw review payloads.
GRANT SELECT (id, institution_id, program_id, difficulty, source_url)
ON TABLE public.ingestion_sources TO ops_readonly;
--> statement-breakpoint
GRANT SELECT (id, source_id, status, difficulty, started_at, completed_at, error_text, created_at)
ON TABLE public.ingestion_jobs TO ops_readonly;
--> statement-breakpoint
GRANT SELECT (id, payload_id, admission_requirement_id, target_field, status, created_at, reviewed_at)
ON TABLE public.review_items TO ops_readonly;
--> statement-breakpoint
CREATE POLICY ingestion_sources_ops_readonly_select ON public.ingestion_sources
FOR SELECT TO ops_readonly USING (true);
