# BIU law: three alternative admission channels

Scope: `biu_law` only. No visual change. The general `law` programme and all other BIU programmes retain their existing behavior.

עודכן לאחרונה: 25.10.2026 · מקור: אתר אוניברסיטת בר-אילן — https://shoham.biu.ac.il/kabala/ ; https://law.biu.ac.il/node/129 (labelled תשפ"ו. Re-verify when the תשפ"ז version posts)

## Sources and confidence

The supplied Oded brief (`/workspace/seo-geo/oded-brief-biu-law-or-channels-2026-10-25.md`) is the encoding contract. The official-source extract in §2 of `/workspace/seo-geo/biu-psych-sekem-packet-2026-10-25.md` lists these independent channels in the BIU תשפ"ז calculator. The faculty page confirms the Bagrut and psychometric channels but labels its text תשפ"ו, so it is supporting evidence only.

- [Official calculator](https://shoham.biu.ac.il/kabala/).
- [Faculty admission requirements](https://law.biu.ac.il/node/129).
- [תשפ"ז admission without psychometric](https://www.biu.ac.il/registration-and-admission/information/acceptance-no-psychometry).
- [General admission requirements](https://www.biu.ac.il/registration-and-admission/information/general-admission-req).

The source hash for the refreshed `biu_law` row is SHA256 `60124ba833887d74252920626d24c3308fccac65c45d2e67ab698e6c593a7adb`, independently calculated from the packet's `calc/calculator-track-remarks.txt`. Its archive directory is `/workspace/seo-geo/raw/biu-psych-sekem-2026-10-25/`. The existing student-facing requirement notes are unchanged; the existing stamp now uses the source date and calculator URL above.

| Channel | Official requirements | Evaluator outcome |
| --- | --- | --- |
| Bagrut | Average ≥112; English 5 units ≥90 | Existing score match, with its existing English classification ≥85 gate |
| Psychometric | Overall ≥720; Bagrut entitlement | Score match; entitlement and language requirements remain unconfirmed |
| Combined | Psychometric ≥600 AND Bagrut average ≥90, plus the institution's combined score | Floors met → existing `unknown` / `estimated`; no score, threshold comparison, or pass claimed |

The published numeric floors are official. The combined-score formula is unpublished and is never reconstructed. The packet reports that BIU's calculator accepts 105/650 (78.12 against 75.00), but MyWay deliberately returns no verdict because it cannot reproduce that score. These calculator values are evidence, not encoded arithmetic. The OR interpretation follows the brief and the institution's parallel channel listings; Jorje must verify this interpretation before readiness.

## Result semantics and missing inputs

A complete Bagrut or psychometric route wins before combined-floor checks. A score match preserves `pending` / `estimated` with `scoreAssessment: meets_threshold`, matching the existing evaluator's separation between scores and institution confirmation. The existing `estimated` + `unknown` presentation says אין הכרעת קבלה and renders the evaluator explanation. `manual_gate` would incorrectly substitute generic selection-stage copy in the current shared component. Combined floors met yield `unknown` / `estimated`, with the official calculator URL and no `scoreAssessment`, invented score, or request for an institutional composite.

There is no BIU certificate-confirmation input. The psychometric route requires an entered Bagrut average to avoid treating an empty Bagrut profile as evidence, imposes no invented average floor, and retains the shared unconfirmed entitlement/language condition. Missing ordinary inputs use the existing `needs_input` behavior. A profile with no psychometric score continues through the unchanged Bagrut route. With psychometric present, `below` is returned only after all available channels have failed; the explanation lists the channel requirements and combined floors.

## Required test table

All six profiles run through both the direct evaluator and full programme evaluator as real unit tests. English classification 85 is supplied by the shared test profile, as in existing BIU tests.

| Input | Expected result |
| --- | --- |
| Bagrut 105, psychometric 650 | `unknown` / `estimated`, never below or a score match |
| Bagrut 113, English 5u92, no psychometric | Score match on Bagrut |
| Bagrut 95, psychometric 730 | Score match on psychometric |
| Bagrut 88, psychometric 650 | Below: combined Bagrut floor 90 fails |
| Bagrut 105, psychometric 590 | Below: combined psychometric floor 600 fails |
| Bagrut 110, English 5u95, no psychometric | Below: Bagrut floor 112 fails |

Additional tests cover inclusive 600/90 and 720 boundaries, missing Bagrut data, independent English subject gates, Bagrut winning over combined-floor uncertainty, and unchanged other programme behavior. API tests cover 105/650 and 95/730. Existing desktop/mobile Playwright cases gain those same two profiles without changing prior expected values. The requirement-tile fixture clock advances to the evidence date so the updated source is not incorrectly treated as future evidence; its expected full-copy fallback remains unchanged.

## Verification

Local verification passed:

- Full Vitest: 223 files / 3,221 tests passed; 11 integration files / 65 tests skipped without their opt-in environments.
- Pre-PR guard: 93 files / 2,359 tests passed, migration consistency, operational-grant checks, catalogue seed dry-run and committed Monday evidence verification. No DB writes or guard bypass. Optional evidence regeneration was skipped because the local raw Monday export is absent.
- Typecheck and formatting passed. Lint passed with the existing unused `AdmissionsRequiredInput` warning in `bagrutPolicies.ts`.
- Local Chromium: all 14 BIU scenarios passed at 390px and 1440px. The 105/650 result renders אין הכרעת קבלה and the calculator guidance; 95/730 produces a score match. Screenshots were read for Hebrew copy, right alignment, Contact/Save prominence, absence of internal text, and overflow.
- Local browser execution used static catalogue mode and Next's webpack dev server because this worktree's shared node_modules lies outside Turbopack's resolution root. No app configuration change was needed.

PR CI and Jorje's official-source/preview verification remain required before readiness. No DB writes, migrations, seeds, freshness/publication runs, environment changes, merge or production deployment are part of this task.

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.
