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

Run new tests before implementation to establish failures where practical. Only the ten Jorje-adjudicated expectations may change, with row-specific source comments. All other existing expectations and numeric examples stay unchanged. Run focused tests, full unit suite, lint, typecheck, and `npm run guard:pre-pr`. Run the matrix through the actual evaluator using read-only official endpoints and catalogue snapshots; distinguish recorded source fixtures from live HTTP results. No DB writes, seeds, freshness workflow, GitHub comments, or deployment commands. Code-review pipelines are explicitly skipped by task instruction.

## Definition of Done

All six original behaviors and G1–G3 have unit coverage. The Oct 25 rulings supersede the earlier retained-failure publication exception: the full suite and pre-PR guard must pass without a bypass. Keep the PR draft for coordinator verification, and preserve the existing evidence table.

## Oct 25 rulings implementation

Authority: the supplied R1 PR #278 rulings dated 2026-10-25 and this run's explicit row-by-row instructions.

1. Merge current main (including e0a90d0) without rebasing; preserve Technion source handling and shared API schema extraction.
2. Add failing integration tests through the real evaluator/API for G1 estimate provenance, G2 inclusive 2% threshold bands for Colman and BGU, and G3 alternative-channel evidence. Use existing official response fixtures; no new formulas or numeric thresholds.
3. Apply safeguards only to institution-average proxies. Direct psychometric scores and supplied institution averages keep existing verdicts. Defaulted exam years add estimate provenance but do not make a directly supplied score proxy-derived.
4. Preserve estimate reasons and distinguish score lineage from other estimated inputs. Borderline proxy scores request subject grades and return unknown; proxy-below requires independently established failure of every other channel. Otherwise request subject grades without a verdict.
5. Update only the ten authorized old expectations, with ruling/source comments. Rename the empty-response Psychology fixture, retain degraded/unknown with an honest next action, and add a valid-response estimated-score sibling. Psych-only accepted cases retain closed-registration and additional-condition information.
6. Simplify the focused implementation without changing proof tests, then run lint, typecheck, format, the full unit suite and the real guard. Normal push only when all pass; update PR #278 body and inspect head CI. Do not edit workflows, guard, coverage requirements, UI components or copy rendering.

Known student-visible behavior: G2/G3 replace uncertain proxy verdicts with requests for subject grades; result statuses/next actions can change through the existing rendering. No layout or rendering change is intended. Jorje retains product/source verification and coordinator readiness authority.
