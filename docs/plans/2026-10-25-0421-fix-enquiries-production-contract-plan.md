---
title: Enquiries production contract and timestamp default - Plan
type: fix
date: 2026-10-25
---
# Enquiries production contract and timestamp default - Plan

## Goal Capsule

Harden the read-only production schema preflight and make enquiry timestamps optional at the SQL function boundary.
Execution is backend only, test first, on `codex/contract-0041`.
Deliver one PR with green CI; Jorje alone applies the guarded production packet after merge.

## Product Contract

### Requirements

- R1. Record guarded migrations 0037–0041 separately from the Supabase history ending at 0036. Never schedule historical repair SQL for replay or claim row-data verification from a schema snapshot.
- R2. Missing enquiries table/function, wrong column types, disabled RLS, any policy, or incorrect grants must report drift and prohibit automatic migration.
- R3. `store_enquiry(jsonb)` stores transaction `now()` for null/missing `createdAt`, preserves explicit timestamps, idempotency, SECURITY DEFINER and the empty search path.
- R4. Generate migration 0042 using repository tooling. Provide the named guarded SQL packet with function backup, replacement, rollback and read-only verification. Do not execute against production or preview.

## Planning Contract

- KTD1. Extend the existing guarded postcondition model for R1/R2; inspect exact function identity and effective privileges, including PUBLIC and service_role. Keep 0042 unapplied in the production contract.
- KTD2. Exercise the actual operational snapshot loader against disposable localhost PostgreSQL for R2 and invoke the actual function as app_runtime for R3. Reuse the existing CI database job.
- KTD3. The R4 packet changes the function in place, preserving owner/ACL, and requires explicit operator flags. Rollback restores the captured function definition without touching enquiry rows.

## Implementation Units

### U1. Guarded enquiries security contract

Extend `src/server/admissions/productionMigrationContract.ts`, `src/server/admissions/productionSchemaPreflight.ts`, and `scripts/verify-operational-db.mjs`.
First strengthen `src/server/admissions/productionSchemaPreflight.test.ts` and add loader integration coverage for a missing table/function, disabled RLS, unexpected policy, wrong table/column/function grants, unsafe function configuration, and correct applied schema without invented history.
Use synthetic history only in disposable fixtures; production loading stays read-only.

### U2. Enquiry timestamp fallback

Generate a custom 0042 migration, retaining 0041 unchanged, and add `supabase/packets/2026-10-25-store-enquiry-createdat-default.sql`.
First add disposable database tests for null/missing/explicit timestamps and duplicate requests.
Verify the guarded packet refuses unguarded execution and can apply and roll back locally.

### U3. Verification and delivery

Wire new integration tests into the existing disposable PostgreSQL CI job.
Run focused tests, typecheck, formatting, lint, migration consistency and `npm run guard:pre-pr`.
Simplify only changed implementation, preserve proof tests, skip review pipelines per user direction, then commit, push normally and open the requested PR.

## Verification Contract

Observe expected failures before implementation for U1 and U2.
Run PostgreSQL integration tests only with an explicit localhost URL and integration flag.
Check the operational CLI reports drift through its real snapshot loader; never query or mutate live enquiry PII.
Inspect all checks for the final PR head until terminal, reporting exact failures if external checks cannot succeed.

## Definition of Done

R1–R4 are covered by passing local and CI tests; guard passes; one PR has the requested title and review-skip text.
Report its URL, head SHA and CI status.
Production packet application and live verification remain Jorje’s post-merge responsibility.
