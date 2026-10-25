# BIU per-floor checks — 25.10.2026

Authority: `/workspace/seo-geo/oded-brief-biu-formula-2026-10-25.md`, v4, including Jorje's A/B and Q1–Q3 rulings. Builds on merged #277 (`8b731e5`). No institution composite or cutoff is calculated. Passing floors never establishes admission.

The recorded source packet is `/workspace/seo-geo/raw/biu-psych-sekem-2026-10-25/`, especially `calc/calculator-track-remarks.txt`, `eng-prereq`, `ee-track`, `cs-*`, `law-node129`, `sw-admission`, `crim-ba`, `ls-104*` and `www-*`. The EE 650 source qualification is documented in `/workspace/seo-geo/biu-conversion-table-search-2026-10-25.md`. No fresh source requests were made. The BIU calculator is strictly a link; production evaluation and tests do not call it.

## Encoded floors and sources

| Programme | Channels checked | Source |
| --- | --- | --- |
| `biu_law` | Shipped bagrut 112 + English 5u90 + classification 85; psych 720 + unconfirmed bagrut entitlement; combined psych 600 + bagrut 90. Existing decisions and law explanation sentence are preserved. | [Law faculty](https://law.biu.ac.il/node/129), [calculator](https://shoham.biu.ac.il/kabala/) |
| `biu_cs` | Option A: psych 690 + math product 360. Option B: quantitative 130 + math 5u90. | [CS faculty](https://cs.biu.ac.il/he/tracks/bsc-in-computer-science), calculator |
| `biu_ee` | Psych displayed 700, verdict minimum 650; either quantitative 130 + math 5u75, or quantitative 125 + math 5u85; physics 5u80. Math and physics are soft summer-course floors. | [Engineering prerequisites](https://engineering.biu.ac.il/prerequisites), [EE track](https://engineering.biu.ac.il/tracks/Electrical_Engineering), calculator |
| `biu_socialwork` | Psych 580. Conditional Hebrew 120 is informational and never eliminates the channel. | [Social work faculty](https://social-work.biu.ac.il/Admission_BA), calculator |
| `biu_criminology`, `criminology` | Combined channel has no published floors and cannot be eliminated. Shipped bagrut-only 98 + classification 85 is preserved when psych is absent. | [Criminology faculty](https://criminology.biu.ac.il/tracks/BA), [no-psych table](https://www.biu.ac.il/registration-and-admission/information/acceptance-no-psychometry), calculator |
| `biu_lifesciences` | Psych 550 + math product 320, OR shipped bagrut 108 + product 320 + two qualifying sciences, OR bagrut 108 + math 5u85; bagrut channels retain classification 85. | [Life sciences](https://life-sciences.biu.ac.il/node/10404), no-psych table, calculator |
| `biu_biotech` | Psych 580 + math product 320, OR shipped bagrut 108 + product 320 + two qualifying sciences + classification 85. | [Biotechnology](https://life-sciences.biu.ac.il/tracks/10423), no-psych table, calculator |
| `biu_computational_bio` | Psych 660 + math product 360, OR shipped bagrut 112 + math 5u95 + classification 85. | [Computational biology](https://life-sciences.biu.ac.il/tracks/10424), no-psych table, calculator |

General `law` retains its shipped bagrut-only routing. Psychology, optometry and medicine retain their existing dispatcher outputs. No future engineering programmes or profile fields were added.

EE psych 649 misses; 650–699 is conflicting; 700 passes. The exact note is `בדף הפקולטה באנגלית ובדף מועמדי חו"ל מופיע 650`, with the [English faculty page](https://engineering.biu.ac.il/en/prerequisites) and [foreign-applicant page](https://www.biu.ac.il/page/9139) included as sources. The English evidence is a recorded search snippet, not an archived full page. Math 75–79 and quantitative 125–129 also retain their source-conflict bands.

Every below result names the missed hard floors, student values and sources. Special-channel caveats follow the track-specific S1–S9 order, followed by U1 with both university URLs. No-psych below results keep their decision and append the sourced psych alternative; criminology has no numeric psych floor.

## Tests and delivery gate

T1–T30 were written and run before production edits: 29 failed, 5 passed (34 expanded cases). The UI proof test also failed before implementation. The final focused run passes 73 tests, including public-dispatcher coverage for every new track, EE math-conflict boundaries, five-unit math enforcement and the unchanged law decision/boundary cases.

The initial implementation retained existing score, decision, copy and total-count expectations; the approved follow-up below updates only the assertions covered by Jorje’s ruling. Only the broad #277 exclusion test and inventory membership were narrowed/expanded as expressly requested by brief §2. The guard includes the new evaluator and UI proof tests.

### Existing expectations conflicting with the final brief

| File / test | Existing expectation retained | Required behavior / authority |
| --- | --- | --- |
| `biuPublishedRoutesEvaluation.test.ts`: weak `criminology` / `biu_criminology` | Bagrut 70, psych 420 → below | Unknown: no published hard floor on the combined channel. Brief T16, §2; calculator remarks for criminology. |
| Same file: weak life sciences / biotech / computational biology explanations | Contains `למסלול ללא פסיכומטרי בלבד` despite entered psych | Below now evaluates every published channel. That old sentence would falsely say only the bagrut route was checked. Brief §1, T1/T2/T19; calculator remarks. |
| Same file: average just below bagrut floor with psych 800 (`criminology`, `biu_criminology`, life sciences, biotech, computational biology) | Below | Unknown: a combined channel remains viable. Brief §1, T4/T16; calculator remarks. |
| `src/app/api/admissions/evaluate/biu.test.ts`: weak `criminology` / `biu_criminology` | Below + below_threshold | Unknown, no score assessment. Same T16/source conflict. |
| `formulaBackedVerificationLedger.test.ts`: record count, completion totals, withheld count | 138 total, 12 withheld, 7 BIU | 141 total, 15 withheld, 10 BIU after adding CS, EE and social work. Exact remains 125. Brief §2 routing. |
| `src/data/degrees/index.test.ts`: denominator | 138 | 141; same three routed pairs. Brief §2 routing. |
| `calculatorCoverage.test.ts`: completion totals | 138 total / 12 withheld | 141 / 15. Brief §2 routing. |
| `src/server/data-health/queries.test.ts`: readiness totals | 138 total / 12 withheld | 141 / 15. Brief §2 routing. |

The first guard run fails with **18 tests in 6 files**, while **2,390 tests pass**. Migration grant checks, migration consistency, catalogue seed dry-run and committed Monday evidence verification pass; the raw local Monday export is absent, so its optional regeneration check is skipped. No database writes occur.

### Jorje ruling — Approved by Jorje 2026-10-25 02:10

All 18 original failures fit the four approved categories: floorless criminology combined channels give no verdict; supplied psych means the three science tracks are not bagrut-only checks; viable psych channels prevent below at the bagrut boundary; and adding three routed BIU pairs changes aggregates to 141 total / 15 withheld / 10 BIU, with exact still 125.

Only the six affected test files and ruling/verification documentation change in this follow-up. Every changed assertion has a one-line source comment, and the prepared PR body enumerates each assertion under the existing ruling heading as `Approved by Jorje 2026-10-25 02:10`. Both criminology IDs also stop asserting bagrut-only explanation copy: that copy cannot describe their approved combined-channel no-verdict result. General law and #277 law decisions are unchanged.

The six affected test files pass all 256 tests. The full pre-PR guard passes all 95 files / 2,408 tests, plus migration/grant checks, catalogue seed dry-run and committed Monday evidence verification, without bypass. Typecheck and scoped lint also pass. The PR remains a draft pending UI approval and preview verification.

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.
