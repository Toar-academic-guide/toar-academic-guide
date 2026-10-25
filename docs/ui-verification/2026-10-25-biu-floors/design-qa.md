# BIU per-floor table QA — 25.10.2026

NEW UI ELEMENT: needs Jorje/Amit approval before merge.

The table extends the existing `AdmissionRequirements` component. It uses existing type, color and border styles, semantic table headings and native source links. Caveats remain inside the existing result explanation. No new UI library, font, icon set, profile field or screen was introduced.

Playwright exercises the real local catalogue/evaluation endpoints with explicit `CATALOGUE_SOURCE_MODE=static`. The existing 14 BIU browser cases pass at 390/1440; eight new floor cases pass at 390/1280. The eight floor cases were rerun after the final copy/RTL change, with all eight passing. Source-calculator requests are intercepted and asserted absent; the labelled link is inspected without navigating to it. API evaluation responses are not mocked.

Screenshots inspected: EE source conflict and below at 1280/390, CS alternative at 1280/390, computational biology without psych at 1280/390. Values and placeholders are read-only in this changed surface. The table and explanation align right; URL isolates preserve LTR character order inside Hebrew copy. The browser asserts no horizontal overflow or page errors and visible Contact/Save actions. No profile input controls changed.

| Route | Result |
| --- | --- |
| `/#detail` | Pass — CS alternative, EE conflict/below, computational biology without psych, plus existing law cases. |
| `/app/calculator#detail` | Pass — same mobile floor cases, plus existing law and bagrut boundaries. |
| Deployed preview / production | Pending preview verification — Jorje approved the retained test expectation changes on 25.10.2026 at 02:10, and the local guard now passes. No manual deployment or production database write was attempted. |

The `ce-test-browser` interactive driver is unavailable (`agent-browser` is not installed). Browser verification uses the repository's existing Playwright runner and installed Chromium, rather than claiming interactive-driver access. The Impeccable detector returned no findings for the changed frontend files. Lint passes with one unrelated pre-existing unused-import warning; typecheck and format checks pass.

The inline `ce-simplify-code` pass consolidated the source constants and science-subject logic and replaced nested floor-status conditionals with explicit branches. Proof tests were preserved. Dedicated code review was skipped under the Encoded profile restriction.

Screenshots are review artifacts. No Jorje/Amit approval or merge readiness is claimed.
