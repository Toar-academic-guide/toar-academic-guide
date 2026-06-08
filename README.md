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
cp .env.example .env.local
```

`DATABASE_URL` is only required when you want the DB-backed catalogue path or seed script. Without it, the app and the catalogue API routes fall back to the existing static catalogue.

## Database workflow

```bash
npm run db:generate
npm run db:seed:dry-run
# npm run db:seed
```

`db:seed:dry-run` validates the current static catalogue and prints row counts without touching a database.

## Backend foundation

- DB code lives under `src/db/`
- server catalogue queries and serializers live under `src/server/catalogue/`
- read-only catalogue routes live under `src/app/api/catalog/`
- client access is isolated behind `src/lib/catalogueClient.ts`

See [docs/backend-data-model.md](/Users/amitmalichi/Desktop/toar-academic-guide/docs/backend-data-model.md:1) for the schema shape and review-flow model.

## Notes

- The first slice keeps `localStorage` as the live user-profile path.
- The catalogue API returns static fallback data when DB env is absent.
- Raw ingestion payloads remain separate from canonical reviewed rows.
