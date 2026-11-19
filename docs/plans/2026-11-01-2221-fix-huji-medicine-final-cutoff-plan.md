---
title: HUJI Medicine Final Cutoff - Plan
type: fix
date: 2026-11-01
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
issue: https://github.com/Toar-academic-guide/toar-academic-guide/issues/361
---

# HUJI Medicine Final Cutoff - Plan

## Goal Capsule

**Objective:** Applicants evaluated through HUJI's existing final-stage medicine route receive the correct 2026–27 threshold comparison, including those previously rejected by the stale higher cutoff.

**Authority:** Issue #361, the preceding lightweight brainstorm, and Amit's explicit choice on 2026-11-01 to correct the code policy rather than extend the publishing system. Repository AGENTS.md governs execution.

**Means:** Update the dedicated policy and its verification evidence together (KTD1–KTD3).

**Execution profile:** One focused implementation PR with three dependent units. Planning and amendment of the issue are authorized; this document does not authorize implementation, merge or production changes. Recheck the one-PR rule before opening a PR: #359, #311, #313 and #314 were open during planning. Do not close other PRs to clear that restriction.

**Stop conditions:** Pause if fresh official evidence changes the relevant stage/cycle, or implementation requires schema, publication or unrelated UI changes. The implementer owns focused verification and reports code delivery separately from verified deployment.

## Product Contract

### Summary

Correct the final-stage HUJI medicine result through the existing code policy, with matching evidence and explanations. Preserve the academic-stage flow introduced in #358.

### Problem Frame

The policy and verification contract still contain 25.783. HUJI's official requirements page identifies a lower final selection threshold for the same admission cycle. Ordinary-route applicants between those values can receive a false below-threshold result.

### Requirements

- R1. Use 25.708 as the final-stage threshold for the ordinary HUJI six-year medicine route, track 601-4601, cycle 2026–2027, on the existing native HUJI scale.
- R2. With all other requirements satisfied, a rounded final score below R1's threshold is below; an equal or higher score meets that numerical condition without promising admission.
- R3. Keep academic screening at 25.186 and preserve formulas, rounding, assessment minimums, missing-input behaviour and special-route handling.
- R4. Return the same threshold in the result, below-threshold explanation and verification contract for both supported programme aliases, `medicine` and `huji_medicine`.
- R5. Keep dated official evidence and distinguish newly checked requirements from historical calculator captures; no new live-proof claim may be inferred from changing a constant.

### Scope Boundaries

No new assessment fields, routes, profile-prefill changes, score conversions, catalogue thresholds, database writes, manifest changes, publisher extensions or environment changes. Other medicine mapping work remains outside #361. Historical evidence may retain the former cutoff when clearly identified as historical.

### Acceptance Examples

- AE1. Covers R1–R2: final scores 25.707, 25.708 and 25.709 yield below, meets-threshold and meets-threshold respectively when prerequisites are satisfied.
- AE2. Covers R1–R2: a score of 25.750 no longer fails solely because of the former threshold.
- AE3. Covers R3–R4: missing assessment information still requests completion, while the standalone academic calculator retains its academic score and screening threshold.

## Planning Contract

### Key Technical Decisions

- KTD1. **Deploy the dedicated code-policy correction through a reviewed PR.** The evaluator calls `resolveHujiMedicineAdmission`; the canonical publisher instead updates `admission_thresholds` rows of kind `sekhem`. The weekly review excludes proofs marked `formula_score`. Updating that publication path would not correct this policy. Implements R1–R4. (session-settled: user-directed — chosen over extending stage-specific database publication: correct the existing calculation with the smallest direct change.)
- KTD2. **Use the policy value for runtime mirrors.** Replace the hard-coded explanation number and verification-contract acceptance number with references to the existing policy value. Keep independent literal expectations in tests so a wrong shared constant cannot make all assertions pass. Implements R4.
- KTD3. **Preserve the September capture and add a dated requirements capture.** Keep `2026-09-28-huji-medicine-official.json` unchanged. Add a small source record for the newly checked final cutoff and include it in the verification source fingerprint. Retain historical calculator observation dates; do not relabel old score captures as newly observed. Implements R5.

### Evidence and Current State

Research matches `origin/main` at `0416adc`; its tracked contents matched the medicine worktree when checked.

- [HUJI medicine requirements](https://info.huji.ac.il/bachelor/Medicine), checked 2026-11-01: stage C identifies R1's final cutoff for תשפ״ז; stage A separately identifies the screening threshold. The site-update banner does not establish next-cycle rules.
- [HUJI medicine calculator](https://www.huji.ac.il/documents/medicine_calc.htm): existing score-replay source; this task changes the threshold rather than its formula.
- `src/server/admissions/hujiMedicinePolicy.ts`: current final cutoff and literal below-threshold message.
- `src/data/admissions/hujiMedicineVerification.ts`: duplicated acceptance cutoff; fingerprint includes policy and historical evidence.
- `src/server/admissions/evaluator.ts`: dedicated medicine branch returns stage-specific score, threshold and explanation.
- `src/server/ingestion/adapters/hujiAdmissions.ts`: proof output takes its acceptance threshold from the policy and retains `publicationMetric: 'formula_score'`.
- `src/server/admissions/admissionsReleasePublisher.ts` and `weeklyReviewRun.ts`: publication mismatch supporting KTD1.

No remaining product decision blocks implementation. Fresh source availability, preview identity and deploy timing are execution-time checks.

## Implementation Units

### U1. Correct the policy and its evidence

**Goal:** Make the policy, explanation and verification contract agree on the sourced final cutoff.

**Requirements:** R1, R4, R5; KTD1–KTD3. **Dependencies:** None.

**Files:** `src/server/admissions/hujiMedicinePolicy.ts`, `src/data/admissions/hujiMedicineVerification.ts`, `src/server/admissions/hujiMedicinePolicy.test.ts`; create `docs/admissions-verification/2026-11-01-huji-medicine-final-cutoff.json` with actual capture time, source URL, cycle, stage, value and a short supporting excerpt.

**Approach:** Recheck the official requirement, capture its evidence, update the policy and remove only the two runtime copies of its value. Extend the existing fingerprint inputs with the new evidence per KTD3. Keep the September calculator fixture intact.

**Test scenarios:**

1. Covers AE1: use the existing `official_cognitive` route with otherwise complete ordinary-route inputs and assessment 175. Synthetic cognitive values 26.746, 26.749 and 26.751 are intended to exercise the three boundary scores; verify the unchanged three-decimal calculation when implementing.
2. Covers AE2: the corresponding cognitive value 26.854 produces the formerly rejected mid-band case. Expected scores are synthetic regression examples, not claims of new official browser captures.
3. The below result's explanation contains the corrected cutoff; its numeric threshold and the verification contract match an independently asserted 25.708.

**Verification:** Focused policy tests establish the boundary and shared-value consistency. Historical evidence retains its original date and contents.

### U2. Verify evaluator and proof consistency

**Goal:** Carry the correction through both medicine aliases without changing stage handling.

**Requirements:** R2–R5; KTD1–KTD3. **Dependencies:** U1.

**Files:** `src/server/admissions/evaluator.test.ts`, `src/server/ingestion/adapters/hujiAdmissions.test.ts`, `src/server/ingestion/admissionsLiveProofRunner.test.ts`; use the existing tests in `src/server/admissions/medicineAcademicEvaluation.test.ts` as academic-stage regression coverage.

**Approach:** Update current-policy expectations that still use the former cutoff and add the mid-band case to the existing staged-evaluation tests. Follow their captured-calculator response pattern. Do not change evaluator interfaces, proof normalization or publication eligibility.

**Test scenarios:**

1. Covers AE2: both aliases return the corrected threshold and existing `eligible_to_apply` semantics for the mid-band example; neither claims acceptance.
2. Proof output carries the final acceptance threshold while keeping applicant-specific screening/assessment thresholds separate and retaining `formula_score`.
3. Covers AE3: missing assessment details remain incomplete, existing language/assessment prerequisites still apply, and academic-stage fixtures retain their results.
4. Existing eligible score 26.612 and screening-below score 22.265 remain unchanged; only relevant final-cutoff expectations change.

**Verification:** Policy, evaluator, adapter and proof-runner tests agree. Old values remaining in historical files are not bulk-replaced.

### U3. Verify the deployed result and hand off

**Goal:** Establish that the reviewed code reaches the intended application without a database publication.

**Requirements:** R1–R5; KTD1. **Dependencies:** U1–U2 and an authorized PR/deployment.

**Files:** Add `docs/admissions-verification/2026-11-01-huji-medicine-final-cutoff.md` for source, test and deployment evidence. Reuse `e2e/sekhem-calculator.spec.ts` for the existing desktop/mobile HUJI academic checks; no new workflow is planned.

**Approach:** Run the checks below, then verify the existing evaluation API on the correct project preview with the ordinary-route synthetic example. Check the public calculator flow separately. Record exact PR head/deployment evidence and any unavailable check. Do not mark the issue resolved solely because local tests pass.

**Test expectation:** No new test harness; reuse existing focused tests and perform the specified API/browser verification.

**Verification:** Preview API returns the corrected final threshold; the standalone calculator preserves its academic-stage behaviour. Deployment verification remains outstanding until the corresponding production code is deployed and checked.

## Verification Contract

- Run focused Vitest coverage for the four policy/evaluator/ingestion test files above, plus `medicineAcademicEvaluation.test.ts`. Keep assertions for expected numbers independent of the runtime constant.
- Run `npm run lint`, `npm run typecheck` and the existing required `npm run guard:pre-pr` before pushing or opening the PR. Satisfy existing CI without adding a new workflow.
- For API verification, post synthetic ordinary-route inputs to `/api/admissions/evaluate` for the supported aliases. Use existing complete fixture prerequisites and the U1 cognitive/assessment pairs; confirm score, threshold, decision and explanation agree. Keep real applicant information out of fixtures, logs and URLs.
- Practical UI check: open `/sekhem-calculator?program=huji_medicine`, enter the existing seven-subject all-90 reference certificate and psychometric 750, set the exam date to 2025-12-01 and Hebrew basis to Hebrew-school instruction, then calculate. Expect academic score 24.366 against 25.186, without a MOR/MARKAM requirement. Repeat at 1280px and 390px and run the existing matching HUJI Playwright cases.
- Read any rendered changed final-stage explanation for natural Hebrew, right alignment and correct decimal order. Record the actual final-stage surface reached; API proof alone is not visual proof. Preserve the existing profile UI rather than adding a new final-stage flow.
- Confirm the preview is for `toar-academic-guide` and the tested commit is the PR head. After an authorized merge/deployment, repeat the final-stage API check against that deployed code. No Supabase mutation, seed or admissions publication run is part of this plan.

## Definition of Done

- U1 and U2 satisfy AE1–AE3 with independently asserted expected values and dated official evidence.
- Required checks and the focused UI/API verification pass, or an actual blocker is clearly recorded rather than treated as completion.
- The review diff contains only this correction, evidence, tests and plan; experimental or abandoned edits are removed.
- The handoff includes the PR link/head, official source, tested deployment and verification results. Code readiness, merge and production verification are reported separately.
- Issue #361 is resolved only after the agreed correction is delivered and the required deployed verification is recorded.
