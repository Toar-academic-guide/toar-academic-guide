---
title: "fix: HUJI psychology direct route and catalogue correction, phase 1"
date: 2026-10-26
type: fix
artifact_contract: ce-unified-plan/v1
product_contract_source: user-task
execution: code
---

## Goal Capsule

Prepare accurate HUJI psychology route data and a tested direct-route policy for prospective students, with integration deferred until PR #304 merges.
The current task is the authority for scope and delivery; official HUJI captures for תשפ״ז are the authority for thresholds.
Stop on any failure outside the permitted test list; deliver one local commit on the existing branch.

## Product Contract

### Summary

Correct catalogue claims from 660 to 725, document the conditional 690 route and note-only 673 route, and preserve the exact 22.5 sekem path below the direct route.

### Problem Frame

The live exact evaluator compares only sekem, missing the published direct route even at PET 730.
Legacy catalogue text also derives a false required 660 gate and reports four years instead of three.

### Requirements

**Route data and decisions**

- R1. PET at or above the feed direct threshold is accepted; PET in the Kidum interval yields a text-only manual gate naming the rating authority, without new inputs or a full-bagrut confirmation.
- R2. Below Kidum or missing PET leaves the normalized exact result unchanged; thresholds use validated feed numbers with documented 725/690 fallbacks.
- R3. Adapter exposes validated direct PET, Kidum PET and age-30 PET; existing sekem threshold behavior remains unchanged.

**Catalogue integrity**

- R4. Both static psychology HUJI direct thresholds become 725; dedicated duration becomes three years; notes derive no required PET numeric gate.
- R5. Serializer removes stale HUJI direct rows for both psychology IDs and repairs dedicated psychology notes, URL, duration and the identified legacy 660 fact.
- R6. Verification documentation records sources, hashes, timings, confidence and all requested uncertainties.

**Phase boundary**

- R7. No evaluator.ts or jsonLd.ts changes; no external writes, SQL, deployment, push or PR. Leave the legacy static sekem threshold unchanged.
- R8. Test-first output is saved before production edits. Existing test modifications stay within approved locations and carry the approval marker. Only missing-hook evaluate tests may remain red.

## Planning Contract

- KTD1. Keep a pure policy taking the normalized result, PET and typed optional feed thresholds. Return the original result for non-applicable cases, including unavailable exact proof. This keeps the subsequent hook small.
- KTD2. Apply persisted catalogue correction through the existing serializer mask and content-repair mechanisms; preserve other institutions and unrelated facts.
- KTD3. Phrase route notes with “ציון … בפסיכומטרי” so the legacy note parser cannot treat an alternative as a universal minimum.
- KTD4. Run implementation and simplification inline. Review pipelines are excluded by the user.

## Implementation Units

### U1. Test-first route and catalogue proof

**Goal:** Establish failures before production edits (R1–R5, R8).
**Files:** New policy and evaluator-route test files; adapter tests; serializer and content repair tests.
**Dependencies:** None.
**Approach:** Follow real evaluator/fetch fixtures, seed-shaped in-memory serializer rows, and pure policy result fixtures.
**Test scenarios:**

- PET 730/B80 and 800/B70 require direct accepted; PET 700/B90 requires text-only manual gate; PET 660/B90 retains exact 22.5 comparison.
- Boundary PET 689/690/724/725; missing PET; feed thresholds overriding each fallback independently.
- Missing, empty, malformed, non-finite feed direct values become undefined; valid strings/numbers parse.
- Persisted direct rows of 660 disappear for both IDs; another institution's direct row remains.
- Static and repaired notes create no PET numeric gate; only the identified legacy fact is removed.

**Verification:** Save the initial failing output to the user-named evidence file outside the repository.

### U2. Route policy and catalogue corrections

**Goal:** Implement R1–R6 within R7.
**Files:** src/server/ingestion/adapters/hujiAdmissions.ts; src/server/admissions/hujiPsychologyDirectRoutePolicy.ts; src/server/catalogue/serializers.ts; src/data/degrees/academicPrograms.ts; src/data/degrees/academic.ts; src/data/admissions/catalogueContentRepair.ts; src/data/admissions/catalogueContentRepair.json; approved tests; docs/admissions-verification/2026-10-26-huji-psychology-direct-725.md.
**Dependencies:** U1.
**Approach:** Extend existing mechanisms narrowly; keep direct_30 informational; correct approved legacy test pins with line markers.
**Test scenarios:** U1 coverage plus existing approved catalogue, SEO, page and calculator regression files.
**Verification:** Policy, adapter and catalogue tests pass; evaluate-path failures remain only where the pending hook is required.

### U3. Simplification and local delivery

**Goal:** Preserve behavior while keeping the implementation concise and deliver reviewable local evidence (R7–R8).
**Files:** Current change set only; verification document.
**Dependencies:** U2.
**Approach:** Apply ce-simplify-code inline without review agents, preserving proof tests. Record check results and proposed later evaluator hook in delivery.
**Test scenarios:** Relevant Vitest suites and repository guard's existing targeted suites.
**Verification:** Lint, typecheck, relevant tests and pre-PR guard run with DATABASE_URL unset; any unexpected failure stops work.

## Verification Contract

Use the package lint and typecheck scripts, relevant Vitest files and guard:pre-pr with DATABASE_URL unset.
The guard's local migration inspection and seed dry-run are checks only; do not execute any database seed or SQL.
No review workflow or browser deployment work is authorized in this phase.
Keep every newly added regression test active; expected missing-hook failures are reported explicitly.

## Definition of Done

All in-scope production and documentation changes are committed locally, with evaluator.ts and jsonLd.ts byte-identical to the base.
Every approved existing-test edit has its marker; all other existing tests remain untouched.
All mandatory checks have evidence, no unexpected failure is left unresolved, and no abandoned implementation remains.
The delivery includes file counts, marked test edits, test-first evidence, check results, pending hook snippet and commit SHA.
