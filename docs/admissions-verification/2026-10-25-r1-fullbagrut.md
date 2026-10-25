# PR #278 follow-up 4: full-bagrut gate removal

Authority: Amit 07:33 ruling via Jorje, 2026-10-25. Follow-up 3 is complete at 47e0f47 with green CI and the correct-project preview. The cancelled remaining-confirmation sentence is not implemented.

Entered averages or subjects satisfy full-bagrut eligibility. The evaluator ignores standalone legacy certificate flags at Colman, BGU quantitative routes, Haifa and HUJI Medicine. Their four standalone controls are removed. Legacy schemas/types remain accepted for saved sessions/API compatibility; no DB or saved-reference ID change. Colman no longer emits its certificate condition. Mixed confirmations retain their existing IDs/statuses for language, other-track, registration and other independent checks; labels no longer ask for a certificate. Generic document_check facts specifically identifying full-bagrut eligibility are satisfied without deleting catalogue facts or IDs. Interview/portfolio/internal assessment/required-subject facts remain.

Certificate-only successful Colman routes now return exact/accepted with the existing green score-assessment display. Numeric below remains below (economics 70/420), now exact rather than a certificate-only manual_gate. G2 still withholds verdicts and metadata at the inclusive band; outside-band successes become accepted because the obsolete certificate-only state is gone. G3 alternative-channel decisions are unchanged. All original scores/thresholds/formulas stay intact. The exact final-admission disclaimer is removed from the affected results; institution-decides and estimate copy remains.

No new certificate question is added for empty score profiles. Existing missing-score/subject paths remain. Published independent psychometric-only and preparatory routes retain their numeric checks; no new Bagrut floor is invented. Institutional subject-record completeness/type inputs needed for weighted-average formulas remain: they describe what grades are available, not a student eligibility toggle.

Genuine gates keep their existing behavior as directed: Colman CS retains its internal-test manual_gate/pending with a green numeric match; interviews, portfolios, missing subjects, languages and other-track checks are not auto-confirmed. A broader conversion of independent pending/eligible results would change protected non-certificate expectations and is not part of this certificate-only exception. The sweep also exposes older manual classifications without condition IDs (including no-formal-score rows); they are inventoried rather than silently reclassified.

## Test-first evidence

New evaluator tests failed against old behavior for law certificate true/false/absent, all-catalogue certificate conditions, and the remaining CS certificate condition. The component no-control regression was run against the prior AcademicProfileForm and failed on the visible legacy control (after correcting an unrelated initial field-label lookup). A second red run found the generic document-check path in both affected programmes. Proof logs are outside the repo in /tmp/r1-fullbagrut-*.log.

Only certificate-pinning assertions change; every changed assertion carries the supplied Amit ruling comment. The earlier 07:24 metadata scope and every independent G1–G3 outcome remain protected. Two economics browser loops each expand to 390/1440 cases: below keeps its score/copy/decision and changes certificate-only kind; passing economics changes eligible_to_apply to accepted. Average-field editing coverage remains.

## Complete new/changed test inventory

Every row below is authorized by Amit's 07:33 ruling via Jorje. Parameterized rows include all existing inputs; numeric examples are unchanged. The HUJI failed-certificate row is replaced by explicit undefined/false/true compatibility cases, preserving every unrelated prerequisite case.

| File                                                          | Test                                                                                                       | Change / authority                             |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| e2e/official-requirements-5.spec.ts                           | `economics reports estimated below and allows grade updates at ${width}px`                                 | changed certificate-gate assertion; Amit 07:33 |
| e2e/official-requirements-5.spec.ts                           | `official economics copy and calculator flow at ${width}px`                                                | changed certificate-gate assertion; Amit 07:33 |
| src/app/api/admissions/evaluate/aliases.test.ts               | `${aliasId} matches ${canonicalId} for %s`                                                                 | changed certificate-gate assertion; Amit 07:33 |
| src/app/api/admissions/evaluate/aliases.test.ts               | 'keeps alias and canonical batch keys separate while evaluating the canonical rows'                        | changed certificate-gate assertion; Amit 07:33 |
| src/components/AcademicProfileForm.test.tsx                   | 'restores, edits and saves Colman Bagrut inputs without unused scores'                                     | changed certificate-gate assertion; Amit 07:33 |
| src/components/AcademicProfileForm.test.tsx                   | 'collects, saves and restores programme-specific Haifa facts without assuming missing answers'             | changed certificate-gate assertion; Amit 07:33 |
| src/components/AcademicProfileForm.test.tsx                   | 'retains Medicine inputs when reopened, edited and saved'                                                  | changed certificate-gate assertion; Amit 07:33 |
| src/components/AcademicProfileForm.test.tsx                   | 'saves and reopens health decimals, false and unknown values without generic scores'                       | changed certificate-gate assertion; Amit 07:33 |
| src/components/AcademicProfileForm.test.tsx                   | 'Amit 07:33: legacy certificate fields render safely without full-bagrut controls'                         | new regression; Amit 07:33                     |
| src/server/admissions/colmanBagrutEvaluation.test.ts          | 'meets the published inclusive boundaries with $mathUnits units and grade $mathGrade without psychometric' | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/colmanBagrutEvaluation.test.ts          | 'keeps certificate confirmation %s separate from the grades'                                               | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/colmanPublishedRoutesEvaluation.test.ts | 'matches the inclusive Bagrut boundary without psychometric or general average'                            | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/colmanPublishedRoutesEvaluation.test.ts | 'keeps a numeric match separate from an unconfirmed or unmet certificate'                                  | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/colmanPublishedRoutesEvaluation.test.ts | 'lets the met Bagrut route win even with missing quantitative input'                                       | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/colmanPublishedRoutesEvaluation.test.ts | 'keeps the numeric match separate at average %s'                                                           | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/evaluator.test.ts                       | '$name'                                                                                                    | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/evaluator.test.ts                       | 'requests missing Haifa years without contacting the official service'                                     | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/evaluator.test.ts                       | 'defaults Haifa years while retaining qualification questions'                                             | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/evaluator.test.ts                       | 'G2 Colman proxy at floor × %s'                                                                            | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/evaluator.test.ts                       | 'G3 Colman proxy-below with %s alternative'                                                                | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/evaluator.test.ts                       | 'G1 real Colman average is unflagged and exempt from G2'                                                   | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/evaluator.test.ts                       | 'law 110/650 ignores legacy certificate %s'                                                                | new regression; Amit 07:33                     |
| src/server/admissions/evaluator.test.ts                       | 'never requests a certificate across the catalogue with %s input'                                          | new regression; Amit 07:33                     |
| src/server/admissions/evaluator.test.ts                       | 'retains genuine selection for %s'                                                                         | new regression; Amit 07:33                     |
| src/server/admissions/evaluator.test.ts                       | 'retains Colman internal assessment and missing mathematics'                                               | new regression; Amit 07:33                     |
| src/server/admissions/evaluator.test.ts                       | 'removes the generated certificate document gate from %s'                                                  | new regression; Amit 07:33                     |
| src/server/admissions/haifaProgrammePolicy.test.ts            | 'checks the primary route for %s'                                                                          | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/hujiMedicinePolicy.test.ts              | 'rejects a known unmet prerequisite: %j'                                                                   | changed certificate-gate assertion; Amit 07:33 |
| src/server/admissions/hujiMedicinePolicy.test.ts              | 'ignores obsolete medicine certificate confirmation %s'                                                    | new regression; Amit 07:33                     |
| src/server/admissions/officialRequirements5.test.ts           | 'economics average=%s psych=%s quant=%s returns %s/%s through dispatch'                                    | changed certificate-gate assertion; Amit 07:33 |

## Empirical evidence

Full raw BEFORE/AFTER rows and by-condition-id inventory: /workspace/qa-evidence/pr278-estimated/after/fullbagrut-counts.md. The original temporary harness runs all 436 pairs in five profiles, offline with synthetic fresh-source fixtures; no production DB/service claim.

| Profile       | manual_gate before | after | transitions to a calculated verdict |
| ------------- | -----------------: | ----: | ----------------------------------: |
| overall_only  |                196 |   190 |                                   6 |
| subjects_only |                191 |   190 |                                   1 |

Five Colman overall-only rows become accepted/exact. Ruppin marine biology becomes accepted/estimated in both profiles. Tel Aviv-Yaffo economics retains its genuine interview after removing the document check. Both profiles retain 46 structured admissions_committee cases and 144 older manual results without structured IDs. Full explanations are retained per row; no condition IDs were invented. No further independent classification or catalogue-data change is attempted.

Estimate flags/notices retain the five-profile counts from follow-up 3: overall_only 6; subjects_only 0; subjects_plus_typed_avg 0; overall_only_with_haifa_years 6; subjects_only_with_haifa_years 0. Flagged overall rows now have exact:5, estimated:1. G2 has no flag/reason/notice. See counts.md and fullbagrut-estimated-summary.json in the same QA folder.

VISUAL change — stays draft pending Amit's approval.

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.

Local verification: lint, typecheck, format:check and static build passed. Full npm test: 3,638 passed / 86 existing skips / zero failures; real guard: 2,735 passed. Ten existing Playwright specs: 124 passed / four existing conditional skips / two authorized certificate-era economics decisions failed first; the affected four-case economics spec then passed completely after only those expectations changed. All 126 applicable cases pass across the final runs. No other browser expectation, numeric example, workflow, guard or coverage threshold was changed. Test-generated historical UI artifacts were restored, not republished as new evidence.
