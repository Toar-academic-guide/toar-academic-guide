GRANT SELECT ON TABLE
  "admission_alternative_paths",
  "admission_facts",
  "admissions_source_candidates",
  "source_freshness_checks",
  "source_freshness_states"
TO app_runtime;--> statement-breakpoint
GRANT SELECT ON TABLE
  "admission_alternative_paths",
  "admission_facts",
  "admissions_source_candidates",
  "source_freshness_checks",
  "source_freshness_states"
TO ops_readonly;
