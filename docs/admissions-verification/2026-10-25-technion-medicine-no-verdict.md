# fix(evaluator): withhold Technion medicine admission verdicts

Technion medicine returned `below` when a student's sekem was below 92. The official table identifies that number as an estimated invitation threshold for MOR screening, not an admission cutoff. `technion_medicine` now always returns `unknown`, preserves the existing sekem calculation, and uses the existing result explanation and score rendering:

> סף זימון משוער למבחן המו"ר: 92 (הערכה)

The response omits the admission threshold, score pass/fail assessment, improvement gap, and additional-condition verdict fields. It retains input requests and source failures when a score cannot be calculated. The snapshot is generated from the corrected result. No component markup, styles, formula, catalogue rows, historical captures, verification contracts, or existing test expectations changed.

Source: [Technion official table](https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/), read 2026-10-25. The winter medicine row lists 92.000; its medicine footnote describes the estimated MOR invitation threshold and explains that it depends on places and applicant counts. The evaluator links to this existing official source. Existing student-facing referral rendering remains in place, including `utm_source=myway&utm_medium=referral`.

| Value | Interpretation | Change |
| --- | --- | --- |
| 92 | Estimated MOR invitation sekem | Informational text only; no admission comparison in the returned result |
| Student sekem | Existing official-calculator replay | Preserved; no new formula or formula-confidence claim |

## Existing conflicting test — Jorje ruling required

| Test and location on this branch | Old expected value | Proposed value | Reason |
| --- | --- | --- | --- |
| `src/components/CalculatorResults.test.tsx:1040`, assertion at `:1081` — `renders manual-gate threshold failures as below the official invitation score` | Mock `decision: 'below'` at `:1054`; label `מתחת לסף`, summary `סכם 84.5 · סף 92`, and required-threshold explanation at `:1081`–`:1083` | Mock `decision: 'unknown'`, retained sekem 84.5, estimated MOR invitation line, no admission-threshold verdict or improvement gap | 92 is an estimate for screening invitations; neither side establishes admission or rejection |

This test is unchanged. It still **passes** because it injects its own mocked API response and never calls the evaluator. The brief anticipated that an old verdict assertion would fail the guard; no such evaluator assertion was found. Making this mocked test fail would require changing the test or adding frontend behavior outside the evaluator fix. Neither was done. No existing medicine test expecting `accepted` was found.

Historical medicine verification fixtures still contain `below`/`eligible_to_apply`; they are unchanged historical artifacts, not assertions of the new public evaluator response. They must not be mistaken for a current admission verdict.

Publication is held locally for Jorje's row-by-row ruling because an existing test explicitly pins the old medicine verdict, even though it does not fail. No push, PR, deployment, database write, migration, seed, publication workflow, or guard bypass was performed. This document is the prepared PR body.

## Verification

- Tests first: the three added evaluator cases initially failed with `below` (psychometric 720 / mocked sekem 89), `eligible_to_apply` (800 / 98.9), and `below` (500 / 73.9). All now return `unknown` with their original score and no pass/fail assessment or threshold gap.
- Focused evaluator and both result-renderer suites: **397 passed**. The new component tests verify the sekem and estimate line render without a positive/negative admission verdict. The main journey test also checks Contact, Save, and the existing official referral link.
- `npm run guard:pre-pr`: **passed**, including migration consistency, catalogue seed dry-run, evidence verification, and **2,398 tests in 94 files**. No database seed was applied.
- `npm run typecheck`, targeted ESLint, Prettier, and `git diff --check`: **passed**.
- Local Chromium: **six passed checks**, using the actual evaluator's fixture-backed output for the 720/high/low profiles at **1280×900 and 390×900**. The explanation is right-aligned, no horizontal overflow occurs, and Contact/Save remain visible. Screenshots were visually inspected on desktop and mobile. Screenshot directory: `/tmp/technion-medicine-evidence/`; files `medicine-{720,high,low}-{1280,390}.png`.
- Browser evidence uses explicit local static catalogue mode and mocks official score/table responses and the browser evaluation endpoint. It verifies rendering, not authenticated preview/production access or a new live official-calculator comparison. No deployed behavior is claimed.
- CI: **not run for this local change**; no remote PR exists. Jorje/source verification and Amit visual approval remain outstanding before merge.

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.
