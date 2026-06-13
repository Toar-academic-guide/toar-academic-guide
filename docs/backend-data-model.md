# Backend Data Model

## Canonical vs raw data

The backend foundation separates reviewed catalogue data from raw ingestion output.

- `institutions`, `programs`, `program_institutions`, `admission_requirements`, `admission_thresholds`, `source_urls`, and `requirement_versions` are the canonical catalogue.
- `ingestion_sources`, `ingestion_jobs`, `ingestion_payloads`, and `review_items` hold acquisition state and proposed changes before publication.

Canonical requirement rows stay traceable through `source_urls`, and historical reviewed values stay in `requirement_versions`.

## User persistence

Authenticated user persistence now uses Supabase Auth identities as the ownership boundary:

- `user_profiles`
- `saved_programs`
- `uploaded_documents`

`localStorage` remains as a client-side draft and migration source, but authenticated server persistence is the durable source of truth for profile data and saved programs. User-owned tables are expected to be protected by server-side user checks plus Supabase row-level security policies when running against a Supabase-backed database.

## Seed strategy

`src/db/seeds/catalogueSeed.ts` converts the current static catalogue into stable seed rows.

- Institutions upsert by `institutions.id`
- Programs upsert by `programs.id`
- Requirement rows use stable IDs of the form `programId:institutionId`
- Threshold rows use stable IDs of the form `programId:institutionId:universityId:kind`

The seed builder validates missing institution mappings before any write path runs.
