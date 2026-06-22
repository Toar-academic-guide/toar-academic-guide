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

## Access model

The exposed `public` schema is partitioned into three access classes:

- Public-read catalogue tables: `institutions`, `programs`, `program_institutions`, `admission_requirements`, `admission_thresholds`, `source_urls`, and `university_calculator_configs`
- User-owned tables: `user_profiles`, `saved_programs`, and `uploaded_documents`
- Private operational tables: `requirement_versions`, `ingestion_sources`, `ingestion_jobs`, `ingestion_payloads`, and `review_items`

The intended Supabase posture is:

- Public-read catalogue tables: `anon` and `authenticated` may `SELECT`, but may not write
- User-owned tables: only `authenticated` may access rows, and RLS limits that access to `auth.uid() = user_id`
- Private operational tables: no `anon` or `authenticated` access through the exposed schema

This posture secures the exposed Supabase Data API surface. The current app runtime still reads and writes through a direct `postgres.js` connection, so least-privilege runtime DB access remains a separate hardening track.

## Seed strategy

`src/db/seeds/catalogueSeed.ts` converts the current static catalogue into stable seed rows.

- Institutions upsert by `institutions.id`
- Programs upsert by `programs.id`
- Requirement rows use stable IDs of the form `programId:institutionId`
- Threshold rows use stable IDs of the form `programId:institutionId:universityId:kind`

The seed builder validates missing institution mappings before any write path runs.

## Connection posture

The repo currently uses one shared `postgres.js` client in `src/db/client.ts` with:

- `max: 1`
- `prepare: false`

That posture is intentional for the app runtime. Supabase recommends transaction-mode poolers for temporary clients such as serverless or edge functions, and transaction mode does not support prepared statements. `prepare: false` keeps `postgres.js` compatible with that mode, while `max: 1` avoids building a second large app-side pool on top of the database-side pooler for request-scoped traffic.

Use different connection shapes for different execution surfaces:

- Local development: direct local Postgres URL (`localhost:5432` in the checked-in examples)
- Vercel preview/production runtime: pooled connection string for request-driven app traffic
- CI test/build job: no DB connection required
- CI verification job (`npm run db:seed:verify`): operational DB URL only when that job is intentionally enabled

For non-serverless operational workflows such as migrations, `pg_dump`, or other native Postgres admin tasks, prefer a direct connection string when the runner can reach it. That is a separate concern from the app runtime client configuration.

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
