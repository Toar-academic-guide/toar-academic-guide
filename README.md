# Toar Academic Guide

## Local commands

```bash
npm install
npm test
npm run build
npm run dev
```

The test suite covers the current recommendation, bucket-list, and admission-calculation behavior before the catalogue moves behind the backend boundary.

## Environment

```bash
cp .env.local.example .env.local
```

`DATABASE_URL` is required for DB-backed catalogue and authenticated profile persistence.

Connection posture depends on where the code runs:

- Local development uses a direct Postgres URL by default. The checked-in examples point at `localhost:5432`, and local Drizzle workflows are long-lived enough that they do not need a server-side pooler.
- The Vercel app runtime should use a Supabase transaction-pooling connection string rather than a direct database host. The catalogue routes are `force-dynamic`, the authenticated user routes run per request, and the app uses `postgres(..., { max: 1, prepare: false })`, which is compatible with transaction pooling for transient serverless traffic.
- The GitHub Actions `test-build-and-dry-run` job does not need a database at all. The optional `db-seed-verify` job is the only CI path that reads `DATABASE_URL`; treat that secret as an operational verification connection, not as app-runtime traffic.

`prepare: false` is deliberate. Supabase documents transaction-mode poolers as the right fit for serverless or edge traffic and notes that transaction mode does not support prepared statements, while `postgres.js` documents `prepare: false` as the compatibility switch for transaction-pooled connections. The app keeps `max: 1` because the shared singleton client only needs a minimal app-side pool on top of a server-side pooler for request-scoped runtime traffic.

`CATALOGUE_SOURCE_MODE` controls catalogue runtime behavior:

- `auto`: use the DB when available and healthy, but allow static fallback only in non-production environments
- `database`: require a seeded, healthy DB-backed catalogue and fail closed if it is unavailable
- `static`: always serve the static catalogue

Production should be configured with `CATALOGUE_SOURCE_MODE=database`. Preview can run in `auto` or `database`, but it only exercises the DB-backed path when `DATABASE_URL` is configured with the intended pooled runtime URL. If a preview deployment is meant to validate the DB cutover, it also needs `DATABASE_URL`; otherwise `auto` mode will fall back to static data and the preview will not exercise the database-backed path.

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` enable sign-up, sign-in, session refresh, and authenticated user persistence. The runtime still accepts `NEXT_PUBLIC_SUPABASE_ANON_KEY` as a temporary fallback during migration. Without the public Supabase vars, the app still supports anonymous browsing and local draft persistence.

`NEXT_PUBLIC_APP_URL` should point at the deployed app URL used in Supabase email confirmations. In local development, the signup flow falls back to the current browser origin if this env var is absent.

Supabase Auth also needs the deployed app URL allow-listed under redirect URL configuration before email confirmation links will return to the app correctly.

## Database workflow

```bash
npm run db:generate
npm run db:seed:dry-run
npm run db:seed:verify
# npm run db:seed
```

`db:seed:dry-run` validates the current static catalogue and prints row counts without touching a database.
`db:seed:verify` compares the target database snapshot to the current git-tracked seed payload and exits non-zero when programmes, programme links, threshold rows, or calculator configs drift.
`db:seed` now reseeds managed catalogue rows and immediately runs the same verification pass, so a successful seed run proves convergence instead of only reporting row counts.

Tracked DB access policy now follows three classes:

- catalogue tables are public-read and no-public-write through the exposed Supabase schema
- user-owned tables are limited to the owning authenticated user by RLS
- ingestion, review, and historical operational tables are private to privileged runtime or admin paths

The current Next.js runtime still uses a direct `postgres.js` connection for server-side DB access. That path is separate from the exposed Supabase Data API and remains a follow-up least-privilege hardening concern.

## Catalogue cutover

1. Apply the tracked migrations to the target database.
2. Run `npm run db:seed:verify` first if you are diagnosing a failing environment; inspect the reported mismatches before changing source mode.
3. Seed the catalogue from git-tracked data with `npm run db:seed`.
4. Re-run `npm run db:seed:verify` until it reports a clean match.
5. Verify `/api/catalog/programs` and `/api/catalog/institutions` return `200` with `meta.catalogueSource` set to `database`.
6. Set `CATALOGUE_SOURCE_MODE=database` in production only after readiness passes.
7. If the seeded DB is unhealthy after cutover, fix the reported seed drift first; only use `static` or `auto` as an intentional rollback, not as the default repair path.

## Backend foundation

- DB code lives under `src/db/`
- server catalogue queries and serializers live under `src/server/catalogue/`
- read-only catalogue routes live under `src/app/api/catalog/`
- client access is isolated behind `src/lib/catalogueClient.ts`

See [docs/backend-data-model.md](/Users/amitmalichi/Desktop/toar-academic-guide/docs/backend-data-model.md:1) for the schema shape and review-flow model.

## Notes

- `localStorage` acts as an anonymous draft store and first-sign-in migration source. Authenticated profile snapshots are fetched from the server at runtime rather than cached back into the browser draft key.
- Signup stores first and last name in the app-owned `user_profiles` row, with Supabase signup metadata used only as a handoff during account creation.
- Authenticated profile data and saved programs are persisted through Supabase-backed APIs.
- The current "clear data" control is device-scoped only: it removes browser draft data on the current device, but it does not delete account-level profile rows, saved programs, or uploaded files.
- Uploaded document snapshots exposed to the browser use generic display labels rather than raw filenames.
- The catalogue API owns source selection; client code no longer falls back to static catalogue data on its own.
- Raw ingestion payloads remain separate from canonical reviewed rows.
