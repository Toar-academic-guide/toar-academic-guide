---
artifact_contract: ce-unified-plan/v1
product_contract_source: legacy-requirements
execution: code
date: 2026-10-24
---
# Results evaluator averages

## Goal Capsule

Restore useful evaluations for average-only and subject-record applicants without inventing institutional formulas. Normalize inputs before capability selection; preserve exact provenance and explicitly flag proxies. This change authorizes a feature-branch push and PR, with no database writes, deployment, merge, or visual changes.

## Product Contract

### Requirements

- R1. Preserve an entered overall average when saving subjects and derive an overall estimate when only subjects exist.
- R2. Use existing BGU and TAU subject-average calculators in the main evaluator. Reuse Colman/Haifa calculators only if they already exist.
- R3. Without subjects, use the supplied overall average as an institutional proxy; return `estimated: true` and a reason on affected rows. Default missing Haifa exam years to the current cycle without replacing supplied years.
- R4. BGU mathematics gates accept a units/grade pair as well as structured subjects.
- R5. HIT returns a student-readable Hebrew explanation instead of its English implementation note.
- R6. BGU Psychology with Bagrut 112 and psychometric 690/720 returns accepted through the published psych-only route; 650 uses the regular formula or honest missing inputs. Registration availability is separate from numeric eligibility.

Scope excludes UI labels, ordering, new questions, save/auth changes, new formulas, thresholds, and catalogue or database changes.

## Planning Contract

1. Normalize once before capability selection in `src/server/admissions/evaluator.ts`; do not mutate callers. Keep explicit institutional averages authoritative. Failed subject-calculator readiness must remain missing, rather than silently using a proxy.
2. Add optional estimate metadata to `src/types/admissionsEvaluation.ts`. Estimated score results cannot claim exact institutional computation; preserve source failures and missing gates.
3. Preserve wizard average through the existing completion callbacks in `src/components/StudyJourney.tsx`. No markup or copy changes.
4. Do not infer psychometric subscores, qualifications, or missing subject grades. Haifa years are assumptions recorded in estimate reasons, never invented exam history.

## Implementation Units

### U1. Overall and institutional averages (R1–R3)

Implement normalization and estimate provenance, preserving original request digests. Add focused tests in `src/server/admissions/evaluationInputs.test.ts` and integration assertions in `src/server/admissions/evaluator.test.ts`. Inspect existing average calculators and wizard callback ordering before implementation.

The shared single/batch clients must send a derived overall average with checked request provenance when a profile has only subjects. Profile validation, calculator continuation and profile matching must use the same derived average while preserving the raw record and keeping official supplied averages authoritative.

### U2. Gates and HIT explanation (R4–R5)

Update BGU gate and capability handling for paired math inputs without fabricating a certificate record. Add regression cases in `src/server/admissions/evaluator.test.ts`.

BGU Psychology addendum (R6): reproduce 650/690/720 against the current official source first; preserve the full source fingerprint while comparing admission rules separately from registration status. Keep all threshold checks, expose the current closed registration in the existing next action, and retain additional conditions. Add inclusive-boundary coverage at 679/680.

### U3. Verification and delivery

Add a reproducible matrix harness using the diagnosis catalogue and subject fixture, compare the branch baseline against the final implementation for 105/650 and 110/700, both average-only and subjects. Record missing-detail counts by subject and residual blockers.

## Verification Contract

Run new tests before implementation to establish failures where practical. Preserve existing expected values. Run focused tests, full unit suite, lint, typecheck, and `npm run guard:pre-pr`. Run the matrix through the actual evaluator using read-only official endpoints and catalogue snapshots; distinguish recorded source fixtures from live HTTP results. No DB writes, seeds, freshness workflow, GitHub comments, or deployment commands. Code-review pipelines are explicitly skipped by task instruction.

## Definition of Done

All six requested behaviors have unit coverage; existing test expectations remain unchanged. The user’s Oct 25 instruction explicitly requires publishing the draft with the ten retained failing expectations for Jorje adjudication. Run and report the guard before the documented feature-branch publication exception; do not change or skip assertions. PR includes exact before/after matrix, estimate limitations, required skip text, and “No visual change.” Jorje retains admissions/source verification before a merge decision.
