# PR #278 follow-up 3: estimate scope

Jorje 07:24 ruling and coordinator approval authorize only the estimate-assertion exception.

The evaluator no longer publishes the derived-overall-average reason as an institutional estimate. Subject records take precedence over the client derivation marker. A shared `isCalculatedAdmissionResult` predicate gates both API metadata and AdmissionEstimate rendering after G2/G3 have run; unavailable/missing-input kinds are excluded even when a retained score exists. Calculated year-only Haifa rows retain honest year wording; explicit real years remain unflagged.

Test-first evidence: the pre-implementation run produced failures for subject-derived provenance, missing-input/unavailable flags, G2/G3 flags and component rendering. Two new Haifa fixture-selection errors in that initial run were corrected to use the reviewed 2015 capture; no existing numeric expectation changed. Positive coverage uses reviewed TAU 679/660, BGU 734 and Haifa 702/806 responses.

New tests: five institution subject-derived client-marker cases; average-only needs_input/unsupported/requirements_only; TAU calculated proxy versus explicit average; Haifa calculated proxy/default years/real years/subject record with year-only provenance; component forbidden-kind gating even with score, unknown without score, flags true/false/absent, score zero, and year-only calculated versus needs_input.

### Every superseded estimate assertion (approved exception)

Only estimate metadata/notice expectations are superseded. All existing decisions, kinds, required inputs, numeric examples, thresholds, G2 boundaries, G3 channel outcomes, registration/confirmation checks and economics browser expectations remain unchanged. The exact approval comment is above each changed assertion. Missing properties are explicitly asserted as absent/false, not silently dropped from coverage.

| Existing test / case                                                | Superseded assertion               | New assertion                                                |
| ------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| evaluator: ruling 1, Haifa psychometric sections                    | estimated true on needs_input      | not true; reason absent                                      |
| evaluator: ruling 2, Haifa missing years / qualifications           | estimated true on needs_input      | not true; reason absent                                      |
| evaluator: ruling 3, BGU Biology route details                      | estimated true on needs_input      | not true; reason absent                                      |
| evaluator: ruling 4, empty BGU Psychology official response         | estimated true on degraded/unknown | not true; reason absent; still no score                      |
| evaluator: HUJI subjects-only normalization                         | estimated true                     | not true                                                     |
| evaluator: HUJI subjects-only normalization                         | estimationReason truthy            | absent                                                       |
| evaluator: TAU average-only subject-record request                  | estimated true on needs_input      | not true                                                     |
| evaluator: TAU average-only subject-record request                  | reason contains 110                | absent                                                       |
| evaluator: Haifa defaulted years retaining qualification questions  | estimated true                     | not true; reason absent                                      |
| evaluator: Psychology proxy-score replay failure                    | estimated true on needs_input      | not true; reason absent                                      |
| evaluator: G2 Colman, ratios 0.98 and 1.02                          | estimated true                     | false/absent; reason absent; outside-band flags stay true    |
| evaluator: G2 BGU, ratios 0.98 and 1.02                             | estimated true                     | false/absent; reason absent; outside-band flags stay true    |
| evaluator: G3 Colman passing / undecidable alternative              | estimated true                     | false/absent; reason absent; all-failing below stays flagged |
| evaluator: G3 BGU undecidable preparatory channel                   | estimated true                     | not true; reason absent                                      |
| evaluator: G3 BGU passing preparatory channel                       | estimated true                     | not true; reason absent                                      |
| evaluator: G1 Haifa missing inputs, defaultYears true               | flag equals defaultYears           | false for both defaulted and real years                      |
| evaluator: G1 Haifa missing inputs, defaultYears true               | reason contains 2026               | absent                                                       |
| evaluator: G3 BGU untested/borderline alternative, both route cases | estimated true                     | not true; reason absent                                      |
| aliases API: G1 Haifa/BGU missing institutional inputs              | flag equals !supplied              | false/absent; Colman law pending flag stays true             |
| aliases API: G1 Haifa/BGU missing institutional inputs              | reason truthy when not supplied    | absent; Colman law pending reason stays present              |

No existing estimate-notice assertion required a change: the existing journey component fixtures are calculated below verdicts and remain valid. New component tests explicitly reject stale metadata on non-calculated results. Private proxy provenance remains available to G2/G3 even when public metadata is withheld.

# PR #278 estimated scope empirical comparison

BEFORE: 8d415df. AFTER: follow-up 3 code (code SHA recorded in the committed evidence README). All five profiles, 403 programmes / 436 programme-institution pairs per profile; 2,180 total rows. Original Jorje harness copied temporarily, not committed. Offline fetcher and synthetic fresh verification states, no DB or live institution HTTP. Subject record and scores are identical before/after.

Jorje 07:24 ruling and coordinator approval supersede earlier provenance assertions only. Actual outcomes, scores, thresholds, labels and explanation excerpts in all 2,180 rows are unchanged.

| Profile                        | Flagged before → after | Programmes before → after | Institutions before → after | Notes before → after |
| ------------------------------ | ---------------------: | ------------------------: | --------------------------: | -------------------: |
| overall_only                   |                 81 → 6 |                    70 → 6 |                       4 → 1 |               81 → 6 |
| subjects_only                  |                373 → 0 |                   356 → 0 |                     186 → 0 |              373 → 0 |
| subjects_plus_typed_avg        |                 20 → 0 |                    20 → 0 |                       1 → 0 |               20 → 0 |
| overall_only_with_haifa_years  |                 81 → 6 |                    70 → 6 |                       4 → 1 |               81 → 6 |
| subjects_only_with_haifa_years |                353 → 0 |                   340 → 0 |                     185 → 0 |              353 → 0 |

| Profile                        | Before flagged kinds                                                                                                                                                                  | After flagged kinds          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| overall_only                   | authority_unavailable: 1, degraded: 5, estimated: 1, manual_gate: 5, needs_input: 63, requirements_only: 3, unsupported: 3                                                            | estimated: 1, manual_gate: 5 |
| subjects_only                  | authority_unavailable: 4, degraded: 20, estimated: 17, exact: 3, manual_gate: 191, needs_input: 40, open_admission: 3, requirements_only: 7, tracked_missing_rule: 1, unsupported: 87 | none                         |
| subjects_plus_typed_avg        | authority_unavailable: 1, needs_input: 18, unsupported: 1                                                                                                                             | none                         |
| overall_only_with_haifa_years  | authority_unavailable: 1, degraded: 5, estimated: 1, manual_gate: 5, needs_input: 63, requirements_only: 3, unsupported: 3                                                            | estimated: 1, manual_gate: 5 |
| subjects_only_with_haifa_years | authority_unavailable: 3, degraded: 20, estimated: 17, exact: 3, manual_gate: 191, needs_input: 22, open_admission: 3, requirements_only: 7, tracked_missing_rule: 1, unsupported: 86 | none                         |

All AFTER flagged rows would render the note under the shared calculated-result predicate. Zero subject-profile average proxies and zero notes on needs_input/unavailable rows. The offline calculated subset contains six Colman rows only; separate reviewed-response unit tests prove calculated TAU/BGU/Haifa flags, including year-only and real-year cases. G2 keeps the score and no-verdict state, with no flag/reason/note.

VISUAL change — stays draft pending Amit's approval.

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.

Local verification: lint, typecheck, format:check, full npm test (3,625 passed / 86 existing skips / zero failures), guard:pre-pr (2,722 passed / no bypass), static production build, and ten affected existing Playwright specs (126 passed / 4 existing conditional baseline skips / zero failures). Typecheck was rerun after build because simultaneous build regeneration removed generated types during the first attempt. No production DB/service state was changed.
