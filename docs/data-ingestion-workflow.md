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
   For admissions decisions, normalize into source candidates, concise admissions facts, and alternative paths. Do not publish broad page paragraphs as decision evidence.

5. Hand off to human review.
   Reviewers decide whether each proposed change is approved, rejected, or left pending.
   Scraper output stops here. No scraper should write directly into canonical catalogue tables without a review decision.

6. Publish approved changes into canonical tables.
   Approved review items update the canonical catalogue tables:
   `institutions`, `programs`, `program_institutions`, `admission_requirements`, `admission_thresholds`, `source_urls`, `admissions_source_candidates`, `admission_facts`, `admission_alternative_paths`, and `requirement_versions`.
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
- Generated per-institution scripts are useful only when they emit reviewed structured facts. Long copied text, marketing descriptions, or unrelated page snippets should stay in raw payloads or review notes.

## Admissions Fact Extraction Rules

For non-calculator institutions, extract only values that can affect a user-facing decision:

- numeric gates: sekhem, psychometric, bagrut average, section scores, math/English units
- manual gates: interview, test, committee, portfolio, document check
- explicit absence: no psychometric requirement, open admission, no bagrut minimum
- unknowns: facts that the source does not establish reliably
- alternatives: prep program, transfer path, prior-study admission, exceptions committee, special-population path, similar program, lower-threshold institution, manual check

Every fact should keep source provenance. URLs from Monday columns and item updates are valid source candidates for the first slice, but the origin must remain visible for confidence and review.

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
