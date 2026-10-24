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
- `guard:pre-pr`: **fails on retained legacy expectations**; migration/grant checks, seed dry-run and committed Monday evidence checks pass. No bypass is used.
- Browser environment: local explicit `CATALOGUE_SOURCE_MODE=static`, webpack dev server. The interactive `ce-test-browser` driver (`agent-browser`) is unavailable; the repository's existing Playwright/Chromium runner supplied browser evidence.
- Supabase state was not changed. Vercel preview and deployed database-backed behavior remain unverified because publication is blocked by the guard, not missing Vercel variables.

## Existing failing expectations — Jorje ruling required

All existing expected score, decision, copy and aggregate-count values are retained. Brief §2 explicitly permits narrowing the blanket law exclusion test and updating routing-inventory membership.

| Retained test | Conflict and source |
| --- | --- |
| `biuPublishedRoutesEvaluation.test.ts`: weak `criminology` and `biu_criminology` | Expects below for 70/420. Brief T16/§2 and [official calculator remarks](https://shoham.biu.ac.il/kabala/) provide no hard floor in the combined channel, so it remains unknown. |
| Same file: weak life sciences, biotech, computational biology copy | Expects `למסלול ללא פסיכומטרי בלבד`. Brief §1/T1/T19 requires checking every channel when psych is supplied, so that sentence would be false. Sources: recorded calculator remarks and [BIU no-psych table](https://www.biu.ac.il/registration-and-admission/information/acceptance-no-psychometry). |
| Same file: bagrut just below its floor with psych 800, for both criminology IDs and the three science tracks | Expects below. Brief T4/T16 and the recorded calculator floors leave a viable combined channel, so there is no verdict. |
| `src/app/api/admissions/evaluate/biu.test.ts`: weak criminology, both IDs | Expects below + below_threshold. Same T16/source conflict. |
| `formulaBackedVerificationLedger.test.ts`: ledger length, totals, withheld count; `src/data/degrees/index.test.ts`, `calculatorCoverage.test.ts`, `src/server/data-health/queries.test.ts`: totals | Retains 138 total / 12 withheld / 7 BIU. Brief §2 routes three additional pairs, giving 141 total / 15 withheld / 10 BIU; exact remains 125. |

The guard reports **18 failures in 6 files**, with **2,390 passing tests**. The [verification note](https://github.com/Toar-academic-guide/toar-academic-guide/blob/codex/biu-floor-tracks/docs/admissions-verification/2026-10-25-biu-floors.md) records the sources and delivery blocker. The normal pre-push hook runs the same guard, so these retained failures prevent a push and PR publication.

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
