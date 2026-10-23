# MTA nursing and economics-management — 2026-10-23

Implemented for Jorje's verification. This document does not certify readiness to merge. Preserve `tlvyaffo_business` and its existing catalogue label; the official BA is **כלכלה וניהול**.

## Sources

- [Official undergraduate admission conditions](https://www.mta.ac.il/conditions_for_applying): supplied `mta_conditions.txt` and `.html` in `/workspace/pm-research/raw/official/`, sections **כלכלה וניהול**, **מדעי האֲחָיוּת (סיעוד)**, and **תנאי סף כלליים**. The text extract is one line; identify the sections by their headings rather than line numbers. Text SHA-256: `0d7e6225bf2258462c65121666acb49da301791833217cefebaccebf65d6039e`; HTML SHA-256: `be104ec4b8a632ca61e53ad9e4c7f82f8cf74f4e2d72bba1a8b3cab264f461c5`.
- [Official combined calculator](https://mtamn.mta.ac.il/yedion/fireflyweb.aspx?prgname=Reg_Calc_1): loaded and operated in Chromium on 2026-10-23. Its `CalcMTA` JavaScript matches the shared helper. [Captured inputs/results](2026-10-23-mta-official-calculator.json) contain 15 live comparisons, replayed by `mtaCombinedScore.test.ts`.
- The supplied `mta_cs.html` corroborates the calculator link. The economics-management `.html.txt` bot-wall stub was not used as evidence.

## Encoded thresholds

All boundaries are inclusive. Bagrut means the entered average, pending MTA's calculation and eligibility confirmation.

| Program / route | Numeric conditions | Additional conditions |
| --- | --- | --- |
| Nursing automatic | Bagrut ≥90 **and** psychometric ≥520 | General conditions; English ≥85 |
| Nursing committee | Bagrut ≥90 **and** psychometric ≥500 | Committee and interview; general conditions; English ≥85 |
| Nursing committee | Psychometric ≥520 | Bagrut eligibility; committee and interview; English ≥85 |
| Nursing committee | Combined ≥515 **and** psychometric ≥430 | Committee and interview; general conditions; English ≥85 |
| Economics-management | Bagrut ≥94 **and** psychometric ≥550 | Normal math; English ≥85; general conditions |
| Economics-management | Psychometric ≥580 | Bagrut eligibility; normal math; English ≥85 |
| Economics-management | Combined ≥580 | Normal math; English ≥85; general conditions |
| Economics-management, explicit math exception | Psychometric ≥600 **and** combined ≥620 | **4 units math ≥65**; English ≥85; general conditions |
| Economics-management, without psychometric | Bagrut ≥96 | Normal math; English ≥85; general conditions |

Normal economics-management mathematics: **4 units ≥80 or 5 units ≥55**. English is the psychometric/Amir classification score, not the Bagrut English grade. The general conditions also cover an eligible certificate, mathematics 3 units ≥55, English Bagrut 4/5 units ≥55, and conditional Hebrew requirements (YAEL ≥95 where applicable); these remain institutional confirmations, not inferred from an average. No unsupported biology gate was retained.

## Formula confidence and route judgment

`Math.round((psychometric + (bagrut - 30) * 10) / 2)` is the **official calculator arithmetic**. Its domain is `60 < bagrut < 130` and `200 < psychometric <= 800`. The shared helper preserves MTA CS behavior. Live examples include 85/479 →515, 85/478 →514, 90/559 →580, 90/558 →579, 94/600 →620, and 96/600 →630. At 90/429 the calculator returns 515, but nursing still falls below because psychometric is under 430.

Overall confidence remains **estimated / partial**: MyWay does not reproduce MTA's institution-weighted Bagrut average or certify the student's certificate. The calculator itself reserves the determining average and combined score to MTA's registration centre. Every numerical match therefore remains `pending`; none returns `accepted`. English or math failure yields `below` while retaining a separate numeric `meets_threshold`. Missing business math/English yields `needs_input` for the missing ordinary fields only. Profiles below every numeric alternative do not receive irrelevant subject prompts.

The Bagrut-only 96 route is explicitly listed for this college BA. It was not inferred from an elite-university pattern. The 600/620 route explicitly permits weaker 4-unit mathematics than the normal route; it is evaluated separately. Several routes overlap: tests below 94/550 or nursing 90/500 check the remaining combined route rather than incorrectly expecting an overall failure. Nursing's interview belongs to the committee routes; it is not added to the separately published automatic route.

## Verification performed

- Focused threshold/API tests cover weak 70/420 →`below` for both IDs, inclusive boundaries, rounding, missing inputs, English, mathematics, subject-record precedence, and the 600/620 exception. The real API handler is exercised with mocked catalogue reads and no database writes.
- Full unit suite: **2,185 passed; 65 skipped** (204 files passed; 11 skipped). Existing CS, Reichman, Colman and Ono coverage remains green.
- `npm run guard:pre-pr`: **1,385 passed**, migration consistency, seed **dry-run**, operational-grant checks, and committed evidence verification passed. No migration or seed was applied. New MTA tests are included in the guard.
- Typecheck, formatting and lint passed. Lint reports one existing unused-type warning in unchanged `bagrutPolicies.ts`. `CATALOGUE_SOURCE_MODE=static npm run build` passed.
- Existing Playwright infrastructure, against the local production build in explicit static mode: **14 passed**. Desktop 1440px home flow and mobile 390px calculator flow verify the real API responses, weak/automatic/committee/matched/missing-math states, visible Contact and Save, right-aligned explanations, no overflow, and both program pages. No network response is mocked in these browser tests.
- Read the visible Hebrew in the desktop and mobile screenshots. [Evidence directory](../ui-verification/2026-10-23-mta-nursing-business/) contains responses and screenshots; examples: [nursing weak desktop](../ui-verification/2026-10-23-mta-nursing-business/nursing-weak-1440.png), [nursing committee mobile](../ui-verification/2026-10-23-mta-nursing-business/nursing-committee-390.png), [business match desktop](../ui-verification/2026-10-23-mta-nursing-business/business-match-1440.png), [business missing math mobile](../ui-verification/2026-10-23-mta-nursing-business/business-missing-math-390.png).

## Gaps and handoff

Jorje must rerun focused checks at the PR tip, inspect the official sources and preview, and decide readiness. Amit retains merge and publication authority. No Supabase writes, publication/freshness jobs, external settings changes, or manual deployment were performed. The in-repo catalogue copy replaces stale 72/440 and 70/450 placeholders; production DB catalogue copy was not published and may still need an explicitly approved update. Local static browser verification does not prove deployed database catalogue state. `/internal/data-health` and authenticated flows were not changed or claimed verified.

Prep-course completion, exceptional admission, prior degrees, nursing conversion, dual degrees, the separate `tlvyaffo_economics` ID and all other MTA programs are outside this batch. A below result covers the modeled routes and is not an institutional rejection. The conditions page is mutable; no admissions year or freshness date was invented. Initial dev-server failures were caused by the worktree's shared dependency symlink/Turbopack resolution and development manifest regeneration; all final browser evidence comes from the successful local production build.
