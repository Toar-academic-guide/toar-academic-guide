# Haifa local admission formula — verification and stop record

Status: **blocked; local-only delivery, no push and no PR**. Jorje must verify before readiness. The required stop report is `/workspace/codex-tasks/haifa-formula-report.md`.

## Sources and confidence

- [Haifa official calculator](https://applicants.haifa.ac.il/enrollmentChances/index.html), `CandChancesServlet` GET operations `calculateChances` and `calculateBagrutAvg`, year 2026 / semester 001 (תשפ״ז).
- [Official score calculation](https://admissions.haifa.ac.il/score-calculation/): committed HTML (lossless `score-calculation.2026-10-25.html.gz`) and text from 2026-10-25 and official extracts from 2026-10-29. The formula is published; PM ceiling and final half-up rounding are observed calculator behavior. BT and age bands reproduce the supplied calculator observations. The page retains stale year labels; current calculator observations supply the cycle check.
- `programme-pages/`: today's CS, statistics and physiotherapy captures. All programme-specific URLs and thresholds appear below.
- `raw/getDiplomaCourses-001.json`: authoritative course codes and mandatory list.
- `FINDINGS.md`, `SAVED-INPUT-GAP.md`, `model/haifa_model.py`, `test_vectors.json`, `pc_observed.json` preserve the supplied research. Historical research recommendations are subordinate to the brief's binding rulings, especially the unresolved IS mapping.
- `raw/chances1-1793258405009.json`, `raw/probe2-1793258987745.json`, `raw/probe3-1793259682735.json`, `raw/ui-1793259566427.json` preserve all 2026-10-29 raw responses referenced by the replay vectors. The remaining vectors reference the existing `docs/admissions-verification/2026-09-28-haifa-official.json`.
- `production-thresholds-readonly.md`: supplied read-only production observation. No new production queries, SQL, migrations, seed writes, deployments or workflow dispatches were performed.

The formula replays **130/130 matched composite vectors and 8/8 average vectors**, plus the non-exact error-242 case. This validates the arithmetic against the observed PC. It does **not** prove that an inconsistent synthetic NITE total equals the calculator's private Q/V/E conversion. The exact-input mismatch gate below prevents publication.

## Formula and input contract

BT = 10 × average − 330, without rounding the supplied average before BT. PM = ceil(0.514554 × (6Q + 4V + E) − 65.3 − 1e−9). General PC is the student's NITE total, exactly as Haifa's published rule states.

Age uses **2026 minus bagrut year**, rather than the psychometric year or wall clock. Full weights apply through age six; ages seven to ten use 1:7 or 3:17; older bagrut contributes zero. Final scores round half up. Psychometric older than ten years remains non-exact. Existing default years from `evaluationInputs.ts` are retained.

A saved non-proxy Haifa average takes precedence. Otherwise, map every subject and compute Haifa's optimal average, retaining mandatory rows and at least 20 units. The generic average/proxy is never used. Q/V/E are needed only for PM; existing English, Hebrew and programme gates still apply to every route.

All existing maths, language, nursing raw-psychometric/science-unit, OT attempt, law alternative-route, accounting-course, interview, deadline and green/footnote policy logic is retained. The only policy-dispatch change moves engineering to its existing unsupported path even with empty inputs. No UI/component code changed.

## Programme thresholds and official pages

Policy acceptance and publishedWaitingMinimum remain the threshold authorities. No policy threshold changed.

| Programme | P; full/older weights | Acceptance | Published waiting minimum | Official programme page |
|---|---|---:|---:|---|
| accounting | PM; 1:3 / 1:7 | 680 | 660 | [page](https://admissions.haifa.ac.il/social-sciences/program/2484) |
| biology | PM; 1:3 / 1:7 | 640 | 620 | [page](https://admissions.haifa.ac.il/natural-sciences/program/3036) |
| communication | PC; 1:3 / 1:7 | 550 | 500 | [page](https://admissions.haifa.ac.il/social-sciences/program/3229) |
| cs | PM; 1:3 / 1:7 | 700 | 680 | [page](https://admissions.haifa.ac.il/computer-information-science/program/3210) |
| economics | PM; 1:3 / 1:7 | 660 | 640 | [page](https://admissions.haifa.ac.il/social-sciences/program/2482) |
| infosystems | PM; 1:3 / 1:7 | 680 | 650 | [page](https://admissions.haifa.ac.il/computer-information-science/program/3218) |
| law | PC; 3:7 / 3:17 | 680 | 630 | [page](https://admissions.haifa.ac.il/law/program/3000) |
| math | PM; 1:3 / 1:7 | 610 | 580 | [page](https://admissions.haifa.ac.il/natural-sciences/program/3161) |
| nursing | PC; 1:3 / 1:7 | 580 | 570 | [page](https://admissions.haifa.ac.il/social-welfare-health-sciences/program/2973) |
| occupational_therapy | PC; 1:3 / 1:7 | 610 | 595 | [page](https://admissions.haifa.ac.il/social-welfare-health-sciences/program/3088) |
| physiotherapy | PC; 1:3 / 1:7 | 680 | 630 | [page](https://admissions.haifa.ac.il/social-welfare-health-sciences/program/3181) |
| political_science | PC; 1:3 / 1:7 | 580 | 520 | [page](https://admissions.haifa.ac.il/social-sciences/program/3054) |
| psychology | PC; 1:3 / 1:7 | 650 | 630 | [page](https://admissions.haifa.ac.il/social-sciences/program/3268) |
| social_work | PC; 1:3 / 1:7 | 615 | 580 | [page](https://admissions.haifa.ac.il/social-welfare-health-sciences/program/3082) |
| sociology | PC; 1:3 / 1:7 | 540 | 520 | [page](https://admissions.haifa.ac.il/social-sciences/program/2968) |
| statistics | PM; 1:3 / 1:7 | 630 | 600 | [page](https://admissions.haifa.ac.il/natural-sciences/program/3167) |

The single-major `haifa_infosystems` mapping remains blocked with `מיפוי המסלול טרם אומת`; no new mapping of 52256686 is activated. Verified IS tracks retain their existing official IDs and gates and use the local PM formula. Sociology keeps 52252907; 52252912 is evidence for follow-up only. Engineering retains its existing programme/institution link and contact-action data through Batch C; preview rendering was not verified because delivery is blocked and no preview was created.

## Subject mapping and derivation limits

| Repo subject ID | Haifa code | Interpretation |
|---|---|---|
| mathematics | 35 | Maths +20/+35 at 4/5 units |
| english | 16 | Core +20/+25 |
| physics / chemistry / biology | 36 / 37 / 43 | Core +20/+25 |
| bible / literature | 1 / 10 | Core +20/+25 |
| history | 22 Jewish; 23 Arabic school | Code 22 receives core bonus; no unproven bonus for 23 |
| civics | 34 Jewish; 24 Arabic school | Mandatory, official non-core bonus list |
| hebrew_expression | 11 | Mandatory, official non-core bonus list |
| computer_science | 899 | Optional, official non-core +10/+20 |
| arabic / hebrew | 20 / 14 in Arabic schools | Mandatory, core +20/+25 |
| geography / geology | 57 / 62 | Official optional non-core bonus; exact wizard code-point IDs for גיאוגרפיה and גיאולוגיה also mapped |

Bonus requires grade >=60 and at least four units. No bonus is inferred merely because a subject appears in the calculator dictionary. The average is rounded half up to two decimals. Dynamic programming over attainable unit counts produces the same optimal whole-subject subsets as the reference model's exhaustive enumeration.

Unmapped inputs keep the Haifa note: `arabic_expression` (no unambiguous standalone dictionary code); Hebrew in a Jewish-school record (dictionary code101 exists but its record semantics/bonus policy are not established); Jewish-school Arabic (code18 exists but the school's foreign-language interpretation is not established); unknown/custom wizard subject IDs, including unresolved heritage/combined labels. Final-project and combined assessment rows, duplicate course codes, incomplete mandatory-subject sets and totals below 20 units are conservatively not derivable. No subjects are silently dropped. These are calculation limits, not invented admission requirements.

## Calculator protocol and captures

Final audit: 41 captures, all HTTP200; minimum explicit request spacing after the prior response 10.05 seconds.

Playwright was installed only in `/workspace/haifa-re`. Chromium opens the official page, clicks למחשבון and fetches GET operations inside the session, following the supplied runner. Explicit calculator requests are spaced >=10 seconds after the previous response completed. All inputs are synthetic. Neither `print` nor `sendToMail` was called. Every `calculator/*.json` contains the exact URL, parameters, timestamps, HTTP status and full response, plus the NITE total (which cannot be sent to this calculator).

`calculator/capture.mjs.txt` preserves the capture script as evidence. The gap subject certificate was submitted first to calculateBagrutAvg and returned 105.12; the audit certificate returned103.50. Saved-average tests use their actual saved value rather than replacing it with either derived average.

## Approved existing numeric expectation edits

Each numeric edit carries the exact approval comment from ruling4. File lines refer to the final local tree.

| Test file:line | Input (average; bagrut year; psychometric year; NITE; Q/V/E) | Old | New | Calculator weighted | Calculator PC | Match | Evidence |
|---|---|---:|---:|---:|---:|---|---|
| rulingsHaifaTau.test.ts:241 (cs/haifa_cs) | 104;2026;2026;590;115/110/120 |493|611|611|580|yes|[request+response](calculator/rulingsHaifaTau-saved-cs.json)|
| rulingsHaifaTau.test.ts:335 (statistics) |104;2026;2026;590;115/110/120|493|611|611|580|yes|[request+response](calculator/rulingsHaifaTau-saved-statistics.json)|
| rulingsHaifaTau.test.ts:350 (math) |104;2026;2026;590;115/110/120|493|611|611|580|yes|[request+response](calculator/rulingsHaifaTau-saved-math.json)|
| sekhemCalculatorGap.test.ts:187 (CS continuation) |102;2020;2025;590;115/110/120|493|606|606|580|yes|[request+response](calculator/sekhemCalculatorGap-continuation-cs.json)|

The baseline objects in rulingsHaifaTau remain failing because their old URL/explanation expectations and general-group rows were not broadly rewritten. The CS continuation now passes. Scores in `evaluator.test.ts` are unchanged: only obsolete live-request assertions became a no-network assertion; both year-boundary scores702 and699 still pass. The two defaulted-year702 assertions remain failing with actual699 because score changes there were not granted. Their exact calculator score is independently recorded in `evaluator-defaulted-cs.json`.

Engineering test changes are the brief's explicit **non-score ruling3**: remove the empty-profile note exception in API and unsupported-path tests; expect the same existing unsupported result for all profiles. No engineering score or calculator mapping is invented. Both engineering test files are flagged in the stop report. The mandated approval-comment text is retained, but numeric calculator equality is not claimed for a non-score programme with no mapping.

## Retained failures and mismatches

Ruling4 blocks push/PR. Unmatched general/law expected values remain unchanged; inputs and the PC rule were not adjusted to force a match. The formula fed Haifa's own PC reproduces each observed score, which explains the discrepancy without approving a test edit.

| Assertion / case | Old expectation | Local result or candidate score | Calculator weighted / PC | Evidence |
|---|---|---|---|---|
| bugsFirst.test.ts:211, psychology aliases | authority_unavailable / unknown | needs_input (actual psychometric month); diagnostic703 from saved104/NITE700/Q140/V130/E135 |702 /699|[exact saved104 case](calculator/rulingsHaifaTau-saved104-nite700-psychology.json)|
| rulingsHaifaTau.test.ts:74, saved102 psychology | authority_unavailable / Haifa note | needs_input (month); diagnostic615 with NITE590 |608 /580|[request+response](calculator/rulingsHaifaTau-saved102-psychology.json)|
| rulingsHaifaTau.test.ts:214, saved104 psychology aliases | same note as proxy | saved needs_input (month); proxy still note; diagnostic620 |613 /580|[request+response](calculator/rulingsHaifaTau-saved-psychology.json)|
| rulingsHaifaTau.test.ts:467, communication aliases |493 / below|620 / eligible_to_apply|613 /580|[request+response](calculator/rulingsHaifaTau-saved-communication.json)|
| rulingsHaifaTau.test.ts:456, saved baseline loop | old low-response493 and old no-score gates | PM611; PC620; law626 before gates |PM611;PC613;law619 /PC580|all saved cases below|
| rulingsHaifaTau.test.ts:59; sekhemCalculatorGap.test.ts:139, full certificate loops | Haifa note / no required inputs | derived105.12 reaches real gates (Hebrew missing); diagnostic PM614, PC623, law629 |PM614;PC615;law622 /PC580|derived cases below|
| sekhemCalculatorGap.test.ts:163 | no required inputs / note | asks haifa_hebrew_qualification; qualified CS third case614 |614 /580|[derived CS](calculator/sekhemCalculatorGap-derived-cs.json)|
| rulingsHaifaTau.test.ts:566, average-only psychology aliases | authority_unavailable | existing no-average helper returns authority_unavailable, then existing verified-information enrichment adds stored cutoff text; no numeric score |not a score case|guard log; no invented calculator input|
| evaluator.test.ts:4877, two defaulted-year cases |702|699|699 /693|[request+response](calculator/evaluator-defaulted-cs.json)|

The H2 average-only rows have no Haifa average/derivable subject record. The guard still returns the note; enabling the pair also makes the existing out-of-block verified-information enrichment decorate that result. Fixing that decoration lies outside the two granted evaluator regions, so it was not changed.

## All captured formula comparisons

This table compares the arithmetic before independent gates. It does not claim a scored evaluator result when gates need more input. Matching these diagnostic rows does not authorize unrelated baseline updates.

| Capture | Programme | avg / bag year / psy year / NITE / Q,V,E | Local NITE score | Calculator score | PC shown | Local score using shown PC | Match |
|---|---|---|---:|---:|---:|---:|---|
| [bugsFirst-audit-psychology](calculator/bugsFirst-audit-psychology.json) |psychology|103.5 / 2026 / 2026 / 700 / 140,130,135|701|701|699|701|yes|
| [evaluator-defaulted-cs](calculator/evaluator-defaulted-cs.json) |cs|102 / 2026 / 2026 / 693 / 140,130,130|699|699|693|699|yes|
| [evaluator-year2015-cs](calculator/evaluator-year2015-cs.json) |cs|102 / 2015 / 2026 / 693 / 140,130,130|702|702|693|702|yes|
| [evaluator-year2020-cs](calculator/evaluator-year2020-cs.json) |cs|102 / 2020 / 2026 / 693 / 140,130,130|699|699|693|699|yes|
| [haifaProgramVerification-high-psychology](calculator/haifaProgramVerification-high-psychology.json) |psychology|120 / 2026 / 2026 / 800 / 150,150,150|818|818|800|818|yes|
| [haifaProgramVerification-low-psychology](calculator/haifaProgramVerification-low-psychology.json) |psychology|80 / 2026 / 2026 / 500 / 100,100,100|493|493|501|493|yes|
| [rulingsHaifaTau-saved-accounting](calculator/rulingsHaifaTau-saved-accounting.json) |accounting|104 / 2026 / 2026 / 590 / 115,110,120|611|611|580|611|yes|
| [rulingsHaifaTau-saved-biology](calculator/rulingsHaifaTau-saved-biology.json) |biology|104 / 2026 / 2026 / 590 / 115,110,120|611|611|580|611|yes|
| [rulingsHaifaTau-saved-communication](calculator/rulingsHaifaTau-saved-communication.json) |communication|104 / 2026 / 2026 / 590 / 115,110,120|620|613|580|613|**no**|
| [rulingsHaifaTau-saved-cs](calculator/rulingsHaifaTau-saved-cs.json) |cs|104 / 2026 / 2026 / 590 / 115,110,120|611|611|580|611|yes|
| [rulingsHaifaTau-saved-economics](calculator/rulingsHaifaTau-saved-economics.json) |economics|104 / 2026 / 2026 / 590 / 115,110,120|611|611|580|611|yes|
| [rulingsHaifaTau-saved-law](calculator/rulingsHaifaTau-saved-law.json) |law|104 / 2026 / 2026 / 590 / 115,110,120|626|619|580|619|**no**|
| [rulingsHaifaTau-saved-math](calculator/rulingsHaifaTau-saved-math.json) |math|104 / 2026 / 2026 / 590 / 115,110,120|611|611|580|611|yes|
| [rulingsHaifaTau-saved-nursing](calculator/rulingsHaifaTau-saved-nursing.json) |nursing|104 / 2026 / 2026 / 590 / 115,110,120|620|613|580|613|**no**|
| [rulingsHaifaTau-saved-occupational_therapy](calculator/rulingsHaifaTau-saved-occupational_therapy.json) |occupational_therapy|104 / 2026 / 2026 / 590 / 115,110,120|620|613|580|613|**no**|
| [rulingsHaifaTau-saved-physiotherapy](calculator/rulingsHaifaTau-saved-physiotherapy.json) |physiotherapy|104 / 2026 / 2026 / 590 / 115,110,120|620|613|580|613|**no**|
| [rulingsHaifaTau-saved-political_science](calculator/rulingsHaifaTau-saved-political_science.json) |political_science|104 / 2026 / 2026 / 590 / 115,110,120|620|613|580|613|**no**|
| [rulingsHaifaTau-saved-psychology](calculator/rulingsHaifaTau-saved-psychology.json) |psychology|104 / 2026 / 2026 / 590 / 115,110,120|620|613|580|613|**no**|
| [rulingsHaifaTau-saved-social_work](calculator/rulingsHaifaTau-saved-social_work.json) |social_work|104 / 2026 / 2026 / 590 / 115,110,120|620|613|580|613|**no**|
| [rulingsHaifaTau-saved-sociology](calculator/rulingsHaifaTau-saved-sociology.json) |sociology|104 / 2026 / 2026 / 590 / 115,110,120|620|613|580|613|**no**|
| [rulingsHaifaTau-saved-statistics](calculator/rulingsHaifaTau-saved-statistics.json) |statistics|104 / 2026 / 2026 / 590 / 115,110,120|611|611|580|611|yes|
| [rulingsHaifaTau-saved102-psychology](calculator/rulingsHaifaTau-saved102-psychology.json) |psychology|102 / 2026 / 2026 / 590 / 115,110,120|615|608|580|608|**no**|
| [rulingsHaifaTau-saved104-nite700-psychology](calculator/rulingsHaifaTau-saved104-nite700-psychology.json) |psychology|104 / 2026 / 2026 / 700 / 140,130,135|703|702|699|702|**no**|
| [sekhemCalculatorGap-continuation-cs](calculator/sekhemCalculatorGap-continuation-cs.json) |cs|102 / 2020 / 2025 / 590 / 115,110,120|606|606|580|606|yes|
| [sekhemCalculatorGap-derived-accounting](calculator/sekhemCalculatorGap-derived-accounting.json) |accounting|105.12 / 2026 / 2026 / 590 / 115,110,120|614|614|580|614|yes|
| [sekhemCalculatorGap-derived-biology](calculator/sekhemCalculatorGap-derived-biology.json) |biology|105.12 / 2026 / 2026 / 590 / 115,110,120|614|614|580|614|yes|
| [sekhemCalculatorGap-derived-communication](calculator/sekhemCalculatorGap-derived-communication.json) |communication|105.12 / 2026 / 2026 / 590 / 115,110,120|623|615|580|615|**no**|
| [sekhemCalculatorGap-derived-cs](calculator/sekhemCalculatorGap-derived-cs.json) |cs|105.12 / 2026 / 2026 / 590 / 115,110,120|614|614|580|614|yes|
| [sekhemCalculatorGap-derived-economics](calculator/sekhemCalculatorGap-derived-economics.json) |economics|105.12 / 2026 / 2026 / 590 / 115,110,120|614|614|580|614|yes|
| [sekhemCalculatorGap-derived-law](calculator/sekhemCalculatorGap-derived-law.json) |law|105.12 / 2026 / 2026 / 590 / 115,110,120|629|622|580|622|**no**|
| [sekhemCalculatorGap-derived-math](calculator/sekhemCalculatorGap-derived-math.json) |math|105.12 / 2026 / 2026 / 590 / 115,110,120|614|614|580|614|yes|
| [sekhemCalculatorGap-derived-nursing](calculator/sekhemCalculatorGap-derived-nursing.json) |nursing|105.12 / 2026 / 2026 / 590 / 115,110,120|623|615|580|615|**no**|
| [sekhemCalculatorGap-derived-occupational_therapy](calculator/sekhemCalculatorGap-derived-occupational_therapy.json) |occupational_therapy|105.12 / 2026 / 2026 / 590 / 115,110,120|623|615|580|615|**no**|
| [sekhemCalculatorGap-derived-physiotherapy](calculator/sekhemCalculatorGap-derived-physiotherapy.json) |physiotherapy|105.12 / 2026 / 2026 / 590 / 115,110,120|623|615|580|615|**no**|
| [sekhemCalculatorGap-derived-political_science](calculator/sekhemCalculatorGap-derived-political_science.json) |political_science|105.12 / 2026 / 2026 / 590 / 115,110,120|623|615|580|615|**no**|
| [sekhemCalculatorGap-derived-psychology](calculator/sekhemCalculatorGap-derived-psychology.json) |psychology|105.12 / 2026 / 2026 / 590 / 115,110,120|623|615|580|615|**no**|
| [sekhemCalculatorGap-derived-social_work](calculator/sekhemCalculatorGap-derived-social_work.json) |social_work|105.12 / 2026 / 2026 / 590 / 115,110,120|623|615|580|615|**no**|
| [sekhemCalculatorGap-derived-sociology](calculator/sekhemCalculatorGap-derived-sociology.json) |sociology|105.12 / 2026 / 2026 / 590 / 115,110,120|623|615|580|615|**no**|
| [sekhemCalculatorGap-derived-statistics](calculator/sekhemCalculatorGap-derived-statistics.json) |statistics|105.12 / 2026 / 2026 / 590 / 115,110,120|614|614|580|614|yes|


## Single-entry release and frozen BGU fixture

`reviewedManifest.json` is canonical_change for **cs @ haifa, 705 ->700, cycle2027**, effective2026-10-29. Its exact_official proof is the complete committed `calculator/rulingsHaifaTau-saved-cs.json`; its SHA256 is calculated over that file's exact bytes. The official response's acceptance cutoff is700, consistent with today's CS page capture. No entry for haifa_cs or haifa_statistics is needed: their supplied production values are already700/630. Their static catalogue mirrors were corrected to700/630, and generic CS's mirror to700.

The new `src/server/admissions/__fixtures__/reviewedManifest-2026-10-29-bgu.json` is byte-identical to `git show b878f97:src/data/admissions/reviewedManifest.json`, verified with cmp. `bguCutoffsManifest.test.ts` changes only its import; all assertions are verbatim and pass.

**Merging would auto-trigger admissions-publication.yml.** No merge or workflow execution occurred, and the publication gate is failed.

## Checks

- npm ci completed in this worktree before implementation.
- Red proof: missing formula module; then all numeric replays green with integration mapping failures still red; approved606 continuation assertion failed against the live-adapter implementation before the evaluator edit. Logs in `checks/`.
- Focused new formula, policy, BGU fixture and both Batch C suites: **377 passed / 5 files** (`checks/haifa-core-final.log`).
- All touched tests: **949 passed,17 failed /966 tests in9 files**. Retained failures are detailed above and in `checks/haifa-focused-final.log`.
- npm run typecheck: passed. npm run lint: exit0, one warning for the unused runHaifaAdmissionsProof import at evaluator.ts:81. Removing it is outside the granted two regions, so it remains; the adapter is untouched.
- `env -u DATABASE_URL npm run guard:pre-pr`: **failed**, **3482 total tests;3457 passed,25 failed;143 files**. Grants/migration consistency, seed dry-run (zero validationErrors) and committed Monday-evidence checks passed before the test stage. No database writes or guard bypass.
- `git diff --check`, evaluator-region byte comparison, allowed-path audit, manifest digest/one-entry validation and BGU fixture cmp are recorded separately.
- No preview/production browser checks, environment changes, Supabase writes, freshness/publication runs, GitHub comments or messaging. Browser execution was used only for official Haifa calculator evidence.

## Out-of-scope blockers (untouched)

| File:line | Why it would need a change |
|---|---|
| src/data/admissions/formulaBackedVerificationLedger.test.ts:67,79,143 | exact123 ->125, withheld19 ->17; Haifa exact24 ->26 and withheld2 ->0 |
| src/lib/admissionsCoverageRetirement.test.ts:15 | pins old aggregate123/19 rather than125/17 |
| src/server/data-health/queries.test.ts:349 | pins the same old aggregate |
| src/lib/publishedCompositeThresholds.test.ts:78 | enabling psychology adds haifa_psychology to static threshold pages (40 ->41) |
| src/lib/seo/sekhemThresholdLinks.test.tsx:144,230 | pins40 pages and absence of the now-valid psychology calculator link |
| src/components/sekhem/SekhemResults.mapping.test.tsx:263 | expects the two Haifa transport responses to be consumed; score806 and threshold700 still pass locally |
| src/server/admissions/evaluator.ts:285–323 | existing verified-information enrichment decorates missing-average psychology notes after dispatch; outside the granted guard/exact block |

No additional manifest-pinning failure was found in the required guard. No out-of-scope files were edited.

## Open items

1. General NITE total versus calculator PC: saved104/NITE700/Q140/V130/E135 gives local703 vs calculator702/PC699. The synthetic590/Q115/V110/E120 cases differ by ten raw points (PC580), so this is not universally only ±1. Preserve NITE per Haifa's published rule; Jorje must resolve the strict approval gate.
2. Two evaluator defaulted-year expectations pin702 from a2015 response, while the mandated2026 default correctly gives699. Permission allowed only mock-assertion changes there, so the scores remain unchanged and failing.
3. Physiotherapy: page waiting630 versus calculator reject639 (waiting640). Policy630 is retained. Both sources are committed.
4. Sociology day-track52252912 versus current two-year52252907. No new track is encoded.
5. IS52256686 remains unresolved; no activation/mapping change. Verified tracks remain on their existing contracts.
6. PM ceil follows Haifa's calculator, while the published worked example rounds569 rather than observed570.
7. Formula contract fingerprints changed. Existing freshness authority checks remain in force; no production refresh/activation is claimed or run.
8. Programme-specific independent gates deliberately remain needs_input when required month/language/selection facts are absent. Formula evidence never substitutes those facts.
