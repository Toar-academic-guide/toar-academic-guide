## Summary

BIU applicants can check each published floor against their own scores and follow a labelled link to BIU's official calculator. A missed hard floor produces `below` only when every evaluated channel is eliminated; viable or incomplete composite channels do not produce an admission verdict.

Continues merged #277. Law's shipped OR decisions and existing explanation sentence remain intact. No composite formula, cutoff, profile fields, future engineering programmes or calculator network requests are added.

## Per-track behavior

| Track | Before | After |
| --- | --- | --- |
| `biu_law` | #277 bagrut / psych 720 / combined 600+90 as OR channels | Same decisions; adds per-floor rows, named sourced misses and below-only caveats. No-psych below adds both psych floors. |
| General `law` | Bagrut-only route | Same routing and decisions; floor rows, below-only S2/U1 and sourced 600/720 alternative copy. |
| `biu_cs` | Deferred calculator behavior | Checks psych 690 + math product 360 OR quantitative 130 + math 5u90. One viable option gives no verdict. Below includes U1 only. |
| `biu_ee` | Deferred calculator behavior | Psych <650 misses; 650–699 conflicts; ≥700 passes. Checks both quantitative pairs; math/physics are summer-prep soft floors. Below adds the sourced reservist caveat, then U1. |
| `biu_socialwork` | Deferred requirements behavior | Checks psych 580. Conditional Hebrew 120 is informational. Below adds reservist, Haredi-graduate and mechina caveats in order, then U1. |
| `biu_criminology`, `criminology` | Bagrut-only decisions could report below despite entered psych | With psych, the floorless combined channel cannot be eliminated. Without psych, shipped bagrut 98 decisions remain; below adds the psych route without an invented number, S6 and U1. |
| `biu_lifesciences` | Only shipped bagrut alternatives | Adds psych 550 + math product 320 as an OR channel. No-psych decisions remain; below adds the 550/320 line, S7 and U1. |
| `biu_biotech` | Only shipped bagrut route | Adds psych 580 + math product 320 as an OR channel. No-psych decisions remain; below adds the 580/320 line, S8 and U1. |
| `biu_computational_bio` | Only shipped bagrut route | Adds psych 660 + math product 360 as an OR channel. No-psych decisions remain; below adds the 660/360 line, S9 and U1. |
| Psychology / optometry / medicine | HOLD / UNKNOWN | Unchanged. |

EE uses the exact note `בדף הפקולטה באנגלית ובדף מועמדי חו"ל מופיע 650`. Its 75/80 math and 125/130 quantitative source conflicts are also visible. Passing floors never produces `accepted`.

## Verification

- T1–T30 were implemented first: the unchanged implementation produced 29 failing and 5 passing expanded cases. The UI proof test also failed first.
- Final focused run: **73 passing tests**, including T1–T30, #277 law boundaries, full public-dispatcher routing, source conflict bands and table copy/link checks.
- Existing BIU browser suite plus new per-floor cases: **22 passing Playwright tests** against the real local API, on desktop and mobile. The final eight per-floor cases were rerun after the last copy/RTL change and passed. No mocked admission responses, page errors, horizontal overflow or calculator requests. Contact and Save remain visible; table and explanations align right.
- Typecheck, formatting and lint pass. Lint has one pre-existing unused-import warning in `bagrutPolicies.ts`.
- `guard:pre-pr`: the 18 original failures are covered by Jorje’s 2026-10-25 02:10 ruling. The six affected test files pass all **256 tests**; the full guard passes **95 files / 2,408 tests**, plus migration/grant checks, seed dry-run and committed Monday evidence verification. No bypass is used.
- Browser environment: local explicit `CATALOGUE_SOURCE_MODE=static`, webpack dev server. The interactive `ce-test-browser` driver (`agent-browser`) is unavailable; the repository's existing Playwright/Chromium runner supplied browser evidence.
- Supabase state was not changed. Deployed database-backed behavior remains subject to preview verification; local browser evidence uses explicit static mode.

## Existing failing expectations — Jorje ruling required

Jorje resolved all 18 original failing test cases at **2026-10-25 02:10**. Every changed assertion is listed below; some test cases contain more than one assertion. All changes fit ruling (1)–(4), and no production code or other expectations changed in this follow-up. Each changed assertion has a one-line source comment. General law and #277 law decisions remain unchanged.

Rulings (1)–(3) use the recorded [official calculator remarks](https://shoham.biu.ac.il/kabala/) and final brief §1/§2/T4/T16. Ruling (4) adds the three approved routed pairs (CS, EE, social work); exact coverage stays 125. The calculator remains a link only.

| Changed assertion | Approved expectation | Approval |
| --- | --- | --- |
| `biuPublishedRoutesEvaluation.test.ts` — weak `criminology`: decision | `below` → `unknown`; no published hard floor in combined-channel remarks | Approved by Jorje 2026-10-25 02:10 — (1) |
| Same — weak `criminology`: score assessment | `below_threshold` → undefined | Approved by Jorje 2026-10-25 02:10 — (1) |
| Same — weak `biu_criminology`: decision | `below` → `unknown`; no published hard floor in combined-channel remarks | Approved by Jorje 2026-10-25 02:10 — (1) |
| Same — weak `biu_criminology`: score assessment | `below_threshold` → undefined | Approved by Jorje 2026-10-25 02:10 — (1) |
| Same — weak `criminology`: explanation assertion | Drop `למסלול ללא פסיכומטרי בלבד` when the combined channel gives no verdict | Approved by Jorje 2026-10-25 02:10 — (1) |
| Same — weak `biu_criminology`: explanation assertion | Drop `למסלול ללא פסיכומטרי בלבד` when the combined channel gives no verdict | Approved by Jorje 2026-10-25 02:10 — (1) |
| Same — weak `biu_lifesciences`: explanation assertion | Drop `למסלול ללא פסיכומטרי בלבד` when psych is supplied | Approved by Jorje 2026-10-25 02:10 — (2) |
| Same — weak `biu_biotech`: explanation assertion | Drop `למסלול ללא פסיכומטרי בלבד` when psych is supplied | Approved by Jorje 2026-10-25 02:10 — (2) |
| Same — weak `biu_computational_bio`: explanation assertion | Drop `למסלול ללא פסיכומטרי בלבד` when psych is supplied | Approved by Jorje 2026-10-25 02:10 — (2) |
| Same — `criminology`, bagrut just below its floor / psych 800 | `below` → `unknown`; combined channel remains viable | Approved by Jorje 2026-10-25 02:10 — (3) |
| Same — `biu_criminology`, bagrut just below its floor / psych 800 | `below` → `unknown`; combined channel remains viable | Approved by Jorje 2026-10-25 02:10 — (3) |
| Same — `biu_lifesciences`, bagrut just below its floor / psych 800 | `below` → `unknown`; combined channel remains viable | Approved by Jorje 2026-10-25 02:10 — (3) |
| Same — `biu_biotech`, bagrut just below its floor / psych 800 | `below` → `unknown`; combined channel remains viable | Approved by Jorje 2026-10-25 02:10 — (3) |
| Same — `biu_computational_bio`, bagrut just below its floor / psych 800 | `below` → `unknown`; combined channel remains viable | Approved by Jorje 2026-10-25 02:10 — (3) |
| `src/app/api/admissions/evaluate/biu.test.ts` — weak `criminology`: decision | `below` → `unknown` | Approved by Jorje 2026-10-25 02:10 — (1) |
| Same — weak `criminology`: score assessment | `below_threshold` → undefined | Approved by Jorje 2026-10-25 02:10 — (1) |
| Same — weak `biu_criminology`: decision | `below` → `unknown` | Approved by Jorje 2026-10-25 02:10 — (1) |
| Same — weak `biu_criminology`: score assessment | `below_threshold` → undefined | Approved by Jorje 2026-10-25 02:10 — (1) |
| `formulaBackedVerificationLedger.test.ts` — ledger length | 138 → 141 | Approved by Jorje 2026-10-25 02:10 — (4) |
| Same — completion aggregate assertion | 138 total / 12 withheld → 141 / 15; exact stays 125 | Approved by Jorje 2026-10-25 02:10 — (4) |
| Same — totals by institution assertion | BIU 7 total / 7 withheld → 10 / 10; BIU exact stays 0 | Approved by Jorje 2026-10-25 02:10 — (4) |
| Same — withheld-record count assertion | 12 → 15 | Approved by Jorje 2026-10-25 02:10 — (4) |
| `src/data/degrees/index.test.ts` — denominator assertion | 138 → 141 | Approved by Jorje 2026-10-25 02:10 — (4) |
| Same — totals by institution assertion | BIU 7 → 10 | Approved by Jorje 2026-10-25 02:10 — (4) |
| `calculatorCoverage.test.ts` — completion aggregate assertion | 138 total / 12 withheld → 141 / 15; exact stays 125 | Approved by Jorje 2026-10-25 02:10 — (4) |
| `src/server/data-health/queries.test.ts` — formula verification assertion | 138 total / 12 withheld → 141 / 15; exact stays 125 | Approved by Jorje 2026-10-25 02:10 — (4) |

The [verification note](https://github.com/Toar-academic-guide/toar-academic-guide/blob/codex/biu-floor-tracks/docs/admissions-verification/2026-10-25-biu-floors.md) records the original failures and the ruling. This PR is a draft pending UI approval and preview verification.

## NEW UI ELEMENT: needs Jorje/Amit approval before merge

The per-floor table uses the existing `AdmissionRequirements` component and shared styles. Caveats and the psych alternative remain copy in the existing result explanation. Screenshots are review artifacts; no UI approval is claimed.

Desktop 1280:

![EE source conflict, desktop 1280](https://raw.githubusercontent.com/Toar-academic-guide/toar-academic-guide/codex/biu-floor-tracks/docs/ui-verification/2026-10-25-biu-floors/ee-desktop-1280.png)

Mobile 390:

![EE source conflict, mobile 390](https://raw.githubusercontent.com/Toar-academic-guide/toar-academic-guide/codex/biu-floor-tracks/docs/ui-verification/2026-10-25-biu-floors/ee-mobile-390.png)

Below, mobile 390:

![EE below with sourced caveats, mobile 390](https://raw.githubusercontent.com/Toar-academic-guide/toar-academic-guide/codex/biu-floor-tracks/docs/ui-verification/2026-10-25-biu-floors/ee-below-mobile-390.png)

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.

Related: #277
