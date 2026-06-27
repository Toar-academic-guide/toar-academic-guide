# Internal Data Health Dashboard

`/internal/data-health` is a read-only operator dashboard for catalogue readiness, source coverage, source freshness, ingestion pipeline health, and review queue backlog.

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

## Review item workspace

The dashboard links the oldest pending review item to `/internal/reviews/[reviewItemId]`.
That route is a separate operator workspace, not part of the read-only dashboard surface.

The review workspace uses the same Supabase Auth plus `INTERNAL_ADMIN_EMAILS` allowlist. Unauthorized requests fail closed before the review item detail query runs, and unauthorized action calls return without invoking the review resolution service.

For v1, the only publishable approval target is `sourceFreshness`:

- Approve: validates that the item is still pending, confirms the proposed value is a supported source-freshness payload, confirms `source_freshness_states.latest_review_item_id` still points at the item, then clears that review pointer and marks the source freshness state `fresh` in the same server-owned transaction that marks the review item approved.
- Reject: marks the review item rejected without mutating source freshness state or canonical catalogue tables.
- Unsupported target fields: can be inspected and rejected, but approval fails closed with an unsupported-target result.
- Stale review items: if the current source freshness state no longer points at the item, approval fails closed and leaves the item pending for operator re-check.

The review detail page renders bounded normalized evidence, source provenance, status, payload id, reproduced fields, limitations, and next action. It does not render raw ingestion payload JSON or full proposed-value dumps.

## Current limitations

- The dashboard is read-only.
- It links to the separate review workspace for pending review items, but it does not approve or reject them inline.
- It does not trigger scraper jobs.
- It does not display raw ingestion payloads or full proposed review values.
- Browser-required sources remain blocked until a separate Hermes/VPS browser lane exists.
