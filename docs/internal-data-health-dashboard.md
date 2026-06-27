# Internal Data Health Dashboard

`/internal/data-health` is a read-only operator dashboard for catalogue readiness, source coverage, public admissions capability, source freshness, ingestion pipeline health, and review queue backlog.

## Access

The route is not linked from public navigation. It still must be treated as reachable by URL, so access is enforced in the app:

- The user must be signed in through Supabase Auth.
- The user's email must be listed in `INTERNAL_ADMIN_EMAILS`.
- Unauthorized requests fail closed before operational database queries run.

`INTERNAL_ADMIN_EMAILS` is a comma-separated allowlist:

```bash
INTERNAL_ADMIN_EMAILS=operator@example.com,owner@example.com
```

Email matching is case-insensitive and ignores surrounding whitespace.

## Operational database access

The dashboard uses `OPS_DATABASE_URL`, not `DATABASE_URL`.

`DATABASE_URL` remains the normal app runtime credential for product traffic. `OPS_DATABASE_URL` is for internal reporting over canonical catalogue tables and private operational tables such as `ingestion_jobs` and `review_items`.

Use a dedicated read-only Supabase database role, preferably named `ops_readonly`. Do not point `OPS_DATABASE_URL` at the Supabase `postgres` role in production; the app rejects that posture for Supabase hosts.

The intended grants are read-only:

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
  public.review_items,
  public.source_freshness_states,
  public.source_freshness_checks
to ops_readonly;
```

Adapt the exact role creation and password rotation workflow to the target Supabase project. Do not store the password in the repo.

## Setup checklist

1. Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured.
2. Add the operator emails to `INTERNAL_ADMIN_EMAILS`.
3. Create or verify a read-only operational database role.
4. Set `OPS_DATABASE_URL` to that role's pooled Supabase connection string.
5. Keep Vercel deployment protection enabled for preview or production deployments when practical.

If `OPS_DATABASE_URL` is missing, allowlisted admins see a controlled setup state instead of raw database errors.

## Source freshness statuses

The source freshness section reads persisted machine-check state and derives time-based status at dashboard read time:

- `fresh`: the latest successful check is inside the freshness SLA window.
- `changed_needs_review`: normalized decision-bearing output changed and needs human review before canonical admissions data changes.
- `failed`: the checker could not fetch or parse the source; this is source-level state, not a dashboard failure.
- `stale`: no successful check has happened inside the SLA plus grace window.
- `blocked`: the source is known to require a browser, cookies, anti-bot state, or another lane unavailable to the GitHub Action checker.
- `never_checked`: an ingestion source exists but has no persisted freshness state yet.

The dashboard intentionally displays capped source rows and review item ids, not raw normalized payloads or proposed review values.

## Public admissions capability

The public admissions capability section summarizes every linked programme-institution pair the landing-page evaluator can return:

- `exact`: verified exact official-source mapping is healthy enough for a firm public decision.
- `estimated`: reviewed local formula plus threshold can guide the user, but not as an official decision.
- `score_only`: an official source can produce only a score, so the public result stays estimate-only.
- `needs_input`: the exact source is mapped, but the current public payload is missing required inputs.
- `blocked`: the source is known to require a browser/manual lane that the public evaluator cannot use directly.
- `stale`: the exact source exists but freshness state is failed or outside the SLA window.
- `missing`: the linked pair has no reviewed source or formula coverage.
- `unsupported`: the pair is linked but not mapped for supported public evaluation yet.

This section is intended to answer whether the landing calculator can make a trustworthy result for a given pair before users discover the gap themselves.

## Current limitations

- The dashboard is read-only.
- It does not approve or reject review items.
- It does not trigger scraper jobs.
- It does not display raw ingestion payloads or full proposed review values.
- Browser-required sources remain blocked until a separate Hermes/VPS browser lane exists.
