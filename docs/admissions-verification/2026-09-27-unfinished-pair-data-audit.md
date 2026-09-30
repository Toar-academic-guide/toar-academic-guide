# Plan 002: unfinished pair data audit

Captured on 27 September 2026, after PR #167's Architecture activation.

The repository ledger still reports 127 exact contracts out of 135 pairs, with eight withheld. This audit does not activate another pair or declare Plan 002 complete. Catalogue corrections require the user's pending approval; unresolved selection methods remain required data.

## Official catalogue identity corrections

| Existing pair          | Current official evidence                                                                                                                                                                                                                                                                                  | Proposed correction                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `nutrition__tau`       | TAU's public GraphQL search returns no Nutrition result with `mainSearch: "תזונה"` and `degree: "תואר ראשון"`. A positive control with Management returns four undergraduate results, including node 8267. Unfiltered Nutrition search matches postgraduate biology topics rather than a Nutrition degree. | Remove this institution link; retain Nutrition at its supported institutions.                                     |
| `nutrition__bgu`       | The complete BGU 2027 semester-one feed has 217 rows, `hasMore: false`, and no Nutrition programme row.                                                                                                                                                                                                    | Remove this institution link.                                                                                     |
| `physiotherapy__huji`  | HUJI's current official dataset contains 228 entries in `hogimInfoObj` and no Physiotherapy track.                                                                                                                                                                                                         | Remove this institution link.                                                                                     |
| `tau_infosystems__tau` | TAU node 8267 identifies Management, official programme `122111050000`, with acceptance 610 and rejection 609. This is the target already used by `business__tau` and `tau_business__tau`; it does not identify the legacy standalone Management and Information Systems degree.                           | Merge the legacy entry into the existing Management degree, preserve saved references, and use the official name. |

Official sources:

- [TAU programme search and calculator API](https://go.tau.ac.il/graphql). Search uses the parameters exposed by TAU's public search interface: `langcode: "he"`, `type: "program"`, `isSearch: true`, `mainSearch`, and `degree`.
- [BGU current admissions feed](https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1).
- [HUJI current programme dataset](https://go.huji.ac.il/jjson/huji.json.gz).
- [TAU Management requirements](https://go.tau.ac.il/he/management/ba/management?v=requirements).

Do not count the proposed removals as newly verified calculators. Regenerate the inventory and reconcile the database catalogue after approved corrections are implemented.

## Medicine: two catalogue aliases, one missing final calculation

The TAU programme API identifies node 8215 / programme `011167010000`. Its registration comments currently publish:

| Stage                                               | Current threshold |
| --------------------------------------------------- | ----------------- |
| Preliminary medical suitability                     | 726.44            |
| Final suitability including assessments: acceptance | 743.57            |
| Final suitability including assessments: rejection  | 742.52 or below   |

The earlier ledger explanation that no numeric final cutoff was published was outdated. The actual gap is the final calculation. [TAU describes a 30% preliminary score and 70% non-cognitive assessment combination](https://go.tau.ac.il/he/med/ba/med-doc?v=new-info), but the inspected sources do not supply the component weights and transformation onto the final suitability scale. [NITE states that from 2026 it reports separate component scores and universities apply their own weighting](https://www.nite.org.il/other-tests/mor-mirkam/). [Each component is scored from 150 to 250](https://www.nite.org.il/other-tests/mor-mirkam/scores/calculation/). A 2025 overall-score formula must not be substituted for the 2026 institutional calculation.

TAU's public `getLastScore` calculator returned preliminary medical suitability **745.43** for synthetic psychometric 760 / institutional Bagrut average 115. This is not a final assessment score or final admission verdict. Both `medicine__tau` and `tau_medicine__tau` remain withheld for final verification.

The existing adapter test now includes all three published thresholds in the official response and confirms that preliminary replay still compares against 726.44 and returns `eligible_to_apply`. Characterization passed before changing the ledger explanation: **26 adapter tests passed**. No final-score calculation or capability activation was introduced.

## TAU Physiotherapy

[The current process page](https://go.tau.ac.il/he/med/ba/phys?v=important-info) publishes acceptance **658.60** and rejection **640**, describes a preliminary academic score, and ranks applicants using a score assigned after the interview. The inspected page does not publish how the interview contributes to that final score. The API response for node 8213 / programme `016411010000` had null structured cutoff fields and registration comments.

The existing contract's acceptance value **664.92** differs from the current page. Resolve the threshold's selection stage and final calculation before refreshing the contract or treating an interview-pass flag as sufficient numeric proof. This is a data issue, not a reason to guess the missing weighting.

## College of Management Computer Science

[The programme page](https://www.colman.ac.il/academics/ba/computer-science/) publishes a Bagrut route requiring average **85**, mathematics **5 units / 70** or **4 units / 80**, and passing its internal test. Its psychometric route requires an unpublished weighted score; psychometric **600** and quantitative **120** exempt applicants from the internal test but do not provide the weighted-score formula.

The [official Bagrut calculator](https://wwwi.colman.ac.il/yedion/fireflyweb.aspx?prgname=Reg_Calc_1), reached through the college's calculator page, was exercised through its real browser form using two synthetic full-certificate examples:

| Subject              | Units        | Higher example grade | Lower example grade |
| -------------------- | ------------ | -------------------- | ------------------- |
| Civics               | 2            | 90                   | 70                  |
| English              | 5            | 90                   | 70                  |
| Hebrew expression    | 2            | 90                   | 70                  |
| History              | 2            | 90                   | 70                  |
| Mathematics          | 5            | 90                   | 70                  |
| Religious literature | 2            | 90                   | 70                  |
| Bible                | 3            | 90                   | 70                  |
| **Official average** | **21 total** | **104.29**           | **84.29**           |

The calculator showed English bonuses of 25 and Mathematics bonuses of 35 in both examples. The displayed averages equal the subject-unit weighted averages, rounded to two decimals. This proves the average for these examples; it does not prove every subject bonus, the internal-test outcome, the alternative weighted formula, or the final programme verdict. The calculator's programme dropdown belongs to a separate contact form; no contact information was entered or submitted.

The pair remains withheld. Do not remove its explicit requirements-pair inventory override to claim completion without an approved scope decision.

## Remaining implementation and data

1. Obtain approval for the four catalogue identity corrections, implement them while preserving saved references, and verify the published catalogue.
2. Review, merge and activate the Management correction described below, then verify the deployed profile and results. The legacy information-systems catalogue merge is still a separate pending approval.
3. Obtain TAU's final Medicine assessment weighting/transformation and Physiotherapy interview calculation, with controlled eligible/below proof.
4. Obtain the College of Management's weighted psychometric formula and required score, and model the published route conditions using explicit applicant inputs.
5. Reconcile the resulting inventory, contracts, deployed source authority and database rows; complete focused deployed verification before declaring Plan 002 finished.

Machine-local raw public responses and browser captures are preserved in `/tmp/plan002-final-data-audit/`; they contain no applicant identity or credentials. This document records verified facts and explicit limitations rather than treating partial calculator evidence as full programme proof.

## Management correction and focused verification

Production currently sends Management into Digital Sciences gates. A public synthetic request for psychometric605 / TAU average115 / Mathematics5/70 / English5/100 was rejected with Digital Sciences' P620 and Mathematics5/75-or4/85 requirements and its programme URL. This is a reproduced runtime defect, independent of the pending catalogue corrections.

The current Management page, updated3September2026, publishes six ordinary routes: P680; P640 with official average95; P640 with recognized academic study30hours/average85; Management score at the current cutoff with P620; score at the cutoff with PMA835; and a route without psychometric requiring average104, English5/85, Mathematics5/70 or4/90, and the two named MOOCs85each. Common certificate, language, academic-history and second-major conditions remain required. Mathematics requires four units with a passing grade or quantitative140. Only the specified four MOOCs earn five points each, capped at two courses.

TAU's real [PMA form](https://coller.tau.ac.il/pmaCal) returned835 for P605, Mathematics5/70 and English5/100, and834 for P604 with the same grades. Public score replay returned Management639 and638, respectively. The corrected evaluator returns eligibility for the835case and below for834when no other route is complete. A second below fixture P620/official average90 returned577. Both catalogue aliases reproduce these outcomes. The no-psychometric example uses no dummy score or official score request.

See `2026-09-27-tau-management-live-proof.json` for inputs, current cutoffs, the reviewed policy snapshot and actual replay results. These are derived route decisions from official published rules and real numeric calculator responses, not admissions-office decisions. Source authority is isolated and supplied for this local replay; production has not been activated.

New optional profile fields store the general Management conditions, previous-study route, number of qualifying MOOCs and completion of the two specific MOOCs for the route without psychometric. Existing officialTAU average, mathematics, English and quantitative inputs are reused. False, zero and unknown are preserved separately. The shared API permits an omitted psychometric only for the two implemented Management catalogue IDs. Other programme requests still require the score.

Native browser checks on the existing local server at `http://localhost:3010`:

| Route             | Result                                 | Evidence / limit                                                                                                                                                                                                |
| ----------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`               | Pass for input and result navigation   | Selecting TAU Management and leaving psychometric blank reaches results labelled “ללא פסיכומטרי”; no fabricated score. Exact activation is still awaiting the new source fingerprint.                           |
| `/app/profile`    | Pass for rendered controls and editing | Four independent Management controls accept Yes/No/Unknown and course count0. Existing CS confirmations remain separate. No browser profile save was performed. Component and API tests cover saving/roundtrip. |
| `/app/calculator` | Passed in the local browser            | Selecting TAU Management with blank psychometric shows “ללא פסיכומטרי” and preserves unavailable source authority until activation; production verification remains owed after activation.                      |

The local console reports the existing missing PostHog token; no Management-specific error was observed. No production account or database rows were changed. A browser check exposed that the first optional-score guard hid unavailable source authority with a misleading psychometric prompt. The guard now preserves source-authority results, with a regression test.

User verification after merge and reviewed source activation:

1. Open the academic profile. Enter psychometric605, generic average100, officialTAU average115, Mathematics5/70 and English5/100. Confirm Management's general conditions; set previous academic routeNo, bonus courses0, and the two specific MOOCsNo.
2. Calculate TAU Management. Expect Management score639 and eligibility through PMA835. Change psychometric to604 and expect score638/below because PMA834fails.
3. Clear psychometric, keep the same official average and subjects, and confirm both specific MOOCs85each. Expect eligibility through the route without psychometric, with official average115compared to104.
4. Reload the profile and verify that the saved Management inputs persist, independently of CS inputs.

Production activation must refresh reviewed proof authority for both `tau-business-live` and `tau-business-legacy-live` against the new contract fingerprint after this code is deployed, then repeat these focused cases. Expected temporary unavailability until activation must not be replaced with an estimated verdict.
