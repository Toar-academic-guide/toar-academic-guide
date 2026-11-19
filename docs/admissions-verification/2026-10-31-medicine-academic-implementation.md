# Medicine academic stage — implementation checkpoint

Date: 2026-10-31. Status: **partially implemented and locally verified; not merge-ready**.

## Workspace and scope

- Writable checkout: `/Users/amitmalichi/.codex/worktrees/medicine-academic-stage`.
- Branch: `codex/medicine-academic-stage`, based on main `9b992ac848295c128f7c2ec76fca0f6ff079e3c0`.
- Original workspace and its unrelated changes were left untouched. Its corrupted `refs/heads/codex/fix-proof-table-grants 2` prevented a normal fetch, so this is a fresh clone rather than a linked worktree.
- Approved plan: `/Users/amitmalichi/Desktop/toar-academic-guide/docs/plans/2026-10-31-1515-fix-medicine-academic-stage-plan.md`.
- No catalogue publication or production change has been made. Amit explicitly requested a new PR after reviewing this checkpoint, authorising publication of this branch as a draft despite PR #311 remaining open.

## Implemented locally

Subject-derived institutional averages, TAU's 117 cap with uncapped average retained, BGU's two-decimal average, HUJI's native academic score, independent prerequisite conditions, stage/cycle/closed-registration output, applicant detail controls and session restoration. Named final projects can be entered under certificate details. Generic projects and combined records request actual transcript information. The existing HUJI final-stage resolver and final cutoff remain separate.

Academic evidence is selected through `getMedicineAcademicVerification`; it does not promote the final-stage TAU ledger entry. TAU and BGU replay the official calculators and validate the preliminary cutoff/independent floor. Known source-freshness failures still prevent exact evaluation. HUJI uses the published cognitive formula and the independently captured example.

## Local verification

- Focused Vitest run covering averages, normalisation, academic evaluator, legacy evaluator, capability matrix, HUJI policy, TAU/BGU adapters, calculator component/session/helpers: **727 tests passed in 11 files**.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `CATALOGUE_SOURCE_MODE=static npm run build`: passed.
- `git diff --check`: passed.
- Before publishing the draft, `npm run guard:pre-pr` passed: 148 test files / 3,837 tests plus its migration/catalogue checks. The optional raw-Monday-export drift check was skipped because that local export was absent.
- Existing Playwright calculator suite plus two new HUJI tests: **31/32 passed on the first runnable pass**. The existing desktop programme-Back test timed out under parallel load; its focused rerun passed (1/1), without a test or app change for that timeout.
- Final focused rerun of both new HUJI desktop/mobile browser tests after the last changes: **2/2 passed**.
- Initial Playwright launch failed because its matching Chromium binary was absent. `npx playwright install chromium` installed it before the runnable pass.
- The session-storage failure test needed to spy on the actual jsdom storage prototype; the global Storage constructor in this local runtime was a different implementation. Its assertions were retained and now pass.

Native browser checks used the local server at `http://localhost:3000/sekhem-calculator`, with static catalogue mode and live official score requests for TAU/BGU. These are **not deployed/database-backed checks**.

| Case | Observed application result |
| --- | --- |
| TAU high certificate, psychometric 750 | 750.23 vs 726.44; supplying date/Hebrew details removes missing conditions |
| BGU maximum average, psychometric 679 | Score 799 vs 735, separately fails psychometric 680 |
| Same BGU certificate, psychometric 680 | Score 800; psychometric-floor failure disappears |
| HUJI seven-subject reference, psychometric 750 | 24.366 vs 25.186; completing date/Hebrew fields retains score and removes missing conditions |

Desktop 1280px and mobile 390px were exercised. Hebrew subject/grade/psychometric fields align right. A WebKit date-field alignment issue was corrected and visually rechecked. Mobile inspection found no horizontal document overflow. The missing-civics action was also exercised manually: it added a 2-unit civics row, focused the grade, and returned 24.366 after entering 90 and recalculating. Screenshots are in `medicine-academic-screenshots/`.

## Verification steps

1. Open the local calculator. Select medicine at TAU. Enter the nine-subject all-100 reference in the source notes, choose internal certificate, and enter psychometric 750. Expect 750.23, academic cutoff 726.44, the 2026–27 cycle and closed registration.
2. Complete psychometric date 2025-12-01 and Hebrew-school language basis; recalculate. The score remains and missing-detail conditions disappear.
3. Select BGU, retain the high certificate, and compare psychometric 679 with 680. Expect 799 with a separate failed-floor message, then 800 without that message. Programme changes intentionally request the institution-specific confirmations again.
4. Select HUJI; use Bible/literature/Hebrew/history/civics at 2 units, English/maths at 5 units, all grades 90, and psychometric 750. Expect 24.366 vs 25.186, without a request for MOR/MARKAM or an institutional average.
5. Remove civics, calculate, restore it and recalculate. Expect a specific missing-subject prompt before a score. Repeat on a narrow mobile viewport. Reload after completing applicant details and confirm the values/result survive.

## Required work still open

**U1 is unfinished.** The source notes list unresolved legacy mappings. Exact results are withheld for those records rather than granting an unsupported bonus. Finish the full subject/sector/assessment evidence reconciliation, including same-subject exam/project optimisation and foreign-language instruction exceptions, before signing off U2–U4 or activating the feature. The working standard fixtures do not reduce this requirement.

**U5 is incomplete.** No verified Vercel preview, production programme-row/grant check, catalogue activation or deployed browser proof exists for this branch. No environment-variable changes are indicated. The draft PR is explicitly authorised; keep it in draft until the evidence and deployed checks are complete. Run `npm run guard:pre-pr` before any applicable push/PR. A broad CE review was not run, per the approved lean scope.

Preserve this checkout while completing the missing evidence; do not copy the implementation over the unrelated dirty original workspace. No shipping-complete claim is justified at this checkpoint.
