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

`user_profiles` is the durable source for app-owned identity fields such as `first_name` and `last_name`. Supabase signup metadata can carry those values at account creation time, but the product should continue to read and write names from the app profile model.

## Seed strategy

`src/db/seeds/catalogueSeed.ts` converts the current static catalogue into stable seed rows.

- Institutions upsert by `institutions.id`
- Programs upsert by `programs.id`
- Requirement rows use stable IDs of the form `programId:institutionId`
- Threshold rows use stable IDs of the form `programId:institutionId:universityId:kind`

The seed builder validates missing institution mappings before any write path runs.

## Production catalogue cutover

The runtime catalogue now has three explicit source modes:

- `database`: require a seeded, healthy DB-backed catalogue and fail closed if it is unavailable
- `static`: always serve the in-repo static catalogue
- `auto`: use the DB when it is configured and healthy, but allow static fallback only outside production

Readiness is stricter than connectivity. Before production cutover, the seeded DB must contain:

- institution rows
- program rows
- program-to-institution links
- thresholds for sekhem-tracked programs
- calculator configs for every calculator-backed institution used by the runtime

Production rollout should stay migration-first:

1. Apply tracked SQL migrations.
2. Seed via `npm run db:seed`.
3. Verify the catalogue API reports `meta.catalogueSource = database`.
4. Switch production to `CATALOGUE_SOURCE_MODE=database`.

Rollback should be a configuration change back to `static` or `auto`, not an emergency schema edit in the Supabase dashboard.
