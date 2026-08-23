# Design QA

final result: passed

Reference: user's note and screenshot calling out that this screen should choose only what to study, not where to study.
Latest note: replace the old per-degree subtitle with a compact `קצת על התואר` info treatment, using verified degree-level copy and the supplied `הנדסת חשמל` wording.

Viewport checks:
- Desktop in-app browser: the degree-picker screen keeps the colorful Way/Rescale card layout, active details panel, and filter pills with horizontal overflow at `0`.
- Mobile 390x844: header, search, filter pills, active details panel, category cards, and fixed continue CTA fit without horizontal overflow.

Behavior checks:
- The side panel now shows unique general degree names only. It does not show institution names such as `אוניברסיטת...`, `הטכניון`, `מכללת...`, or `בצלאל`.
- Degree rows now show an info icon, the label `קצת על התואר`, and a compact degree-level description that expands on hover/focus.
- `הנדסת חשמל` uses the supplied four-year intensive-degree copy with the math/physics base, electronics/electricity/signals/programming continuation, high admissions, and meaningful workload notes.
- Other mapped degrees pull their description from `FIELD_ENRICHMENT.aboutText`; unmapped degrees use an explicit unverified-copy fallback instead of invented detail.
- Duplicate institution-specific variants are grouped by degree name. Searching `הנדסת חשמל` returns `נמצאו 1 תואר`, and `הנדסת חשמל` appears once.
- Choosing a degree still stores all backing program IDs behind the scenes so the next screen can decide where to study.
- The CTA copy now says `המשך לבחור איפה ללמוד`, clarifying that institution choice happens after this step.
- The search placeholder now says `חפש תואר או תחום…`, with no institution wording.

Typography checks:
- Landing page H1 and this screen's H1 both compute to `"Segoe UI", Arial, sans-serif`.
- Landing page H1 and this screen's H1 both compute to font weight `600`.
- The shared `--font-sans` token is explicitly set in `globals.css`, and form controls inherit the same font.

Verification:
- Lightweight TypeScript transpile check for `DegreePicker.tsx`: passed.
- `npm run typecheck` remains blocked by the existing `tsconfig.json(4,27): Invalid value for '--ignoreDeprecations'` issue.
- Strict 390x844 Playwright check via installed Chrome: passed with `horizontalOverflowPx: 0`; `הנדסת חשמל` search still returns one general result and no institution names.
- Browser console still reports the existing PostHog initialization warning about a missing token; no new render or interaction errors were observed.
- Prettier could not be run through the local project shim because `node_modules/.bin/prettier.cmd` is missing in this checkout.
