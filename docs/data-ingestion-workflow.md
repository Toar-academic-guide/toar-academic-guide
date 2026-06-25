# Data Ingestion Workflow

## Purpose

This document defines the intended scrape-to-publish workflow for Toar catalogue updates. It uses the current ingestion and review tables so scraper implementation can start from an agreed process instead of re-deciding the handoff each time.

## Flow

1. Register or update the source.
   Record the official page, calculator endpoint, or document origin in `ingestion_sources`.
   The source record should identify the target institution and, when applicable, the target program.

2. Start an ingestion job.
   Create an `ingestion_jobs` row for the scrape or collection run.
   Use job status to distinguish pending, running, succeeded, failed, and needs-review states.

3. Capture raw payloads.
   Persist the fetched raw response, parsed fragments, or extracted structured payload in `ingestion_payloads`.
   This is the audit trail for what the scraper saw before any human review or canonical write.

4. Normalize scraped output into review candidates.
   Transform raw payloads into proposed catalogue changes such as admission requirements, threshold values, calculator links, or program notes.
   Each proposed change should become one `review_items` row tied back to the source payload.

5. Hand off to human review.
   Reviewers decide whether each proposed change is approved, rejected, or left pending.
   Scraper output stops here. No scraper should write directly into canonical catalogue tables without a review decision.

6. Publish approved changes into canonical tables.
   Approved review items update the canonical catalogue tables:
   `institutions`, `programs`, `program_institutions`, `admission_requirements`, `admission_thresholds`, `source_urls`, and `requirement_versions`.
   Publication should preserve traceability back to the reviewed source where possible.

7. Verify freshness and runtime readiness.
   After publication, run the normal catalogue verification path:
   check that required source links exist, calculator coverage is still complete, and DB-backed catalogue readiness still passes.

## Table Roles

- `ingestion_sources`: what can be scraped and where it came from
- `ingestion_jobs`: one execution attempt or collection run
- `ingestion_payloads`: the raw or normalized machine-captured payload for that run
- `review_items`: the human-review queue for proposed canonical changes

## Review Handoff Rules

- Scrapers may discover, fetch, parse, and normalize data.
- Scrapers may not publish directly to canonical catalogue rows.
- Human review is the boundary between machine-collected data and user-facing catalogue data.
- Rejected review items should remain traceable so repeated scraper runs can be compared against prior review decisions.

## Publication Notes

- Canonical updates should be idempotent where possible so reruns do not duplicate requirements or thresholds.
- Approved updates should keep source traceability through `source_urls` and historical value tracking through `requirement_versions`.
- If a scrape reveals ambiguity rather than a clean value, prefer a pending review item over a guessed canonical write.

## First Implementation Target

For the first scraping implementations, keep the workflow narrow:

- one source at a time
- one explicit ingestion job per run
- one review item per proposed field change
- one publish pass that only applies approved review items

That keeps the first version inspectable before adding bulk automation or admin tooling.

## Admissions Source Freshness

Admissions source freshness is the weekly machine check for official admissions sources. It records whether known institution sources are fresh, changed, failed, stale, blocked, or never checked without publishing machine output directly into canonical catalogue tables.

The scheduled workflow is `.github/workflows/admissions-freshness.yml`.

- Schedule: Sunday at `03:00 UTC`, which lands on Sunday morning in Israel.
- Manual run: GitHub Actions `Admissions Source Freshness` workflow dispatch.
- Default target set: Haifa and TAU exact live adapters plus the capability matrix for static-candidate, score-only, browser-blocked, and open-admission targets.
- Optional manual target: pass a source target id such as `haifa-cs-live`.
- Dry run: pass `--dry-run` or use the workflow input to execute source checks without persistence.

Local manual command:

```bash
npm run admissions:freshness -- --dry-run
npm run admissions:freshness -- --target tau-digital-sciences-live
```

## Failure Boundary

The workflow distinguishes job-level setup failure from source-level freshness outcomes.

- Missing `DATABASE_URL` for a persisted run is a job-level configuration error and fails before source checks begin.
- Official source fetch, parse, blocked, or changed outcomes are source-level results. They are persisted and the batch continues.
- Browser-required sources are recorded as `blocked`; they should move to a separate browser automation lane rather than failing the GitHub Action lane.

## Review Boundary

Machine checks do not overwrite canonical admissions data.

- Changed decision-capable normalized fingerprints create an ingestion payload and a pending review item.
- Existing published catalogue rows remain active while review is pending.
- Duplicate pending review work is suppressed when the same unresolved source fingerprint is seen again.
- Score-only changes are tracked as source freshness evidence but do not create acceptance/rejection review work by themselves.

## Adding More Institutions

Adding another institution should follow the same path:

1. Add a target to `src/server/ingestion/admissionsSourceRegistry.ts` with capability, source class, limitation, and next action.
2. Add an exact adapter only when the official source can reproduce decision-bearing fields, not just a score.
3. Add fixture-backed tests for the adapter and registry behavior.
4. Let the scheduled runner persist current state and history through `source_freshness_states` and `source_freshness_checks`.
5. Use the dashboard to monitor blocked or stale sources before expanding public decision logic.
