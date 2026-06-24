---
title: Protect internal dashboards with a dedicated readonly operations database URL
date: 2026-06-25
category: docs/solutions/architecture-patterns
module: internal-data-health-dashboard
problem_type: architecture_pattern
component: database
severity: high
applies_when:
  - An internal route needs private operational tables that the normal app runtime should not hold.
  - A Supabase-backed Next.js or Vercel app uses pooled Postgres connections for server-side request traffic.
  - Operator access is restricted through app authentication and an email allowlist rather than a separate admin app.
symptoms:
  - "An internal dashboard appears healthy after an env change, but the runtime still authenticates to Supabase as `postgres`."
  - Reusing `DATABASE_URL` would force the normal product runtime role to see ingestion or review tables.
root_cause: incomplete_setup
resolution_type: environment_setup
related_components:
  - authentication
  - documentation
tags:
  - internal-dashboard
  - supabase
  - vercel
  - least-privilege
  - ops-database
  - data-health
---

# Protect internal dashboards with a dedicated readonly operations database URL

## Context
The internal `/internal/data-health` route needed to read both catalogue tables and private operational tables such as `ingestion_jobs` and `review_items`, but the normal app runtime credential should not be widened just to support that operator view.

Session history showed two traps that are easy to miss. First, looking only at Vercel env presence did not prove which database role the app was actually using. Second, switching to the Supabase shared pooler was necessary but still insufficient when the username remained `postgres` (session history). The working pattern became: verify the effective role from live behavior, then give the internal route its own readonly credential instead of stretching the product runtime role.

## Guidance
Split database credentials by execution surface.

- Keep `DATABASE_URL` for normal product traffic.
- Add `OPS_DATABASE_URL` for internal reporting routes that need private operational tables.
- Back `OPS_DATABASE_URL` with a dedicated readonly role such as `ops_readonly`, not the Supabase `postgres` role.
- Fail closed before any operational query runs: require a valid Supabase user session and match the email against `INTERNAL_ADMIN_EMAILS`.
- Make the operational client pooler-safe for serverless traffic: `prepare: false` and a minimal app-side pool.
- Treat missing or broken ops access as controlled setup state, not a route crash.

The code shape for the env guard is intentionally narrow:

```ts
export function requireOpsDatabaseUrl(): string {
  const value = readRequiredDatabaseUrl('OPS_DATABASE_URL');
  if (isProductionRuntime()) {
    assertProductionDatabaseUrlLeastPrivilege(value);
  }
  return value;
}
```

The route guard should happen before any operational read:

```ts
const authorization = await getInternalAdminAuthorization();

if (!authorization.isAdmin) {
  notFound();
}

const report = await getDataHealthReport();
```

## Why This Matters
An internal dashboard that reads review queues, ingestion jobs, or other private operational state is not just another catalogue read path. If it reuses the product runtime credential, the lowest common denominator becomes "whatever can read everything the dashboard needs," which weakens the runtime posture for the whole app.

The important nuance is that connection shape and privilege level are different controls. A pooled Supabase URL on `aws-...pooler.supabase.com:6543` is the right transport for transient Vercel traffic, but it is not a least-privilege solution by itself. Session-history evidence for this work showed the false positive clearly: the app still appeared in `pg_stat_activity` as `usename = postgres` until the username changed, even after the pooler host and port were corrected.

This split also makes operational rotation safer. You can rotate or revoke `ops_readonly` without changing the normal product runtime credential, and you can keep the readonly grants scoped to exactly the tables the internal surface needs.

## When to Apply
- An internal or staff-only route needs readonly access to operational tables that should stay private from normal runtime traffic.
- The app already has a stable runtime credential, but adding the new internal surface would otherwise force broader grants onto that credential.
- The deployment runs on Vercel or another request-scoped environment where pooled Postgres access is already the expected connection mode.
- You want the route to remain in the main app, guarded by auth and allowlisting, instead of standing up a separate admin service.

## Examples
Before:

```text
DATABASE_URL=postgresql://postgres.<project-ref>@aws-...pooler.supabase.com:6543/postgres
```

That fixes the pooler shape but still authenticates as `postgres`, so the app keeps admin-level database identity.

After:

```text
DATABASE_URL=postgresql://app_runtime.<project-ref>@aws-...pooler.supabase.com:6543/postgres
OPS_DATABASE_URL=postgresql://ops_readonly.<project-ref>@aws-...pooler.supabase.com:6543/postgres
INTERNAL_ADMIN_EMAILS=operator@example.com,owner@example.com
```

The readonly role should receive only the dashboard tables:

```sql
grant usage on schema public to ops_readonly;

grant select on table
  public.institutions,
  public.programs,
  public.program_institutions,
  public.admission_requirements,
  public.admission_thresholds,
  public.source_urls,
  public.university_calculator_configs,
  public.ingestion_sources,
  public.ingestion_jobs,
  public.review_items
to ops_readonly;
```

The implementation for this repo lives in:

- [src/db/opsClient.ts](../../../src/db/opsClient.ts)
- [src/server/internal/adminAuth.ts](../../../src/server/internal/adminAuth.ts)
- [src/server/data-health/queries.ts](../../../src/server/data-health/queries.ts)
- [src/app/internal/data-health/page.tsx](../../../src/app/internal/data-health/page.tsx)

## Related
- [Internal data health dashboard setup](../../../docs/internal-data-health-dashboard.md)
- [Data health dashboard implementation plan](../../../docs/plans/2026-06-24-002-feat-internal-data-health-dashboard-plan.md)
- [Restore soldier catalogue after remote schema and calculator-config drift](../database-issues/restore-soldier-catalogue-after-remote-schema-and-config-drift.md)
- [Pull request 34](https://github.com/Toar-academic-guide/toar-academic-guide/pull/34)
