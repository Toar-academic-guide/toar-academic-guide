# Haifa CS: official regular cutoff and calculator link

Checked: 2026-10-30. Programme: `haifa_cs` at `haifa`.

Official source: https://admissions.haifa.ac.il/computer-information-science/program/3210/

Captured HTML: `/workspace/qa-evidence/haifa-cs-pr/off_haifa_cs_3210_2026-10-30.html`.
SHA256, independently checked against the exact capture bytes:
`7daea619ad71622a283aa2da04c7570d42b719c8d31e3c7ecfc35de1e6731b0d`.

## Before and after

| Condition | Before | After |
| --- | --- | --- |
| Published regular cutoff | Missing from notes; existing threshold `{ haifa: 700 }` | סכם 700 לפחות (תשפ״ז); threshold unchanged |
| Waiting band | Missing | 680–699; departmental admission committee review |
| Psychometric minimum | ציון פסיכומטרי מינימלי: 650 | Removed; not published for this regular route |
| Bagrut average minimum | ממוצע בגרות מינימלי: 85 | Removed; not published for this regular route |
| Mathematics | 5 יח"ל מתמטיקה — חובה | 4 units at 90 or 5 units at 75; the former mandatory-five-unit statement contradicts the source |
| English | Missing | טרום בסיסי לפחות |
| Hebrew | Missing | 120 in Yaelnet or the university placement test, or completion of the preparatory Hebrew in Academia course |
| Requirements stamp | Missing | 30.10.2026, linked to the official programme page |
| MyWay calculator link | Hidden because no composite cutoff note matched | `/sekhem-calculator?program=haifa_cs` |

## Source method and encoding

Extracted visible text from the supplied HTML capture and checked the regular admission section separately from alternate routes. The capture uses typographic right double quotes (U+201D) in the year/unit abbreviations; the approved notes use Hebrew gershayim (U+05F4), consistent with Hebrew punctuation in the catalogue. Whitespace and quote shapes were normalized only for source comparison.

The regular section gives 705 for תשפ״ו and 700 for תשפ״ז, with waiting band 680–699. It gives English pre-basic, Hebrew 125 for תשפ״ו / 120 for תשפ״ז or the published course alternative, and mathematics 4 units at 90 or 5 units at 75. It explicitly sends waiting-band candidates to the departmental committee. This change encodes only the תשפ״ז regular route. Ofek, reservist, Open University and other alternate routes are outside scope.

The exact three notes are byte-identical in `academicPrograms.ts` and `catalogueContentRepair.json`. The repair row has `coverage: published_conditions`, the source SHA256 above and `checkedAt: 2026-10-30`. Note 1 matches the existing published composite cutoff regex with numeric capture 700; the existing programme page then exposes the calculator link. No formula, threshold, programme ID or calculator capability is changed.

## Serializer scope and URLs

Oded authorized exactly two production serializer edits: add `haifa_cs` to the repair allow-list and wrap that branch with `applyHaifaOfficialUrls(applyCatalogueContentRepair(serialized))`.

Content repair alone would leave persisted legacy calculator URLs untouched. The composed branch preserves the official programme URL and corrects both `calculatorUrl` and `officialCalculatorUrl` to `https://admissions.haifa.ac.il/score-calculation/`. Psychology has no entry in the Haifa URL map and is unaffected.

A parameterized test compares the full serialized object for all 11 other repaired IDs against the former content-repair branch followed by the existing post-processing. This includes legacy `jerusalem_academy_graphic_design` and `mon_12220708942_cs` inputs constructed from their current institution seed fixtures. The existing legacy-Haifa-URL test is unchanged.

No database write is performed. A persisted row with old notes is repaired after a successful database read; database errors retain their existing failure behavior. The local serializer test is not a claim of live database verification.

## Verification

Tests were added first: the three new Haifa CS regressions failed on the old notes; the other 104 tests in those files passed, including all 11 full-object comparisons.

- Focused regressions: 3 files / 107 tests passed, including the programme page, source stamp, stale DB-note repair, all three official URLs and the 11-ID full-object comparisons.
- `env -u DATABASE_URL npm run guard:pre-pr`: passed; local migration consistency, catalogue seed dry-run, operational grants, committed admissions evidence and 143 files / 3,626 targeted tests passed.
- `env -u DATABASE_URL CI=true CATALOGUE_SOURCE_MODE=static npm run test:coverage`: passed; 322 files passed / 14 skipped; 5,527 tests passed, 1 expected failure and 101 skipped. Coverage: statements 81.21%, branches 77.43%, functions 79.95%, lines 82.07%.
- `npm run typecheck`: passed.
- Source SHA256, all five supplied regular-route source strings (normalized whitespace/quote shapes only) and byte-identical static/repair notes verified. The production regex captures exactly 700.
- Fetched `origin/main`; the task branch already contained the current base, so no merge was needed.

Three existing expectations were updated with explicit CEO value approval and Oded file authorization on 2026-10-30: add `haifa_cs` to the exact list in `publishedCompositeThresholds.test.ts` (original line 80), change that list length from 41 to 42 (original line 84), and change the linked-page count from 41 to 42 in `sekhemThresholdLinks.test.tsx` (original line 145). Each has the required approval comment. No other existing expectation changed; Haifa CS is the single additional page with a published cutoff and calculator link.

Direct browser, Vercel preview and deployed Supabase verification have not been performed in this run. No production data access, SQL, environment changes, deployment or PR merge was performed. Preview visual verification remains for the product approval gate.

visible copy change: needs Amit 1280/390 yes before merge. Standing product rules also require Yonatan approval through Jorje before merge.
