# Technion winter תשפ״ז thresholds — verification and PR body draft

PR title: `fix(admissions): Technion cutoffs from winter תשפ"ז table`

Status: **blocked; local commit only**. The authorized EE pin now passes. `npm run guard:pre-pr` still exits 1 on eight other existing medicine-related expectations; the instruction to leave other expectations untouched prevents making those tests green or publishing the branch.

The first programme row was previously taken from the spring table (`tablepress-482`). Parsing now reads only winter `tablepress-485`, with an exact programme-title match. An absent winter table produces no cutoff. Medicine has no eligible/below verdict at any score, including through its general `medicine` alias. Its verification contract and numeric evidence entry are removed, and its two ledger pairs are withheld. Engineering remains unsupported with no verdict.

| programme | old | new |
| --- | --- | --- |
| technion_ee | 94 | **91.5** |
| technion_me | 92 | **87** |
| technion_medicine | 92; eligible_to_apply or below | **NO VERDICT**; 92.000 is only an estimated MOR-invitation note, confirmed by Jorje via Amanda |
| technion_engineering | NO VERDICT (vague_mapping) | unchanged |
| technion_cs | 91 | unchanged |
| technion_datascience | 91 | unchanged |
| technion_civil | 87 | unchanged; optional title change skipped |
| technion_industrial | 89 | unchanged |
| technion_biomedical | 87 | unchanged |

The small right-aligned notice appears on Technion programme pages and verdict cards. Its source is linked with MyWay referral parameters:

`עודכן לאחרונה: 25.10.2026 · מקור: הטכניון` — [official source][official-source]

EE note: `באביב תשפ"ז: 94 — על בסיס מקום פנוי, מספר המקומות מצומצם`.

Medicine note: `92.000 הוא סף משוער לזימון למבחן מו״ר, ואינו סף קבלה לרפואה.`

## Source and confidence

Official source: [Technion winter/spring table][official-source], checked live on 2026-10-25 and against the supplied archived extract. Archive SHA256: `8dd512d269f64e33325e0342c8bcd1c7ff1b70c9a6cfce5773e2eac9a89cb400`.

Evidence packet: `/workspace/seo-geo/technion-threshold-sweep-2026-10-25.md`. Formula calculation is unchanged: the evaluator still replays the official calculator with ordinary subject grades and psychometric input. This run verified official cutoffs, not a new live calculator comparison. No new formula is inferred.

`verifiedAt` is 2026-10-25 for EE and ME; `CAPTURED_AT` is updated as requested. Medicine no longer has a verified numeric cutoff row. Its note and the student stamp carry the capture date. The five unchanged cutoffs retain their existing row metadata.

Generated Monday evidence was regenerated from the override JSON using the existing generator's `applyOverride` and `generatedTs` functions, preserving the committed export metadata and unrelated records. The ignored raw Monday export is unavailable in this worktree; no new board export or external write was performed.

## Verification

### CEO pin ruling — 2026-10-25 01:46

| programme | authorized pinned change | status | official source |
| --- | --- | --- | --- |
| technion_ee | 94 → 91.5 | Changed per Jorje's ruling 2026-10-25 | [Technion winter tablepress-485][official-source] |
| technion_me | 92 → 87 | Changed per Jorje's ruling 2026-10-25 in the implementation; no remaining ME=92 test pin was found | [Technion winter tablepress-485][official-source] |

The existing EE parser test now uses a winter table wrapper and cell 91.5, expects 91.5, and has a comment citing Jorje's CEO ruling and the official winter URL. The separate spring-first fixture and regression are unchanged and pass. No other existing test expectation changed in this update; medicine and the CS=92 drift fixture remain untouched.

All **37 focused tests pass**, including the corrected pin, spring-first parsing and medicine 91.99/92/95 no-verdict cases. The full local suite reports **3235 passed, 10 failed, 65 skipped**; all ten remaining failures are listed below. Scoped ESLint and `git diff --check` pass. The pre-push guard reports **2349 passed, 8 failed**; migration grants, consistency, seed dry-run and Monday evidence verification pass. The remaining failures require authorization beyond the EE/ME-only ruling. No hook bypass, push or PR creation occurred.

### Addendum — Jorje's rulings via Amanda

- Medicine's no-verdict policy is confirmed, replacing the pending A1 label. The existing Hebrew note, adjacent verification stamp, and official Technion link are retained.
- Added explicit medicine regressions at **91.99, 92 and 95**. Each verifies the adapter successfully reads the official calculator score while returning no acceptance threshold, rejection threshold, or verdict. The public evaluator also returns `unknown` without requesting a calculator score.
- The required fixture already places spring `tablepress-482` (`94 -על בסיס מקום פנוי`) above winter `tablepress-485` (`91.5`). Its parser regression passes with **91.5**.
- All **26** focused regression/component tests pass. Existing tests and their expected values were not edited in this addendum.
- Addendum verification: typecheck and scoped ESLint pass. `npm run guard:pre-pr` exits **1** again: **2348 passed, 9 preserved existing tests failed**. No guard or hook bypass was attempted.
- `gh pr list --head codex/technion-winter-thresholds --state all` returns no PR. The updated body remains this local draft because the guard blocks branch publication; GitHub CI has not run for the local commits.
- `technion_engineering` remains unchanged. `technion_computer_eng` is out of scope and was not added.

### Original verification

- Tests first: the new evaluator/parser suite initially had 12 failing tests and 2 passing tests; notice tests initially had 9 failures, before production edits.
- All **23 new unit/component tests pass**: EE 91.5/91.49 and 92, ME 87/86.99, spring-first parsing, spring-only withholding, medicine adapter scores 0/60/91.99/92/100, and medicine/engineering evaluator results across empty/weak/strong profiles.
- Final focused run: **638 passed, 11 preserved existing tests failed**. All expected values in existing tests are unchanged. Only unrelated Architecture/CS fixture HTML wrappers were updated to identify winter. The EE=94 test and the CS=92 drift fixture are untouched.
- Full suite before fixture-wrapper updates: 3223 passed, 19 failed; the final focused run confirms 8 fixture-shape failures were resolved without changing expectations.
- The actual archived official HTML was also parsed with the changed adapter: all nine IDs match the brief (EE 91.5, ME 87, five unchanged cutoffs, medicine/engineering no cutoff).
- `npm run typecheck`: passed. `npm run lint`: no errors; one existing unused-type warning in `bagrutPolicies.ts`.
- Local Chromium: **4 Playwright tests passed** at 390px and 1440px: all nine programme pages display the linked date stamp; EE and medicine notes display correctly; right alignment and document overflow checked. EE score 92 displays the passing status with cutoff 91.5 and spring 94 only in note text; Contact and Save remain visible. The verdict browser check mocks only the evaluation response to isolate rendering; the unit tests exercise the real evaluator and official-table parser.
- Screenshots: `/tmp/technion-browser-evidence/` (programme pages and EE verdicts). Browser execution uses the repository's existing Playwright stack, as required by the project instructions, in explicit local static catalogue mode. The Next.js dev server needed `--webpack` because the shared node_modules symlink is outside Turbopack's worktree root; no repository configuration changed.
- Guard: migration grants, migration consistency, catalogue seed dry-run, and committed Monday evidence verification pass; **9 existing targeted tests fail**, blocking `npm run guard:pre-pr`. No hook was skipped or bypassed.
- Supabase/Vercel: no database writes, seed application, publication, deployment, or environment changes. Deployed behavior is unverified because the guard prevents pushing this branch; local static browser results do not establish production behavior. Jorje must verify and authorize any later catalogue publication and source-freshness update, then confirm deployed EE/ME thresholds and medicine no-verdict behavior.
- UI copy was read on mobile and desktop; Amit/Jorje visual approval remains required before merge under the standing rules. No external messages were sent.

## Remaining existing test expectations — authorization required

The following rows exclude the now-passing EE pin and retain the other failing existing expectations, including the two failures outside the guard's targeted suite. These assertions were neither edited nor removed to make the run green.

| test | old expected | new value | official source URL |
| --- | --- | --- | --- |
| `src/data/admissions/formulaBackedVerificationLedger.test.ts` — counts only fully proved pairs as exact | exact 125 / withheld 12; Technion exact 14 / withheld 0 | exact 123 / withheld 14; Technion exact 12 / withheld 2 | [Technion][official-source] |
| `src/data/admissions/formulaBackedVerificationLedger.test.ts` — records an authority-specific reason for every withheld pair | 12 withheld pairs | 14 withheld pairs | [Technion][official-source] |
| `src/data/admissions/mondayEvidence.test.ts` — keeps only genuinely incomplete institutions in the tracked missing-rule queue once stale mappings are repaired | medicine threshold 92; invitation_to_manual_gate | medicine removed from verified verdict thresholds; 92.000 is a note | [Technion][official-source] |
| `src/data/admissions/officialProgramProofCaptures.test.ts` — provides independently captured eligible and below fixtures for every exact source target | all historical capture IDs belong to active registry (true) | false: two historical medicine capture IDs are no longer active sources; retained unchanged | [Technion][official-source] |
| `src/server/data-health/queries.test.ts` — reports complete catalogue readiness without false missing-link issues | exact 125 / withheld 12 | exact 123 / withheld 14 | [Technion][official-source] |
| `src/server/ingestion/admissionsSourceRegistry.test.ts` — selects the verified HUJI, BGU, Technion, Haifa, and TAU programs as default exact live proof targets | exact target list includes technion-medicine-live and technion-technion_medicine-live | both medicine targets absent from exact selection | [Technion][official-source] |
| `src/server/admissions/calculatorCoverage.test.ts` — reports pair-level formula coverage without institution-wide exact claims | exact 125 / withheld 12 | exact 123 / withheld 14 | [Technion][official-source] |
| `src/server/admissions/capabilityMatrix.test.ts` — asks for a Technion medicine subject record before replaying its invitation gate | needs_input | authority_unavailable; no verdict authority | [Technion][official-source] |
| `src/server/admissions/evaluator.test.ts` — asks for a Technion medicine subject record before the invitation flow | needs_input; bagrut_subject_record | requirements_only; decision unknown; no requested input | [Technion][official-source] |
| `src/server/admissions/evaluator.test.ts` — does not issue a Technion medicine verdict without the subject record | needs_input; bagrut_subject_record | requirements_only; decision unknown; no requested input | [Technion][official-source] |

The EE pin is resolved per the CEO ruling above and is no longer a failing-test row. Historical medicine proof captures remain unchanged; their stale membership assertion and the remaining medicine expectations still need a separate ruling.

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.

No review pipeline or multi-agent review ran. A manual scope scan found no unrelated production edits; the existing failing expectations above remain explicit blockers.

[official-source]: https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/
