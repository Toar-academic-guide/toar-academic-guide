---
title: 'fix: Admissions bugs first'
date: 2026-10-28
type: fix
---

## Summary

Resolve the supplied five-item admissions audit using official evidence and test-first changes, preserving programme IDs and conservative verification gates. Backend and evaluator data only; one PR for Jorje verification.

## Problem Frame

The Technion adapter blocks ordinary Hebrew-expression certificates. Institution-specific and generic IDs can select different verification paths. BGU score assessment may be reported as waiting. Haifa has no subject-derived average. TAU clustered scores require an independent official replay.

## Requirements

- R1: Accept the evidence-supported Technion Hebrew-expression record and faithfully serialize absent Hebrew fields; test CS and civil through evaluation.
- R2: Preserve all IDs and make generic/institution-specific results agree at Haifa, BIU and TAU, following verified institution-specific paths.
- R3: Correct only BGU verdict/verification behavior justified by sources; document genuinely incomplete pairs.
- R4: Derive Haifa average only if official bonus, omission, minimum-unit and cap rules can be established confidently; otherwise document the blocker without code.
- R5: Report three TAU comparisons using at most six direct GraphQL calls, at least eight seconds apart; no production MyWay requests.
- R6: Observe each new behavior test fail before implementation; retain failure messages. Format changed files and pass the required database-free guard before commit/push/PR.

## Key Technical Decisions

- KTD1 (session-settled: user-directed): No UI, routes, infra, DB writes, workflow runs, review pipelines or changes in other worktrees. Evaluator changes limited to BGU verdict/verification mapping.
- KTD2: Extend existing adapter/data mappings and verification ledgers instead of changing public programme IDs. A stored threshold alone cannot activate a pair.
- KTD3: Official captures and current institution pages govern formulas. Unknown Haifa rules stop only R4; TAU findings remain report-only.

## Implementation Units

### U1. Technion Hebrew mapping

**Files:** src/server/ingestion/adapters/technionAdmissions.ts and its test; evaluator regression tests under src/app/api/admissions/evaluate/.
**Approach:** Inspect the official form validation and serialization. Add audit-profile regressions, observe failures, then make the minimal required-row and form change. Preserve other row requirements unless evidence unambiguously supports optionality.
**Test scenarios:** Hebrew-expression-only CS/civil evaluate exactly with mocked official responses; absent Hebrew fields follow the official form; existing missing-English behavior remains.
**Verification:** Both adapter payload and evaluator input gate pass existing and new tests.

### U2. Programme pair agreement

**Files:** Relevant Haifa verification ledger, BIU published-route/channel mapping, TAU mapping data, API alias tests.
**Approach:** Enumerate actual catalogue duplicates; compare verified paths. Add table-driven real-evaluator API regressions before editing data. Route generic IDs to the same institution-specific evidence without changing their other institutions.
**Test scenarios:** Weak, audit/strong and missing-input cases agree across each duplicate pair; Haifa psychology remains withheld; saved references still resolve.
**Verification:** Agreement tests and affected policy tests pass.

### U3. BGU score verdict and verification

**Files:** src/server/admissions/evaluator.ts (narrow authorized BGU verdict mapping only), associated evaluator tests; BGU verification data only if evidence justifies it.
**Approach:** Trace scoreAssessment and derivedVerdict through the adapter. Test numeric-boundary/above/below/missing gates first. Preserve actual waiting bands and other institutions. Document source/field gaps for business, economics, accounting, biology rather than activating synthetic historical fixtures.
**Verification:** Only verified score-condition matches become accepted; incomplete pairs remain unknown.

### U4. Haifa evidence and conditional deriver

**Files:** src/server/admissions/bagrutPolicies.ts, evaluationInputs.ts and tests only if sources establish the full rules.
**Approach:** Read the official score rules and average-calculator assets. Stop this unit without implementation if required bonus/cap/omission details remain unknown.
**Test scenarios if implemented:** Hand arithmetic for audit profile, bonus cap, below-unit-minimum/no-bonus case; evaluator subject-only input stops asking for the Haifa average.
**Verification:** Official rules and arithmetic match code and tests, or the verification doc states precisely what prevents implementation.

### U5. TAU evidence and delivery

**Files:** docs/admissions-verification/2026-10-29-admissions-bugs-first.md.
**Approach:** Replay the adapter request directly to TAU with the audit inputs, inspect psychology/law/engineering score fields and compare with saved MyWay results. Record exact requests, values, timestamps, sources and uncertainty. Apply ce-simplify-code preserving proof tests; format and run required guard; commit, push this branch and open the requested PR.
**Test expectation:** No behavior tests for report-only work.
**Verification:** At most six spaced calls; failure evidence and any approved assertion changes listed; guard count recorded; PR URL delivered.

## Scope Boundaries

No institution-wide unlocks from stale fixtures. No general alias refactor, UI changes, production access, deployment, or review pipeline. Live production and browser verification are deliberately excluded by this brief; local real-evaluator tests and direct official read-only calls are the available evidence. Jorje retains source/product acceptance and deployed verification.

## Verification Contract and Definition of Done

Each changed behavior has observed red-before-fix evidence and a passing regression. Existing assertions are preserved unless a directly corrected behavior requires the exact approval comment and before/after disclosure. Required formatting and database-free pre-PR guard pass. Documentation distinguishes fixed, explained, blocked and uncertain items. Commit and PR contain only this worktree’s authorized files.
