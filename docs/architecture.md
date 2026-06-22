# Architecture Overview

## Summary

Toar is a Next.js App Router application that keeps product UI, backend-for-frontend APIs, auth session refresh, and data access inside one codebase. The app serves a read-only programme catalogue through API routes and persists authenticated user profile data, saved programmes, and uploaded documents through Supabase-backed APIs.

## System Diagram

```mermaid
flowchart TB
  UI[Client UI and hooks\nsrc/app/page.tsx + components]
  ProfileHook[src/hooks/useUserProfile.ts]
  Proxy[src/proxy.ts]
  CatalogApi[/api/catalog/*]
  UserApi[/api/profile\n/api/saved-programs\n/api/documents]
  CatalogServer[src/server/catalogue/*]
  UserServer[src/server/user/*]
  StaticData[src/data/*]
  Seed[scripts/seed-catalogue.mjs]
  DB[(Postgres / Supabase)]
  Auth[Supabase Auth]
  CI[GitHub Actions CI]
  Deploy[Vercel]

  UI --> ProfileHook
  UI --> CatalogApi
  ProfileHook --> UserApi
  Proxy --> Auth
  CatalogApi --> CatalogServer
  UserApi --> UserServer
  CatalogServer --> DB
  UserServer --> DB
  StaticData --> Seed
  Seed --> DB
  CI --> Deploy
```

## Runtime Boundaries

- `src/app/` contains the App Router entrypoints, page composition, and route handlers.
- `src/components/` holds user-facing UI, while `src/hooks/useUserProfile.ts` owns the client-side profile state machine.
- `src/proxy.ts` performs request-time Supabase session refresh and blocks `/dev` in production, but it is not the only authorization boundary.
- `src/app/api/catalog/*` exposes read-only catalogue endpoints.
- `src/app/api/profile/route.ts`, `src/app/api/saved-programs/route.ts`, and `src/app/api/documents/route.ts` are authenticated user-data routes.
- `src/server/catalogue/*` and `src/server/user/*` hold server-side query and serialization logic so route handlers stay thin.
- `src/db/` contains schema, migrations, and seed tooling for the database-backed catalogue and user-owned tables.

## Catalogue Modes

Catalogue reads are controlled by `CATALOGUE_SOURCE_MODE` and resolved in `src/server/catalogue/queries.ts`.

- `static`: always serve the in-repo catalogue data.
- `auto`: try the database first, then allow static fallback outside production when the DB is unavailable or not ready.
- `database`: require the seeded database catalogue and fail closed if readiness checks do not pass.

The client does not choose between static and database sources directly. It always goes through `/api/catalog/programs` and `/api/catalog/institutions`, and those routes return metadata about the active catalogue source.

## User Data and Auth

- Supabase Auth is the identity boundary. `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, and `src/context/AuthContext.tsx` wire browser and server auth usage.
- `src/proxy.ts` refreshes the Supabase session cookies on matched requests.
- `src/hooks/useUserProfile.ts` still uses `localStorage` as an anonymous draft store and first-sign-in migration source.
- Authenticated persistence is the durable source of truth for:
  - `user_profiles`
  - `saved_programs`
  - `uploaded_documents`
- Profile and saved-program changes flow through the authenticated API routes and then into `src/server/user/profile.ts`.

## Data Quality and Provenance

- Canonical catalogue rows live in relational tables such as `institutions`, `programs`, `program_institutions`, `admission_requirements`, `admission_thresholds`, `source_urls`, and `requirement_versions`.
- Raw acquisition and review-state tables such as `ingestion_sources`, `ingestion_jobs`, `ingestion_payloads`, and `review_items` are kept separate from canonical data.
- Seeded catalogue readiness is stricter than simple connectivity. The database path is considered ready only when required institutions, programmes, links, thresholds, and calculator configs are present.
- `scripts/seed-catalogue.mjs` and `src/db/seeds/catalogueSeed.ts` are the bridge from the current git-tracked static catalogue to stable database rows.

## Deployment and CI

- The app is designed to run on Vercel with environment variables for `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_URL`.
- Production should run with `CATALOGUE_SOURCE_MODE=database` only after seed and readiness verification pass.
- `.github/workflows/ci.yml` currently enforces:
  - `npm test`
  - `npm run db:seed:dry-run`
  - `npm run build`
- The same workflow also runs `npm run db:seed:verify` on `main` or manual dispatch when `DATABASE_URL` is configured in GitHub Actions secrets.

## Risks

- The route layer currently duplicates auth and error helpers across multiple authenticated endpoints, which makes drift likely as new APIs are added.
- Catalogue readiness depends on both schema shape and complete seed content. A reachable DB is not enough for safe cutover.
- `localStorage` remains part of the user-profile lifecycle, so client draft behavior and first-sign-in migration behavior still need to stay aligned with server persistence.
- Proxy-based session refresh improves auth consistency, but authorization must still be enforced inside each authenticated route and server operation.

## Open Decisions

- Whether all authenticated routes should adopt one shared route-layer auth/error helper surface, including `src/app/api/documents/route.ts`, in a follow-up pass.
- Whether the current anonymous-draft-plus-authenticated-sync model should remain long term or eventually shrink the role of `localStorage` further.
- Whether ingestion/review workflows should stay internal-only for now or gain dedicated operational documentation once those tables become active in production.
