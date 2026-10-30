---
title: Reduce admissions evaluation latency without changing verdicts
type: perf
date: 2026-10-30
---

## Goal Capsule

Deliver RES-01 on codex/evaluate-latency as one open PR. Preserve every admissions outcome, student-facing DOM, copy, classes, input behavior, and per-program exact-source concurrency of two. Work is authorized through push and PR creation; never merge. All executable verification uses mocked repositories/fetchers. Production and preview measurements belong to the reviewer.

## Product Contract

The calculator currently waits for batches of four programmes, repeated official-source downloads, repeated freshness queries, and short-lived catalogue snapshots. The supplied read-only profile identifies those waits as the dominant cost; compute is small.

### Requirements

- R1. Start every programme concurrently, preserve report shape/request keys and deterministic ordering, keep per-host outbound concurrency at eight per request.
- R2. Share only allowlisted applicant-independent official responses for five minutes, including in-flight work. Preserve independent caller abort/deadline behavior, bounded loader time/body, injected fetchers, and live ingestion/proof paths.
- R3. Load the exact-source union once for both batch and single evaluation, preserving the unavailable authority state.
- R4. Catalogue snapshots stay fresh for five minutes; serve stale immediately while one refresh runs under Next after(). After thirty minutes of age, use the existing foreground miss/error/fallback path. Cache only ready DB snapshots and identify stale responses honestly.
- R5. Public catalogue GET success responses backed by DB data receive public, s-maxage=120, stale-while-revalidate=600; errors and degraded/static fallbacks receive no-store. Leave browser fetch cache unchanged.
- R6. Evaluate responses include aggregate catalogue, freshness, sources, compute, total Server-Timing durations without input data or logs.
- R7. Read calculator program query client-side alongside mount initialization; preload exact-grade code at subjects entry/module load for the exact hash, retaining the dynamic component and identical markup.

## Planning Contract

- KTD1. session-settled: user-directed — process-local caching only, no distributed runtime cache or new dependencies/settings. Runtime-cache guidance establishes isolation limits; the requested TTL and deployment scope take precedence.
- KTD2. Cache key is method + complete URL + body, scoped by underlying fetcher identity. Allow only known HUJI JSON GET and BGU rule-data GET with known non-applicant query keys. All score submissions and unknown endpoints bypass cache. A shared loader owns its five-second bound and returns reusable bytes/status/headers; each subscriber waits independently.
- KTD3. A request-scoped fetch wrapper owns per-host slots and wall-clock source-activity union. Slots cover body reads. Place it under the cache so hits do not consume network slots. Record source waiting for all subscribers, including cache joins. Keep the existing exact-source task concurrency unchanged.
- KTD4. Extract the evaluator's existing institution-program/source selection into a shared helper, including normalized extra inputs and code-reviewed winter exclusion. Pass the complete freshness load result while retaining Map injection compatibility.
- KTD5. Catalogue ready-state validation precedes snapshot publication; failures retain the last good timestamp. after() registration is guarded for non-request use. Existing serialization and code fallback behavior stays intact.
- KTD6. Server-Timing sources measures the union of official-source wait intervals during evaluation, not their sum. Compute is evaluation phase minus this union plus JSON serialization. Total includes validation and all stages.
- KTD7. Programme selection already occurs after mount/catalogue load, so resolving query data in that same initialization introduces no visible intermediate selection. Preserve duplicate query semantics (arrays were ignored), explicit prop precedence, drafts, and hash navigation. Start the identical chunk without introducing state or markup for preload.

No DB connections, university network, preview/prod requests, real enquiry POST, env/settings, policy/data, migration/schema/pool, JourneyExactGrades.tsx, or .github changes. The approved follow-up adds only the minimal root vercel.json with schema and regions [fra1]; production activation requires merge and Amit’s go. No review pipeline runs. Nearby PRs #337/#338/#339 overlap journey files; limit StudyJourney changes to initialization/preload.

## Implementation Units

### U1. Tests first

Add isolated tests for batch overlap, result equality/order, freshness union and unavailable behavior, timing privacy, cache TTL/de-dup/failures/aborts/bounds/live proof, SWR and response headers, query initialization and preload. Run on unchanged implementation and record exact failures/passes; commit new tests if hooks allow. New helper tests may initially fail import before implementation.

### U2. Source scheduling, caching, freshness, timing

Change src/app/api/admissions/evaluate/route.ts and src/server/admissions/evaluator.ts; add focused src/server/cache and admissions request-context helpers. Keep institution policy logic untouched. Tests use the actual evaluator with mocked freshness/network where feasible, plus a route deferred-evaluation test.

### U3. Catalogue SWR and CDN

Change src/server/catalogue/queries.ts, src/types/catalogue.ts, and the two public catalogue route handlers. Their current handlers read no cookies, auth, or request headers. Cover fresh/stale/concurrent refresh/failure/age cap and preserve existing fallback/readiness tests unchanged.

### U4. Cold calculator

Change only calculator page and minimal StudyJourney initialization/preload code. Use jsdom component tests for query selection, absent/repeated query, hash, and eager import; build confirms route rendering classification.

### U5. Verification and delivery

Run ce-simplify-code after implementation while preserving proof tests. Repeat new tests on origin/main in the explicitly requested temporary red worktree and remove it. Measure the supplied 37-programme list locally with mocked real latencies before/after, serialized mock freshness queries, source counts, and per-host peaks. Record evidence, conventional commits, guarded push, gh pr create. No PR comments.

## Verification Contract

| Check | Evidence |
| --- | --- |
| New regression files | Exact red and green Vitest summaries; baseline red worktree proof |
| Timing characterization | 37-programme mocked before/after wall time, freshness/source counts, host peaks |
| Typecheck/lint/format | npm run typecheck; npm run lint; npm run format:check |
| Existing behavior | Full npm test, unchanged asserted outcomes; list mechanical mock/argument edits |
| Production build | npm run build; report calculator route symbol; no DB/network access |
| Guard | npm run guard:pre-pr and pre-push hook; unchanged guard includes the explicitly authorized offline migration/seed checks, run with DATABASE_URL unset |
| Delivery | Branch pushed, one PR opened with evidence and reviewer timing placeholder |

## Definition of Done

All in-scope requirements are implemented and locally proven with mocked sources only; all required permitted checks pass, no existing test expectation is weakened, protected paths are untouched, simplification is complete, and one PR exists against main. The follow-up authorizes the unchanged guard’s two offline checks and existing mocked enquiry unit tests, with DATABASE_URL unset. Migrate only the three explicitly superseded tests in their own requested commit; preserve all other existing expected values. The minimal fra1 configuration is approved in code only; do not alter remote settings or merge.
