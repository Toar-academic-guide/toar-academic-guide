# PR #278: Jorje 06:40 visual follow-up

Authority: Jorje's explicit Oct 25 06:40 follow-up, extending ruling 5 to the two economics browser cases. PR #278 stays draft pending Amit's visual approval.

Main bb041ef (#288) was merged without rebasing. Its smoke-quota isolation and 0042 function-body contract checks are preserved. No workflow, guard, coverage or database change was authored in this follow-up.

## Behavior

- Economics Bagrut 70 / psychometric 420 returns manual_gate/below, explicitly estimated, because the average-only and psychometric channels both fail. The obsolete all-channel rejection disclaimer is removed from the published Colman routes evaluator.
- A still-passing or undecidable alternative cannot produce G3 below. Tests assert unknown/needs_input and the absence of the disclaimer. The separate CS direct-route helper retains its existing scoped caveat; the final proxy guard withholds below when alternatives cannot all be proved failed. No dead open-channel G3-below branch is retained.
- Estimated API results render a small, right-aligned muted line in journey details and calculator results, reusing one component and the existing footnote style. Average proxies use the requested wording. A defaulted-year-only result displays the actual year assumption from estimationReason and asks for real exam years; it does not claim that the average was estimated. Mixed provenance retains both disclosures.
- The two authorized economics browser expectations now assert below, its estimate notice and absence of the removed sentence. The same tests still open the profile through the existing update-data action, verify an empty institutional-average field, enter 86.25, and check RTL alignment. No other browser expectation changed.

## Verification

Tests first: 3 failed / 4 passed across the seven new cases before implementation. After implementation the focused five-file suite passed 528 tests. The full suite passed 3,598 tests with zero failures and 86 existing skips; lint, typecheck and format check passed. The design detector reported no findings on the changed UI components. The focused simplification pass retained proof tests and source comments, and reused one estimate component across both rendering paths.

The static production build succeeded. The real guard passed 2,708 tests without a bypass. All ten affected Playwright specs ran against that build: 126 passed / 4 existing conditional skips / zero failures. All six screenshots were opened and inspected; RTL/right alignment, no horizontal overflow and no page errors were confirmed. Full inputs and metrics are recorded in the committed evidence README. Screenshots are captured from the committed code SHA, before the evidence-only commit. They are review mockups, not Amit's visual approval.

VISUAL change — stays draft pending Amit's approval.

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.
