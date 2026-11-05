---
title: 'feat: encode Haifa admission formula locally'
date: 2026-10-29
execution: code
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
---

# Haifa local formula implementation plan

## Goal Capsule

Prospective students with sufficient ordinary academic inputs receive Haifa score evaluations without a live calculator dependency. Haifa's published formula and captured calculator responses govern the calculation; Jorje verifies delivery before readiness.

## Product Contract

### Summary

Port the supplied reference model and derive Haifa averages from confidently mapped subject records. Preserve all programme gates, thresholds, unresolved information-systems mapping and unsupported engineering behavior.

### Problem Frame

Current dispatch withholds psychology and subject-record applicants while other Haifa evaluations depend on live calculator transport. Generic averages are proxies and cannot establish an exact institutional score.

### Requirements

- R1: Replay all 130 successful composite vectors, eight average vectors and the expired-psychometric error.
- R2: Use saved non-proxy averages first, otherwise derive from mapped subject records; no generic-average fallback.
- R3: Preserve all existing non-score gates; require section scores for PM only. Keep information-systems single-major mapping blocked and let engineering reach unsupported dispatch.
- R4: Change an existing expectation only with exact-input official calculator evidence and the mandated inline approval comment. Leave unmatched expectations failing and deliver locally without pushing.
- R5: Publishable manifest contains only generic cs at haifa, 705 to 700, cycle 2027, with a committed official payload digest. Freeze the old BGU manifest byte-for-byte and change only its test import.
- R6: Stay inside the brief's file allowlist. No review pipeline, merge, deploy, production writes, workflow dispatch or messages.

### Scope Boundaries

Only the files enumerated in the user brief. Keep the ingestion adapter, capability matrix, libraries, UI, routes, database and workflows unchanged. Physiotherapy waiting discrepancy, sociology day track and unresolved IS ID remain documented follow-ups.

## Planning Contract

### Key Technical Decisions

- KTD1: Port the Python arithmetic literally, including epsilon-protected ceil/half-up rounding and the fixed 2026 admission year. PC comes from the student's NITE total; do not approximate the calculator's private conversion.
- KTD2: Put averaging and subject-code mapping inside the new data module. Reject uncertain mappings rather than dropping rows. Optimize optional-subject subsets while keeping every supplied mandatory subject and at least 20 units.
- KTD3: Resolve the average in the permitted guard and pass the resulting input into exact evaluation. Obtain helpers through the already imported Haifa policy module, keeping evaluator edits confined to the two allowed blocks.
- KTD4: Keep existing policy gates before and after local scoring and construct the current exact-result shape with official formula/programme sources.

### Assumptions

Calculator reachability and exact expected-value approval are execution-time unknowns. Any mismatch follows R4; no input or formula adjustment is authorized to force agreement.

## Implementation Units

### U1. Capture evidence and establish red tests

Requirements: R1, R4. Dependencies: none.

Files: `src/data/admissions/haifaFormula.test.ts`, permitted existing tests, and this evidence directory.

Copy research vectors, model, official sources and page captures. Query exact synthetic test inputs in a browser session, at least ten seconds apart. Add replay tests before implementing the module; update existing expectations only after matching evidence.

Test scenarios: all successful vectors; error 242; all average vectors; age boundaries; unknown subject mapping; saved versus proxy averages; PM-only section requirements; existing gates and mappings.

Verification: record the expected missing-module failure and failures of approved new evaluator expectations against the old implementation.

### U2. Implement formula and wire evaluator

Requirements: R1–R4. Dependencies: U1.

Files: `src/data/admissions/haifaAdmissionFormula.ts`, `src/server/admissions/haifaProgrammePolicy.ts` and its test, and only the guard and Haifa exact block in `src/server/admissions/evaluator.ts`.

Implement KTD1–KTD4. Keep psychometric expiry non-exact. Preserve unresolved IS explanation and route engineering to Batch C. Reuse existing exact result conventions without calling the ingestion adapter.

Verification: replay suite green; permitted integration tests green except explicitly unapproved evidence mismatches, retained as failures.

### U3. Align verification metadata and canonical cutoff

Requirements: R5–R6. Dependencies: U2.

Files: `src/data/admissions/formulaBackedVerificationLedger.ts`, `haifaProgramVerification.ts`, `haifaProgrammePolicies.json` if necessary, `reviewedManifest.json`, `bguCutoffsManifest.test.ts`, the new server BGU fixture, and the two permitted academic catalogue files.

Remove psychology withholding, describe local formula provenance, preserve fixture score evidence and existing gates. Follow b878f97's manifest pattern with one official CS proof and verify the BGU fixture using cmp.

Verification: unchanged BGU assertions pass; manifest digest and single-entry validation pass; allowed-path diff only.

## Verification Contract

Run ce-simplify-code after implementation, without a review pipeline. Run focused Vitest tests, lint, typecheck and `env -u DATABASE_URL npm run guard:pre-pr`; record totals and retained failures. Direct preview verification can only happen if delivery is authorized by R4 and the guard passes.

## Definition of Done

If every changed expectation matches and all checks pass: conventional commit(s), plain branch push, one PR and no merge. Otherwise finish permitted independent work, commit locally and write `/workspace/codex-tasks/haifa-formula-report.md` with precise failures and evidence paths.

Confidence check: grounded in supplied model, vectors, current evaluator/policies, input normalization and manifest validation. No additional review pipeline, per the user brief.
