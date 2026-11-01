# HUJI medicine final-cutoff correction — issue #361

## Change and source

The ordinary six-year medicine route (601-4601, admission cycle 2026–2027)
now compares the final score against **25.708**, replacing 25.783. The
below-threshold explanation and verification contract read the policy value.
Academic screening remains **25.186**; formulas, rounding, prerequisites and
special-route handling are unchanged.

The [official requirements page](https://info.huji.ac.il/bachelor/Medicine)
was checked on 2026-11-01. The adjacent JSON records its stage-C cutoff and
actual check time. September's calculator captures and observation dates
remain unchanged. The new requirements record participates in the source
fingerprint; it is not a new official calculator replay.

## Local verification

Executed on branch `codex/huji-medicine-final-cutoff`, based on `0416adc`.

- Before the fix, the focused policy run failed 8 tests and passed 33,
  reproducing the stale cutoff and false below-threshold decisions.
- After the fix, all **521 tests in 5 focused files passed**: policy,
  evaluator, HUJI adapter, live-proof runner and medicine academic evaluation.
- Final-score regression cases: 25.707 is below; 25.708, 25.709 and 25.750
  meet the numerical condition when all prerequisites are satisfied.
  Evaluator tests cover both `medicine` and `huji_medicine`. They provide
  qualified freshness state and captured calculator responses; they do not
  establish live API or deployment readiness.
- `npm run lint`, `npm run typecheck` and `git diff --check` passed.
- `npm run guard:pre-pr` passed, including **3,845 tests in 148 files**.
  The existing guard reported that no raw Monday export was available and
  therefore skipped its optional local regeneration drift check.
- The existing HUJI academic Playwright cases passed at **1280px and 390px**,
  using the local application: academic score 24.366, screening threshold
  25.186, missing-input correction and reload persistence.
- Screenshots of the same academic result were visually inspected at both
  widths: readable Hebrew, right-aligned copy, correct decimal order and no
  horizontal overflow. This does not cover the gated final-stage explanation.

## API limitation and remaining delivery work

Eight real local POSTs to `/api/admissions/evaluate` covered both aliases and
all four synthetic boundary inputs. Every response was HTTP 200, but the HUJI
result was `authority_unavailable`, `decision: unknown`, with degradation
reason `pair_verification_incomplete`. Its explanation contained the corrected
25.708 threshold and retained the historical 28 September observation date.
This is **not a passing final-stage API check**. The existing verification gate
was not bypassed or changed. The API result alone does not distinguish missing
freshness state from a source-fingerprint mismatch; no database diagnosis or
mutation was performed.

The changed final-stage below-threshold explanation has therefore not been
visually verified in an active result flow. Its exact Hebrew text and number
are covered by the policy test. Preview and production verification remain
outstanding. Any reviewed freshness state must correspond to the new source
fingerprint before the active final-stage decision can be verified.

No push, PR, merge, deployment, database seed or admissions publication was
performed. PRs #359, #311, #313 and #314 were open when the one-PR rule was
checked. Issue #361 remains open until delivery and deployed verification.
Code review: skipped per the user's standing lean-work instruction; no
separate CE review, simplification workflow or subagents were run.

## Repeat the UI check

1. Open `/sekhem-calculator?program=huji_medicine` locally on desktop, then at
   a 390px mobile width.
2. Click **ערכים לדוגמה**, remove rows 9 and 8, set all seven remaining grades
   to **90**, and enter psychometric **750**.
3. Click **חשבו את הסכם שלי**. Fill the newly shown psychometric date with
   **2025-12-01** and choose Hebrew-school instruction as the Hebrew basis.
4. Calculate again. Expect **24.366** against **25.186**, no missing-input
   notice and no MOR/MARKAM score requirement. The closed-registration notice
   is expected for this cycle.

Final-stage API verification must be repeated after the relevant verification
state is available: use the ordinary `official_cognitive` route with cognitive
scores 26.746, 26.749, 26.751 and 26.854, assessment 175 (2026), psychometric
800 dated 2026-04-01, English score 120, Hebrew-school instruction, confirmed
residency/qualification/registration, and no prior study. Expect final scores
25.707, 25.708, 25.709 and 25.750 against 25.708. Meeting this numerical
condition means `eligible_to_apply`, never guaranteed admission.
