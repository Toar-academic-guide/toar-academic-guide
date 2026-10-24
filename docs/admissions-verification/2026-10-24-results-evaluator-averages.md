# R1 evaluator verification

No visual change.

Students who enter subject grades retain their entered overall average. Record-only profiles get a unit-weighted overall estimate in both single and batch API payloads; the server independently derives it for older clients. BGU/TAU institutional averages use the existing reviewed subject calculators. Average-only institutional proxies and assumed Haifa exam years carry `estimated: true` and a reason. BGU accepts a math units/grade pair. HIT returns student-readable Hebrew instead of implementation notes.

The profile form and profile-to-calculator continuation also accept a record-only profile, and the result view retains that record when matching the derived average. The request marks a derived overall value with `bagrutAverageEstimated: true`; validation checks it against the record. A real derived average below 60 is allowed only with that matching evidence, rather than clamped or silently rejected. Entered averages retain their existing range. No derived estimate is persisted as an official supplied average.

## Missing-details matrix

Counts are before→after, out of the same 53 rows in the exported production catalogue. Baseline code: `809c6cc`. Reproduction: `NODE_OPTIONS=--conditions=react-server npx tsx scripts/diagnose-results-averages.ts <catalogue-directory> <output.json>`, using `progs.json` and `insts.json` from the public API. Freshness is fixture-qualified, official HTTP calls are live. This is not production freshness-health or deployed browser verification.

| Bagrut / psychometric | Inputs | CS | Psychology | Law | Nursing | Business | Total |
|---|---|---|---|---|---|---|---|
| 105 / 650 | Average only | 10→10 | 3→2 | 3→2 | 3→3 | 6→5 | 25→22 |
| 105 / 650 | Average + subjects | 6→5 | 2→1 | 3→3 | 3→3 | 4→2 | 18→14 |
| 105 / 650 | Subjects; overall omitted | 16→5 | 4→1 | 7→3 | 5→3 | 7→2 | 39→14 |
| 110 / 700 | Average only | 11→11 | 2→2 | 3→2 | 3→3 | 6→5 | 25→23 |
| 110 / 700 | Average + subjects | 6→5 | 1→1 | 3→3 | 3→3 | 4→3 | 17→15 |
| 110 / 700 | Subjects; overall omitted | 16→5 | 3→1 | 6→3 | 5→3 | 6→3 | 36→15 |

The explicit fixture is an internal Jewish-sector record marked complete: math, English, physics and computer science at 5 units; Hebrew expression, history, civics, literature and Bible at 2; all grades 90. No psychometric sections or institution qualification confirmations are supplied. “Average + subjects” sends the indicated average. “Subjects; overall omitted” reproduces the broken legacy payload; its derived generic average is 90. The 105/110 label on that row names the comparison profile, not an invented average for those grades.

## Why CS 10→10 and 6→5 do not measure Bug A

The average-only scenario has no subject list, and “average + subjects” already supplied an overall average to the baseline. Neither exercises the dropped-average bug. The correct subject-only comparison is **16→5 CS missing rows** at both psychometric scores. The supplied diagnosis reported 13/23 with its own nine-subject profile; its actual subject-record request is not saved in the supplied directory. This explicit fixture produces 16 on the baseline, so it must not be presented as a reproduction of the exact 13 count.

On the baseline, 11 CS rows explicitly request `bagrut_average`: HUJI, Reichman, Technion, HIT, `mon_12220708940`, `mon_12220708941`, `mon_12220708942`, Sapir, `mon_12220685569`, Netanya and `mon_12341088622`. All 11 stop requesting the overall average after normalization. Ten leave `needs_input`; Technion still needs its separate Hebrew subject. TAU also leaves `needs_input` because its existing institutional average calculator is now called. That accounts for the total **16→5** reduction.

| Institution | Average-only missing inputs | With subjects: missing inputs |
|---|---|---|
| BGU | Psychometric math, verbal and English; math subject record (a math units/grade pair also works) | Psychometric math, verbal and English |
| Haifa | Psychometric math, verbal and English | Those three sections + Haifa Bagrut average; no existing subject-average calculator |
| Reichman | Math units/grade at 110/700; 105/650 is already below a published route, so no missing-input result | None |
| Tel-Hai | Math units/grade | None |
| Afeka | Quantitative psychometric + math units/grade | None; the existing Bagrut route can be assessed |
| MTA / Tel Aviv-Yafo | Math units/grade + psychometric English | Psychometric English |
| Colman | Math units/grade | Colman Bagrut average; no existing subject-average calculator |
| TAU | Subject record | None; TAU average is calculated from the supplied record |
| Technion | Subject record | Subject record still lacks the separate `hebrew` exam expected by its existing adapter; `hebrew_expression` is present |
| HIT | Math units/grade | None; becomes unsupported because there is no verified formula, with Hebrew text |
| Ruppin | Math units/grade | None |

With subjects, the five remaining missing CS rows are **BGU, Haifa, MTA, Colman and Technion**. No CS row still requests `bagrut_average`. No psychometric sections, subject grades, Haifa/Colman formulas, or qualification answers are guessed. BIU and Ariel remain unsupported; the five `mon_*` requirements-only institutions and the two manual-gate colleges do not become numeric admissions merely because their average gap is fixed. Exact per-row before/after inputs for all 23 CS rows in every scenario are retained in `2026-10-24-results-evaluator-matrix.json`.

## BGU Psychology addendum

The requested 112/650, 112/690 and 112/720 tests were run before implementation: all three failed with `degraded/official_source_partial` on the R1 working tree. The psych-only rule already existed, but the adapter rejected it when the source’s registration field changed from open to closed. Numeric thresholds and other rule fields were unchanged.

The adapter now checks admission rules separately from registration availability, retaining the actual and reviewed full source fingerprints. Changed thresholds, mappings, route text and language/qualification conditions still block calculation. Registration is currently closed and is stated in the existing next-action text. The primary student result expresses the requested numeric eligibility, not a final admission or an open registration.

| Bagrut / psychometric | Production walkthrough before | Final live local evaluator replay | Score / threshold | Provenance |
|---|---|---|---|---|
| 112 / 650 | needs_input | pending via regular score route | 734 / 650 | Estimated university average |
| 112 / 690 | unavailable | accepted via psych-only route | 690 / 680 | Supplied psychometric; average unused |
| 112 / 720 | unavailable | accepted via psych-only route | 720 / 680 | Supplied psychometric; average unused |

[Official main-campus BGU Psychology conditions](https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=101&p_pat1=2&p_degree_level=1) specify the alternative “סכם או פסיכומטרי 680”. The source and independent official 112/650 calculator response are retained in `2026-10-25-bgu-psychology-live.json`. The official score endpoint returned **734**; no formula was invented. Boundary tests retain 679 below and 680 accepted on the psych-only route. The existing changed-threshold rejection test passes.

Earlier bulk replays intermittently failed at the score endpoint for 650; a standalone live replay returned 734. When only a proxy BGU average exists and its score replay cannot finish, the result is now honestly `needs_input: [bagrut_subject_record]`, explains that the official calculation did not finish, and invents no score. A genuine outage with an explicitly supplied institutional average remains `degraded`; changed-source rejection is also unchanged. Both distinctions have regression tests. The final isolated matrix replay returned pending/734 for 650 and accepted for 690/720.

## Retained failures for Jorje

The R1 diff does not change any pre-existing assertion value. The original seven failures are deliberately retained. The three pre-existing Psychology status expectations were restored to their original values and also fail under the explicit accepted-route addendum. No test was removed, skipped or weakened to obtain green checks.

Spec citations below refer to the supplied `/workspace/codex-tasks/results-status-diagnosis-2026-10-24.md`: lines 32–37 describe the dropped overall average, 39–42 the unused calculators, 45 permits a flagged institutional proxy, 46 defaults missing Haifa years, and 47 calls for server-side derivation. R1 item 3 selects those estimated defaults. The Psychology addendum explicitly selects accepted via the psych-only route.

| Test (exact failing case) | Retained old expectation | Observed new behavior | Source/spec supporting the change |
|---|---|---|---|
| `evaluator.test.ts` — `requests Haifa psychometric subscores after pair proof is verified` | `needs_input`; three psychometric sections **plus** `haifa_bagrut_average`, `haifa_bagrut_year`, `haifa_psychometric_year` | `needs_input`; only the three psychometric sections; supplied overall average becomes a flagged proxy and missing years default to the cycle | Spec lines 45–47; R1 item 3 |
| `evaluator.test.ts` — `requests missing Haifa years without contacting the official service` | `needs_input: [haifa_bagrut_year, haifa_psychometric_year]` | `needs_input: [haifa_admission_qualification, math_units, math_grade, haifa_hebrew_qualification]`; missing years are defaulted, not asked for | Spec lines 20 and 46; R1 item 3 |
| `evaluator.test.ts` — `requires the official Biology route details before returning a verdict` | Required inputs contain `bgu_bagrut_average` and `psychometric_math` | Required inputs are `psychometric_math`, `bagrut_subject_record`, `psychometric_verbal`, `psychometric_english`; the overall average supplies the flagged BGU proxy | Spec lines 39–47; R1 items 2–3 |
| `evaluator.test.ts` — `still requires actual numeric inputs and never substitutes generic Bagrut for the BGU average` | `needs_input: [bgu_bagrut_average]`; source fetcher never called | The proxy permits source evaluation. This test’s empty fetch mock then produces `degraded/unknown`, with estimate provenance and no invented score; it no longer stops at the average gate | Spec line 45; R1 item 3. The empty fetch mock must be adjudicated too; it does not supply an official response |
| `officialRequirements5.test.ts` — `economics average=undefined psych=420 quant=undefined returns unknown/needs_input through dispatch` | `unknown/needs_input` because Colman average is absent despite overall Bagrut 70 | `below/manual_gate`, explicitly estimated using the overall average; published floors remain unchanged | Spec line 45; R1 item 3; [official Colman economics](https://www.colman.ac.il/academics/ba/economy/) |
| `aliases.test.ts` — `colman_law matches colmgmt_law for missing Colman average` | `unknown`, required `colman_bagrut_average`, despite overall 110 | `pending/manual_gate`, estimated average 110 versus unchanged floor 100; certificate confirmation remains separate | Spec line 45; R1 item 3; [official Colman law](https://www.colman.ac.il/academics/ba/law/) |
| `aliases.test.ts` — `colman_business matches colmgmt_business for missing Colman average` | `unknown`, required `colman_bagrut_average`, despite overall 110 | `pending/manual_gate`, estimated average 110 versus unchanged floor 85; certificate confirmation remains separate | Spec line 45; R1 item 3; [official Colman business](https://www.colman.ac.il/academics/ba/business-administration/) |
| `evaluator.test.ts` — `assesses saved Psychology scores separately from confirmations undefined/undefined` | `pending` for psychometric 700; both additional conditions unconfirmed | `accepted` via the psych-only 680 route; both conditions remain unconfirmed | BGU Psychology source below; Oct 25 addendum explicitly requires accepted via this route |
| `evaluator.test.ts` — `assesses saved Psychology scores separately from confirmations true/undefined` | `pending` for psychometric 700; one condition unconfirmed | `accepted` via the psych-only route; condition statuses remain confirmed/unconfirmed | Same official source and addendum |
| `evaluator.test.ts` — `assesses saved Psychology scores separately from confirmations true/true` | `eligible_to_apply` for psychometric 700; both conditions confirmed | `accepted` via the psych-only route; both confirmations retained | Same official source and addendum |


## Checks and publication exception

- Full suite: **3,247 passed, 10 retained failures, 65 skipped** (3,322 tests). All **36 added regressions pass**.
- Lint and typecheck pass; lint has one pre-existing unused-import warning in `bagrutPolicies.ts`.
- Pre-PR guard was run: **2,406 passed, 8 retained failures**. The two alias cases are outside its selected suite. Migration consistency, catalogue dry-run, operational static grant checks and evidence checks preceding its test stage completed.
- The user explicitly instructed publication with those failures, unchanged expectations and Jorje adjudication. Publishing therefore uses the documented one-time `SKIP_PRE_PR_GUARD=1` exception after running the guard. Failed tests and deployed verification remain owed; this PR is not marked merge-ready.
- No DB writes, migrations, seeds, freshness/publication workflows, environment changes, merge or manual deployment were performed. Local DOM tests exercise the changed profile flow; no direct desktop/mobile browser verification is claimed. Preview/browser CI and Jorje verification remain pending.

Existing official average examples remain **BGU 111.9** and **TAU 108.39**, unchanged: [BGU calculator](https://bgu4u.bgu.ac.il/html/average_calc/index.php), [TAU guide](https://go.tau.ac.il/he/ba/how-to-calculate). No existing reviewed Haifa/Colman subject-average calculator was found; those remain missing when subjects are supplied without an institution average.

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.
