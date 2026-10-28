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

### U6. Engineering mathematics alternatives

**Goal:** Correct item-6 five-unit-only claims using official institution sources, preserving #310's existing requirement rendering and grouped admission-fact model.
**Requirements:** Verify TAU mechanical and Technion electrical; sweep all catalogue engineering programmes, aliases and generic engineering placeholders; preserve the original UI/evaluator ownership fences.
**Files:** src/data/admissions engineering rule/repair data and tests, src/data/degrees only if needed, tests under src/app/api/admissions/evaluate/, the existing verification document and evidence receipt, and the existing guard's test list if needed, evaluationInputs.ts for ordinary subject-derived maths fields, and catalogue/serializers.ts for the existing database-read repair path.
**Approach:** Capture official programme/general mathematics pages with spaced read-only requests. Test static rows and repaired persisted rows before changes. Replace stale math facts with source-backed alternatives. Keep classification exams and academic-course alternatives explicit; do not invent exam inputs or a passed exam. Exercise any resulting evaluator change through the real evaluator with mocked official replay. Extend the existing repair path instead of adding UI or editing evaluator.ts outside item 3.
**Test scenarios:** TAU mechanical 5/75 and 4/85 alternatives with classification/courses; EE-specific 5/80 and 4/90; industrial/digital published alternatives; Technion 5/70 direct versus classification 70 for four/five units; stale database notes/facts repaired; generic aliases agree; missing classification evidence never becomes a fabricated pass.
**Verification:** New regressions fail before fixes; per-programme source/verdict table is recorded. Formatting, lint/typecheck and the database-free guard pass; push further commits on the same branch and update PR #318 with a separate Item 6 section. No review pipeline.

### U7. Sekhem calculator #320 Haifa/Technion gap

**Goal:** Reproduce fetched #320 head `12fd33f` using its exact JSON shape: psychometric and projected extraInputs with a complete schema-v2 subject record, no top-level average. Preserve legitimate programme gates and verification withholding.
**Files:** New evaluator regression/evidence tests under src/app/api/admissions/evaluate/, adapter tests only if behaviour needs correction, the existing verification document/evidence receipt, and the existing targeted guard list. No #320 or component edits.
**Approach:** Sweep every listed static-catalogue pair with mocked official replies; first observe the requested blanket numeric-score assertion and record all exceptions. Keep that diagnostic contract separate from preservation assertions for legitimate blockers. Confirm the Hebrew-expression fix applies to this request shape. Inspect Haifa's official subject-average servlet operation and its diploma/subject dictionaries with minimal read-only requests spaced at least eight seconds apart. Implement only if mappings and a legal integration point are established. If the evaluator average gate must change, stop Haifa implementation and report the exact minimal change instead. Report first-request versus second-pass #320 fields, actual exam years and programme-specific qualifications separately.
**Verification:** No invented average or forced numeric score for a withheld/unmapped route. No behaviour changes without red-first proof. Diagnostic failures are evidence of unresolved contracts, not guard bypasses; runnable regression assertions document correct supported scores and exact blockers. Format changed files, pass the database-free guard, commit/push the same branch and update PR #318. No review pipeline or subagents.

### U8. Jorje rulings A/B/C/D/E/F, one final push

**Goal:** Remove the Haifa institutional-average ask and correct every TAU submitted average only where the current ownership fence permits; stop and report exact evaluator changes otherwise. Deliver the complete historical text ledger and the authorized Braude identity read-repair.
**Approach:** Inspect both adapter contexts before mutation. Retain reproducible failing A/B contracts as diagnostics when the evaluator fence blocks implementation; do not weaken current regression assertions to imply a shipped fix. Reuse official TAU captures for psychology/law/EE and assert the outbound109.14 average. For D, write static-repair and persisted-row tests first, observe old shortened names, then add name/institution to the existing identity entry and narrowly include its ID in DB-read repair. Confirm legacy institution serialization already canonicalizes the name without changing its ID. For C, compare historical module output with current normalized data and publish full old/new notes for all20 mathematics pairs and all113 English-note programme IDs, plus heading changes. Preserve source evidence and historical dates.
**Files:** Existing catalogue repair JSON/type/application, serializers and their tests; diagnostic tests/evidence and the existing verification doc/plan. No evaluator, policy or adapter changes unless the permitted integration actually suffices.
**E/F additions:** Before changing fingerprints, prove registration-status-only flips change both route fingerprints and downgrade official proof. Exclude only that field at hashing, preserve normalized evidence and all other rule fields, then recompute controlled fingerprints for every affected pair. Copy the five supplied API captures with SHA-256 evidence. Assert F's exact Haifa wording in the blocked A contract; no evaluator edit without a grant. No student-facing registration-status note.
**Verification:** D/E red-before-fix and green-after; A/B exact blockers and minimal proposed diffs; no new existing-assertion flips unless explicitly allowed and marked. Simplify inline, format, lint/typecheck and pass the required database-free guard. Local commits permitted; exactly one push at the end, then update PR318 with condensed tables linked to the full ledger. No review pipeline, agents, DB writes or MyWay/preview calls.

### U9. Granted Haifa dispatch and TAU average forwarding, local delivery

**Goal:** Finish A/F and the 15 authorized TAU sites after merging origin/main. Preserve the accounting block (f3294358 lines1506–1530), withVerifiedAdmissionInformation and the old Haifa gate bodies byte for byte.
**Approach:** Promote the four diagnostic contracts into the real Vitest suite and observe all four failures before implementation. Add a Haifa policy helper for the exact honest note when no explicit institution average was supplied; dispatch before existing capability gates. Replace only the 15 approved TAU outbound averages, preserving raw-average fallback and the accounting exception. Update directly flipped Haifa regression assertions with the required approval comment and disclose each before/after.
**Verification:** New contracts red then green against saved official captures; unchanged explicit-Haifa-average regression; affected merge and admissions tests; exact evaluator diff/fence checks; inline ce-simplify-code; Prettier and database-free guard. Remove superseded AB probe/config while retaining source captures. Update the verification doc and write the PR body to /workspace/codex-tasks/pr318-body.md. Local conventional commits only: no push, remote PR edit or publishing API.

### U10. Confirmed accounting line, Haifa terminology and served-copy sweep

**Goal:** Complete the accounting forwarding site using an official same-persona response; replace Haifa's honest note with Jorje’s new exact sentence and restore the universal forbidden-composite-term guard. Limit the terminology change to the three PR318-introduced strings; inherited main copy is a documented follow-up, not this unit’s contract.
**Approach:** Reuse a matching official accounting capture or obtain the adapter's public TAU score/node responses with at least eight seconds between requests; store raw requests/responses, hashes and timestamps. Add the accounting case to the existing real-evaluator suite, update Haifa expectations with the2026-10-29 approval marker, and observe each changed case red before changing production. Change only the accounting average line in evaluator.ts. Replace the superseded universal sweep tests with one scoped contract covering the medicine comparison, pair-specific psychology explanation and honest Haifa note. Change only the granted medicine component line and the shared psychology phrase; leave inherited strings, including UniversityCard, for follow-up.
**Verification:** Same audit profile109.14/PET700/sections140-130-135; outbound average and independently captured accounting score match. No forbidden terms in the three PR-owned strings; the BatchC card guard stays universal. Medicine at/below/above tests must turn red before the phrase change; inherited-colour/placement/threshold assertions remain. Exact one-line evaluator diff versus eada3c15 and one-line medicine component diff. Inline simplification, formatting, lint/typecheck and database-free guard pass. Update verification/ledger and local PR-body file; commit locally only, no publish or outreach.

## Scope Boundaries

No institution-wide unlocks from stale fixtures. No general alias refactor, UI changes, production access, deployment, or review pipeline. Live production and browser verification are deliberately excluded by this brief; local real-evaluator tests and direct official read-only calls are the available evidence. Jorje retains source/product acceptance and deployed verification.

## Verification Contract and Definition of Done

Each changed behavior has observed red-before-fix evidence and a passing regression. Existing assertions are preserved unless a directly corrected behavior requires the exact approval comment and before/after disclosure. Required formatting and database-free pre-PR guard pass. Documentation distinguishes fixed, explained, blocked and uncertain items. Commit and PR contain only this worktree’s authorized files.
