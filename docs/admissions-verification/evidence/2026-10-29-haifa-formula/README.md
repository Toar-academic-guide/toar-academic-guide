# Haifa local admission formula — verification and stop record

Status after Follow-up1: **blocked by two newly exposed assertions; local only, no push and no PR**. Ruling(a) resolves the NITE-versus-calculator approval gap. Jorje must verify before readiness. Stop report: `/workspace/codex-tasks/haifa-formula-report.md`.

## Sources and confidence

- [Haifa official calculator](https://applicants.haifa.ac.il/enrollmentChances/index.html), `CandChancesServlet` GET operations `calculateChances` and `calculateBagrutAvg`, year 2026 / semester 001 (תשפ״ז).
- [Official score calculation](https://admissions.haifa.ac.il/score-calculation/): committed HTML (lossless `score-calculation.2026-10-25.html.gz`) and text from 2026-10-25 and official extracts from 2026-10-29. The formula is published; PM ceiling and final half-up rounding are observed calculator behavior. BT and age bands reproduce the supplied calculator observations. The page retains stale year labels; current calculator observations supply the cycle check.
- `programme-pages/`: today's CS, statistics and physiotherapy captures. All programme-specific URLs and thresholds appear below.
- `raw/getDiplomaCourses-001.json`: authoritative course codes and mandatory list.
- `FINDINGS.md`, `SAVED-INPUT-GAP.md`, `model/haifa_model.py`, `test_vectors.json`, `pc_observed.json` preserve the supplied research. Historical research recommendations are subordinate to the brief's binding rulings, especially the unresolved IS mapping.
- `raw/chances1-1793258405009.json`, `raw/probe2-1793258987745.json`, `raw/probe3-1793259682735.json`, `raw/ui-1793259566427.json` preserve all 2026-10-29 raw responses referenced by the replay vectors. The remaining vectors reference the existing `docs/admissions-verification/2026-09-28-haifa-official.json`.
- `production-thresholds-readonly.md`: supplied read-only production observation. No new production queries, SQL, migrations, seed writes, deployments or workflow dispatches were performed.

The formula replays **130/130 matched composite vectors and 8/8 average vectors**, plus the non-exact error-242 case. This validates the arithmetic against the observed PC. It does **not** prove that an inconsistent synthetic NITE total equals the calculator's private Q/V/E conversion. Ruling(a) permits the real NITE result when a sibling assertion reproduces the calculator using its displayed general score. Those sibling assertions now pass; two separate remaining assertions block publication.

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
| rulingsHaifaTau.test.ts:238 (cs/haifa_cs) | 104;2026;2026;590;115/110/120 |493|611|611|580|yes|[request+response](calculator/rulingsHaifaTau-saved-cs.json)|
| rulingsHaifaTau.test.ts:349 (statistics) |104;2026;2026;590;115/110/120|493|611|611|580|yes|[request+response](calculator/rulingsHaifaTau-saved-statistics.json)|
| rulingsHaifaTau.test.ts:368 (math) |104;2026;2026;590;115/110/120|493|611|611|580|yes|[request+response](calculator/rulingsHaifaTau-saved-math.json)|
| sekhemCalculatorGap.test.ts:185 (CS continuation) |102;2020;2025;590;115/110/120|493|606|606|580|yes|[request+response](calculator/sekhemCalculatorGap-continuation-cs.json)|

Follow-up1 updates the saved-profile baselines under ruling(a), including their official sources and newly enabled verdicts. The original611/606 approval comments remain byte-for-byte unchanged. The explicit year2015/2020 scores remain702/699; defaulted2026 cases now assert the approved699 from evaluator-defaulted-cs.json. These numeric/gate expectations pass; the only failures are listed below.

Engineering test changes are the brief's explicit **non-score ruling3**: remove the empty-profile note exception in API and unsupported-path tests; expect the same existing unsupported result for all profiles. No engineering score or calculator mapping is invented. Both engineering test files are flagged in the stop report. The mandated approval-comment text is retained, but numeric calculator equality is not claimed for a non-score programme with no mapping.

## Follow-up1 ruling(a) and remaining failures

The student inputs are unchanged. Each of23 general/law capture cases now has sibling assertions in haifaFormula.test.ts: the real NITE total produces our expected score, then the calculator's displayed PC produces its exact weighted score. Every case cites its actual capture filename. This includes620/613,626/619,623/615,629/622,615/608 and703/702. BugsFirst additionally asserts703 and its699-PC sibling702 beside the missing-month result. No PC estimate table is used.

Approved result-type updates now assert real Hebrew/month/selection gates rather than the old formula-missing note. Approved count updates assert exact125/withheld17, Haifa exact26/withheld0, and41 threshold pages. The static page inventory adds only haifa_psychology to make that count41; the SEO link test changes only41 and the now-valid psychology-link assertion. The two approved Haifa live-call expectations are skipped without touching the806/700 assertions.

The granted evaluator-enrichment change returns Haifa's formula or honest missing-input result unchanged, preserving its official URLs and avoiding unrelated stored-cutoff/date suffixes. The unused adapter import is removed. The student strings formerly at evaluator.ts245/250 are byte-identical to the prior commit.

**Stop condition reached: two other assertions still fail and are intentionally unchanged.**

1. `src/components/sekhem/SekhemResults.mapping.test.tsx:292` expects a scored verdict but renders `עדיין לא מחשבים כאן את ציון הקבלה של חיפה`, despite exact score806, threshold700 and decision eligible_to_apply. Score and threshold assertions pass. The verdict helper `src/lib/sekhemResultPresentation.ts:162` recognizes accepted or scoreAssessment=meets_threshold; the result has eligible_to_apply and no scoreAssessment, so it falls through to resultSourceReason at186–187. The test's own expectedVerdict selector also omits eligible_to_apply and consequently asks for a below message. Both the helper and any additional mapping-test edits are outside the follow-up's grant. A future scoped ruling could instead authorize an explicit scoreAssessment for checked numeric Haifa results, preserving alternate-route semantics; no such extra fix was attempted after the stop condition.
2. `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:222` checks the entire serialized result does not contain650. The rendered explanation only requests the missing psychometric month, but the new snapshot ruleFingerprint contains the digit sequence650 (`...d1f365032...`). This is a hash collision with a copy assertion, not leaked cutoff wording. The assertion is left failing; narrowing it to student-visible fields would change another assertion beyond the approved expected-value edits.

## Changed test-line audit (original brief and Follow-up1)

Each row identifies a changed assertion/value line, old-to-new expectation, our score, calculator score, displayed PC, capture and approval. Gate/count/source rows have no numeric score of their own; the programme capture matrix below supplies the independent score evidence. The earlier611/606 comments remain unchanged. `changed-test-lines.json` preserves every inserted/deleted source line and original/new line numbers, including multiline continuations.

| Test file:line | Old → new assertion/value | Our NITE score | Calculator weighted | Calculator general score | Capture | Comment/ruling |
|---|---|---:|---:|---:|---|---|
| `src/app/api/admissions/evaluate/bugsFirst.test.ts:214` | `kind: 'authority_unavailable',` → `kind: 'needs_input',` | 703 | 702 | 699 | [capture](calculator/rulingsHaifaTau-saved104-nite700-psychology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/bugsFirst.test.ts:217` | `added assertion/value` → `requiredInputs: ['haifa_psychometric_month'],` | 703 | 702 | 699 | [capture](calculator/rulingsHaifaTau-saved104-nite700-psychology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/bugsFirst.test.ts:221` | `replaced Haifa note / transport expectation; see changed-test-lines.json` → `expect(calculateHaifaAdmissionScore(formulaInput)).toEqual({ kind: 'calculated', score: 703 });` | 703 | 702 | 699 | [capture](calculator/rulingsHaifaTau-saved104-nite700-psychology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/bugsFirst.test.ts:223` | `replaced Haifa note / transport expectation; see changed-test-lines.json` → `expect(calculateHaifaAdmissionScore({ ...formulaInput, psychometric: 699 })).toEqual({ kind: 'calculated', score: 702 });` | 703 | 702 | 699 | [capture](calculator/rulingsHaifaTau-saved104-nite700-psychology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:33` | `replaced Haifa note / transport expectation; see changed-test-lines.json` → `const honest = result.kind === (program.id === 'haifa_engineering' ? 'unsupported' : 'needs_input');` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:42` | `replaced Haifa note / transport expectation; see changed-test-lines.json` → `result.score !== undefined &#124;&#124;` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:72` | `expect(psychology.kind).toBe('authority_unavailable');` → `expect(psychology.kind).toBe('needs_input');` | 615 | 608 | 580 | [capture](calculator/rulingsHaifaTau-saved102-psychology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:74` | `expect(psychology.kind).toBe('authority_unavailable');` → `expect(psychology.requiredInputs).toEqual(['haifa_hebrew_qualification', 'haifa_psychometric_month']);` | 615 | 608 | 580 | [capture](calculator/rulingsHaifaTau-saved102-psychology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:76` | `expect(psychology.kind).toBe('authority_unavailable');` → `expect(haifa.requiredInputs).toEqual(['haifa_hebrew_qualification']);` | 615 | 608 | 580 | [capture](calculator/rulingsHaifaTau-saved102-psychology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:214` | `expect(haifaAnswer(result)).toEqual(haifaAnswer(proxyResult));` → `expect(result).toMatchObject({ kind: 'needs_input', requiredInputs: ['haifa_psychometric_month'] });` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-psychology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:215` | `expect(haifaAnswer(result)).toEqual(haifaAnswer(proxyResult));` → `expect(haifaAnswer(proxyResult)).toMatchObject({` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-psychology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:238` | `score: 493,` → `score: 611,` | 611 | 611 | 580 | [capture](calculator/rulingsHaifaTau-saved-cs.json) | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:242` | `officialUrls: ['https://admissions.haifa.ac.il/computer-information-science/program/3210'],` → `officialUrls: ['https://admissions.haifa.ac.il/score-calculation/', 'https://admissions.haifa.ac.il/computer-information-science/program/3210'],` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:276` | `kind: 'exact',` → `kind: 'manual_gate',` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-social_work.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:278` | `decision: 'below',` → `decision: 'eligible_to_apply',` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-social_work.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:280` | `score: 493,` → `score: 620,` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-social_work.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:284` | `officialUrls: ['https://admissions.haifa.ac.il/social-welfare-health-sciences/program/3082'],` → `officialUrls: ['https://admissions.haifa.ac.il/score-calculation/', 'https://admissions.haifa.ac.il/social-welfare-health-sciences/program/3082', 'https://admissions.haifa.ac.il/hebrew-language-proficiency/', 'https://admissions.haifa.ac.il/english-language-proficiency/', 'https://admissions.haifa.ac.il/registration-deadlines-and-entrance-exams/'],` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-social_work.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:308` | `kind: 'exact',` → `kind: 'manual_gate',` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-communication.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:310` | `decision: 'below',` → `decision: 'eligible_to_apply',` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-communication.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:312` | `score: 493,` → `score: 620,` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-communication.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:316` | `officialUrls: ['https://admissions.haifa.ac.il/social-sciences/program/3229'],` → `officialUrls: ['https://admissions.haifa.ac.il/score-calculation/', 'https://admissions.haifa.ac.il/social-sciences/program/3229', 'https://admissions.haifa.ac.il/hebrew-language-proficiency/', 'https://admissions.haifa.ac.il/english-language-proficiency/'],` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-communication.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:327` | `kind: 'exact',` → `kind: 'manual_gate',` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-political_science.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:329` | `decision: 'below',` → `decision: 'eligible_to_apply',` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-political_science.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:331` | `score: 493,` → `score: 620,` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-political_science.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:335` | `officialUrls: ['https://admissions.haifa.ac.il/social-sciences/program/3054'],` → `officialUrls: ['https://admissions.haifa.ac.il/score-calculation/', 'https://admissions.haifa.ac.il/social-sciences/program/3054', 'https://admissions.haifa.ac.il/hebrew-language-proficiency/', 'https://admissions.haifa.ac.il/english-language-proficiency/'],` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-political_science.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:347` | `decision: 'below',` → `decision: 'pending',` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:349` | `score: 493,` → `score: 611,` | 611 | 611 | 580 | [capture](calculator/rulingsHaifaTau-saved-statistics.json) | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:353` | `officialUrls: ['https://admissions.haifa.ac.il/natural-sciences/program/3167'],` → `officialUrls: ['https://admissions.haifa.ac.il/score-calculation/', 'https://admissions.haifa.ac.il/natural-sciences/program/3167', 'https://admissions.haifa.ac.il/hebrew-language-proficiency/', 'https://admissions.haifa.ac.il/english-language-proficiency/'],` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:364` | `kind: 'exact',` → `kind: 'manual_gate',` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:366` | `decision: 'below',` → `decision: 'eligible_to_apply',` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:368` | `score: 493,` → `score: 611,` | 611 | 611 | 580 | [capture](calculator/rulingsHaifaTau-saved-math.json) | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:372` | `officialUrls: ['https://admissions.haifa.ac.il/natural-sciences/program/3161'],` → `officialUrls: ['https://admissions.haifa.ac.il/score-calculation/', 'https://admissions.haifa.ac.il/natural-sciences/program/3161', 'https://admissions.haifa.ac.il/hebrew-language-proficiency/', 'https://admissions.haifa.ac.il/english-language-proficiency/'],` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:396` | `kind: 'exact',` → `kind: 'manual_gate',` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-sociology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:398` | `decision: 'below',` → `decision: 'eligible_to_apply',` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-sociology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:400` | `score: 493,` → `score: 620,` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-sociology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:404` | `officialUrls: ['https://admissions.haifa.ac.il/social-sciences/program/2968'],` → `officialUrls: ['https://admissions.haifa.ac.il/score-calculation/', 'https://admissions.haifa.ac.il/social-sciences/program/2968', 'https://admissions.haifa.ac.il/hebrew-language-proficiency/', 'https://admissions.haifa.ac.il/english-language-proficiency/'],` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-sociology.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:495` | `kind: 'exact',` → `kind: 'manual_gate',` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-communication.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:497` | `decision: 'below',` → `decision: 'eligible_to_apply',` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-communication.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:499` | `score: 493,` → `score: 620,` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-communication.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:502` | `explanation:` → `explanation: 'ציון הקבלה עומד בסף 550 ותנאי הסף האקדמיים שנמסרו מתקיימים. ההחלטה הסופית נתונה לאוניברסיטה.',` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-communication.json) | ruling (a) |
| `src/app/api/admissions/evaluate/rulingsHaifaTau.test.ts:505` | `expect(fetcher).toHaveBeenCalled();` → `expect(fetcher).not.toHaveBeenCalled();` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-communication.json) | ruling (a) |
| `src/app/api/admissions/evaluate/sekhemCalculatorGap.test.ts:136` | `expect(result.kind, row.id).toBe('authority_unavailable');` → `expect(result.kind, row.id).toBe(row.id === 'haifa_engineering' ? 'unsupported' : 'needs_input');` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/sekhemCalculatorGap.test.ts:138` | `expect(result.kind, row.id).toBe('authority_unavailable');` → `expect(result.requiredInputs, row.id).toEqual(row.id === 'haifa_engineering' ? undefined : expect.arrayContaining([` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/sekhemCalculatorGap.test.ts:141` | `expect(result.kind, row.id).toBe('authority_unavailable');` → `expect(result.requiredInputs ?? [], row.id).not.toContain('haifa_bagrut_average');` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/sekhemCalculatorGap.test.ts:161` | `expect(first.result.requiredInputs).toBeUndefined();` → `expect(first.result.requiredInputs).toEqual(['haifa_hebrew_qualification']);` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/sekhemCalculatorGap.test.ts:164` | `kind: 'tracked_missing_rule',` → `kind: 'needs_input',` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/sekhemCalculatorGap.test.ts:171` | `kind: 'tracked_missing_rule',` → `kind: 'exact',` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/sekhemCalculatorGap.test.ts:173` | `replaced Haifa note / transport expectation; see changed-test-lines.json` → `score: 614,` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/sekhemCalculatorGap.test.ts:185` | `expect(result).toMatchObject({ kind: 'exact', score: 493 });` → `expect(result).toMatchObject({ kind: 'exact', score: 606 });` | 606 | 606 | 580 | [capture](calculator/sekhemCalculatorGap-continuation-cs.json) | Haifa local formula / enabled-result type approval |
| `src/app/api/admissions/evaluate/sekhemCalculatorGap.test.ts:187` | `expect(result).toMatchObject({ kind: 'exact', score: 493 });` → `expect(fetcher).not.toHaveBeenCalled();` | 606 | 606 | 580 | [capture](calculator/sekhemCalculatorGap-continuation-cs.json) | Haifa local formula / enabled-result type approval |
| `src/components/sekhem/SekhemResults.mapping.test.tsx:263` | `expect(remainingResponses).toEqual([]);` → `if (profile.institutionId !== 'haifa') {` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/components/sekhem/SekhemResults.mapping.test.tsx:264` | `expect(remainingResponses).toEqual([]);` → `expect(remainingResponses).toEqual([]);` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/components/sekhem/SekhemResults.mapping.test.tsx:265` | `expect(remainingResponses).toEqual([]);` → `expect(fetcher).toHaveBeenCalledTimes(profile.responses?.length ?? 0);` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/formulaBackedVerificationLedger.test.ts:70` | `exact: 123,` → `exact: 125,` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |
| `src/data/admissions/formulaBackedVerificationLedger.test.ts:72` | `withheld: 19,` → `withheld: 17,` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |
| `src/data/admissions/formulaBackedVerificationLedger.test.ts:82` | `haifa: { total: 27, exact: 24, withheld: 2, stale: 0, blocked: 1 },` → `haifa: { total: 27, exact: 26, withheld: 0, stale: 0, blocked: 1 },` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |
| `src/data/admissions/formulaBackedVerificationLedger.test.ts:93` | `).toHaveLength(123);` → `).toHaveLength(125);` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |
| `src/data/admissions/formulaBackedVerificationLedger.test.ts:148` | `expect(withheld).toHaveLength(19);` → `expect(withheld).toHaveLength(17);` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |
| `src/data/admissions/haifaFormula.test.ts:21` | `added assertion/value` → `expect(matched).toHaveLength(130);` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:25` | `added assertion/value` → `expect(` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:36` | `added assertion/value` → `).toMatchObject({ kind: 'calculated', score: row.haifa.weighted });` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:44` | `added assertion/value` → `expect(calculateHaifaBagrutAverageFromCourses(courses)).toBe(Number(row.haifa));` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:48` | `added assertion/value` → `expect(` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:56` | `added assertion/value` → `).toEqual({ kind: 'expired_psychometric' });` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:59` | `added assertion/value` → `expect(` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:67` | `added assertion/value` → `).toMatchObject({ score: 543 });` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:70` | `added assertion/value` → `expect(calculateHaifaBagrutAverage(gapApplicant().extraInputs.bagrutSubjectRecord)).toBe(` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:73` | `added assertion/value` → `expect(calculateHaifaBagrutAverage(undefined)).toBeUndefined();` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:78` | `added assertion/value` → `expect(` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:93` | `added assertion/value` → `expect(calculateHaifaBagrutAverageFromCourses(rows)).toBeUndefined();` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:102` | `added assertion/value` → `expect(result).toMatchObject({ kind: 'tracked_missing_rule', decision: 'unknown' });` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:103` | `added assertion/value` → `expect(result.score).toBeUndefined();` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:104` | `added assertion/value` → `expect(fetcher).not.toHaveBeenCalled();` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:114` | `added assertion/value` → `expect(result).toMatchObject({ capability: 'blocked', sourceLabel: 'מיפוי המסלול טרם אומת' });` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:128` | `added assertion/value` → `expect(result.requiredInputs).toBeUndefined();` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:129` | `added assertion/value` → `expect(result).toMatchObject({ capability: 'exact', score: 701, threshold: 650 });` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:130` | `added assertion/value` → `expect(fetcher).not.toHaveBeenCalled();` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:142` | `added assertion/value` → `expect(result).toMatchObject({` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:143` | `added assertion/value` → `kind: 'needs_input',` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:144` | `added assertion/value` → `requiredInputs: ['psychometric_math', 'psychometric_verbal'],` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:146` | `added assertion/value` → `expect(fetcher).not.toHaveBeenCalled();` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:158` | `added assertion/value` → `expect(result).toMatchObject({ kind: 'tracked_missing_rule', decision: 'unknown' });` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:159` | `added assertion/value` → `expect(result.score).toBeUndefined();` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:160` | `added assertion/value` → `expect(result.explanation).toContain('10');` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:161` | `added assertion/value` → `expect(fetcher).not.toHaveBeenCalled();` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:168` | `added assertion/value` → `expect(result).toMatchObject({ kind: 'unsupported', decision: 'unknown' });` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:169` | `added assertion/value` → `expect(result.institution.programUrl ?? result.officialUrls?.[0]).toBeTruthy();` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:176` | `new paired NITE / calculator-PC case` → `['rulingsHaifaTau-saved-communication.json', 620],` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-communication.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:178` | `new paired NITE / calculator-PC case` → `['rulingsHaifaTau-saved-nursing.json', 620],` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-nursing.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:180` | `new paired NITE / calculator-PC case` → `['rulingsHaifaTau-saved-occupational_therapy.json', 620],` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-occupational_therapy.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:182` | `new paired NITE / calculator-PC case` → `['rulingsHaifaTau-saved-physiotherapy.json', 620],` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-physiotherapy.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:184` | `new paired NITE / calculator-PC case` → `['rulingsHaifaTau-saved-political_science.json', 620],` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-political_science.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:186` | `new paired NITE / calculator-PC case` → `['rulingsHaifaTau-saved-psychology.json', 620],` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-psychology.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:188` | `new paired NITE / calculator-PC case` → `['rulingsHaifaTau-saved-social_work.json', 620],` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-social_work.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:190` | `new paired NITE / calculator-PC case` → `['rulingsHaifaTau-saved-sociology.json', 620],` | 620 | 613 | 580 | [capture](calculator/rulingsHaifaTau-saved-sociology.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:192` | `new paired NITE / calculator-PC case` → `['rulingsHaifaTau-saved-law.json', 626],` | 626 | 619 | 580 | [capture](calculator/rulingsHaifaTau-saved-law.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:194` | `new paired NITE / calculator-PC case` → `['sekhemCalculatorGap-derived-communication.json', 623],` | 623 | 615 | 580 | [capture](calculator/sekhemCalculatorGap-derived-communication.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:196` | `new paired NITE / calculator-PC case` → `['sekhemCalculatorGap-derived-nursing.json', 623],` | 623 | 615 | 580 | [capture](calculator/sekhemCalculatorGap-derived-nursing.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:198` | `new paired NITE / calculator-PC case` → `['sekhemCalculatorGap-derived-occupational_therapy.json', 623],` | 623 | 615 | 580 | [capture](calculator/sekhemCalculatorGap-derived-occupational_therapy.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:200` | `new paired NITE / calculator-PC case` → `['sekhemCalculatorGap-derived-physiotherapy.json', 623],` | 623 | 615 | 580 | [capture](calculator/sekhemCalculatorGap-derived-physiotherapy.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:202` | `new paired NITE / calculator-PC case` → `['sekhemCalculatorGap-derived-political_science.json', 623],` | 623 | 615 | 580 | [capture](calculator/sekhemCalculatorGap-derived-political_science.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:204` | `new paired NITE / calculator-PC case` → `['sekhemCalculatorGap-derived-psychology.json', 623],` | 623 | 615 | 580 | [capture](calculator/sekhemCalculatorGap-derived-psychology.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:206` | `new paired NITE / calculator-PC case` → `['sekhemCalculatorGap-derived-social_work.json', 623],` | 623 | 615 | 580 | [capture](calculator/sekhemCalculatorGap-derived-social_work.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:208` | `new paired NITE / calculator-PC case` → `['sekhemCalculatorGap-derived-sociology.json', 623],` | 623 | 615 | 580 | [capture](calculator/sekhemCalculatorGap-derived-sociology.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:210` | `new paired NITE / calculator-PC case` → `['sekhemCalculatorGap-derived-law.json', 629],` | 629 | 622 | 580 | [capture](calculator/sekhemCalculatorGap-derived-law.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:212` | `new paired NITE / calculator-PC case` → `['rulingsHaifaTau-saved102-psychology.json', 615],` | 615 | 608 | 580 | [capture](calculator/rulingsHaifaTau-saved102-psychology.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:214` | `new paired NITE / calculator-PC case` → `['rulingsHaifaTau-saved104-nite700-psychology.json', 703],` | 703 | 702 | 699 | [capture](calculator/rulingsHaifaTau-saved104-nite700-psychology.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:216` | `new paired NITE / calculator-PC case` → `['bugsFirst-audit-psychology.json', 701],` | 701 | 701 | 699 | [capture](calculator/bugsFirst-audit-psychology.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:218` | `new paired NITE / calculator-PC case` → `['haifaProgramVerification-high-psychology.json', 818],` | 818 | 818 | 800 | [capture](calculator/haifaProgramVerification-high-psychology.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:220` | `new paired NITE / calculator-PC case` → `['haifaProgramVerification-low-psychology.json', 493],` | 493 | 493 | 501 | [capture](calculator/haifaProgramVerification-low-psychology.json) | ruling (a) |
| `src/data/admissions/haifaFormula.test.ts:226` | `added assertion/value` → `expect(calculateHaifaAdmissionScore(capture.localInput)).toEqual({ kind: 'calculated', score: niteScore });` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/data/admissions/haifaFormula.test.ts:228` | `added assertion/value` → `expect(calculateHaifaAdmissionScore({ ...capture.localInput, psychometric: calculatorPC })).toEqual({ kind: 'calculated', score: calculatorScore });` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | Haifa local formula / enabled-result type approval |
| `src/lib/admissionsCoverageRetirement.test.ts:18` | `exact: 123,` → `exact: 125,` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |
| `src/lib/admissionsCoverageRetirement.test.ts:20` | `withheld: 19,` → `withheld: 17,` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |
| `src/lib/publishedCompositeThresholds.test.ts:39` | `added assertion/value` → `'haifa_psychology',` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |
| `src/lib/publishedCompositeThresholds.test.ts:82` | `expect(STATIC_THRESHOLD_PAGE_IDS).toHaveLength(40);` → `expect(STATIC_THRESHOLD_PAGE_IDS).toHaveLength(41);` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |
| `src/lib/seo/sekhemThresholdLinks.test.tsx:145` | `expect(linked).toHaveLength(40);` → `expect(linked).toHaveLength(41);` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |
| `src/lib/seo/sekhemThresholdLinks.test.tsx:232` | `expect(link).toBeNull(); // This programme currently has no verified score or named gate.` → `expect(link).not.toBeNull();` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |
| `src/server/admissions/evaluator.test.ts:1291` | `expect(params.get('bag_avg')).toBe('102');` → `expect(fetcher).not.toHaveBeenCalled();` | 699 | 699 | 693 | [capture](calculator/evaluator-defaulted-cs.json) | Haifa local formula / enabled-result type approval |
| `src/server/admissions/evaluator.test.ts:4878` | `expect(report.results[0].score).toBe(proxy ? 806 : 702);` → `expect(report.results[0].score).toBe(proxy ? 806 : defaulted ? 699 : 702);` | 699 | 699 | 693 | [capture](calculator/evaluator-defaulted-cs.json) | Haifa local formula / enabled-result type approval |
| `src/server/data-health/queries.test.ts:352` | `exact: 123,` → `exact: 125,` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |
| `src/server/data-health/queries.test.ts:354` | `withheld: 19,` → `withheld: 17,` | — (gate/count/source assertion) | — | — | programme capture matrix / explicit count or type ruling | psychology coverage count/link approval |

## All captured formula comparisons

This table compares the arithmetic before independent gates. It does not claim a scored evaluator result when gates need more input. Raw equality in the last column is informational. Under ruling(a), a different NITE result is approved by its passing calculator-PC sibling; it is not a remaining numeric blocker.

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

## Checks after Follow-up1

- Focused11files: **964passed,2failed /966tests** (`checks/followup-focused.log`). The original130 composite vectors,8 average vectors and all23 new NITE/calculator-PC pairs pass.
- npm run typecheck: passed (`checks/followup-typecheck.log`). npm run lint: passed with zero warnings (`checks/followup-lint.log`).
- `env -u DATABASE_URL npm run guard:pre-pr`: **failed:3482total;3480passed,2failed;143files** (`checks/followup-guard.log`). Only the two assertions above remain red. The guard was never bypassed.
- Red-before-production evidence: updated expectations initially left8 enrichment failures; the granted Haifa enrichment change fixes those. Logs in `checks/followup-red.log`.
- ce-simplify-code applied inline to the new diff, without a review pipeline or subagents. Proof tests and required approval comments were retained. No failing assertion was deleted or weakened.
- BGU fixture and manifest proof are unchanged; no new calculator inputs, source payload changes, database writes or production verification were performed.
- No fetch/merge/push/PR because the all-green delivery condition failed. No screenshots, browser verification, deployment, environment changes, workflow dispatches or messages.

Historical first-run logs remain in checks/ with the haifa- prefix; they do not describe the follow-up result.

## Scope boundary after Follow-up1

The approved aggregate/count/link expectations now pass. No further production library/component code was edited. The two remaining assertion failures are recorded above. No ce-code-review or review pipeline ran. The unchanged manifest would auto-trigger admissions-publication.yml only on a later merge; no merge or publication occurred.

## Open items

1. General NITE total versus calculator PC: saved104/NITE700/Q140/V130/E135 gives local703 vs calculator702/PC699. The synthetic590/Q115/V110/E120 cases differ by ten raw points (PC580), so this is not universally only ±1. Preserve NITE per Haifa's published rule; ruling(a) now approves this with exact calculator-PC sibling assertions.
2. Defaulted-year699 expectations are now approved and pass, while the explicit2015/2020 cases remain702/699. Capture: evaluator-defaulted-cs.json.
3. Physiotherapy: page waiting630 versus calculator reject639 (waiting640). Policy630 is retained. Both sources are committed.
4. Sociology day-track52252912 versus current two-year52252907. No new track is encoded.
5. IS52256686 remains unresolved; no activation/mapping change. Verified tracks remain on their existing contracts.
6. PM ceil follows Haifa's calculator, while the published worked example rounds569 rather than observed570.
7. Formula contract fingerprints changed. Existing freshness authority checks remain in force; no production refresh/activation is claimed or run.
8. Programme-specific independent gates deliberately remain needs_input when required month/language/selection facts are absent. Formula evidence never substitutes those facts.
