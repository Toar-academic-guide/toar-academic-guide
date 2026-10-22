# Calculator routing repair

## Cause

The programme IDs and calculator mappings were present. Seven TAU programme/alias contracts had fixture checksums that did not match their examples: Electrical Engineering (`ee`, `tau_ee`), Mechanical Engineering (`me`, `tau_me`), Occupational Therapy (`occupational_therapy`, `tau_occupational_therapy`) and Industrial Engineering (`tau_industrial`). Runtime verification rejected them before asking for applicant inputs or calling the official calculator.

The coverage ledger trusted proof flags without validating the examples, so it incorrectly counted these contracts as exact. The result decorator then replaced unavailable/degraded results with `requirements_only`, hiding the reason from the UI.

A read-only scan of the live database catalogue and freshness records covered all 121 listed programme/institution pairs with verification artifacts. It also identified:

- `communication__tau`: malformed source fingerprint (not a 64-digit SHA-256), shared by its code and database record.
- `technion_civil__technion`: database cutoff 88 disagrees with the code contract and current official table, both 87. Its saved freshness payload also retained 88.

Explicitly blocked or withheld programmes without a verified contract were not activated.

## Repair and prevention

- Correct the seven fixture checksums after replaying their existing score/verdict examples against TAU's official API. Neither examples nor formulas changed.
- Recapture Communication's source identity and official score/verdict examples, generate its valid source fingerprint, and pin its new fixture checksum. Preserve dates of other programmes whose historical examples share its template.
- Validate complete artifacts when building the coverage ledger. Add the same check to its existing guard-covered test file, including mutation tests proving mismatched fixtures cannot count as exact.
- Preserve unavailable/degraded result kinds when adding historical requirements, so a calculator failure cannot masquerade as a programme without a calculation.
- Add evaluator regressions for missing inputs and actual captured accepted/below responses, including legacy IDs.

## Official evidence

`2026-10-21-calculator-routing.json` contains 12 checks with synthetic applicant inputs. No account data or credentials are included.

- TAU official GraphQL: https://go.tau.ac.il/graphql . Programme nodes and external IDs match the existing mappings. All ten score/verdict examples across Electrical Engineering, Mechanical Engineering, Occupational Therapy, Industrial Engineering and Communication reproduced the expected outcomes.
- Technion official calculator and cutoff table: the evidence records their URLs, score responses and Civil Engineering table rows. The observed cutoff is 87; synthetic high/low applicants returned 98.9/73.9 and accepted/below respectively.
- A separate run through the actual app evaluator, using the live database catalogue/freshness records and synthetic complete inputs, returned exact accepted/below results for the four checksum-affected degrees.

TAU's current rejection cutoffs for electrical, mechanical and industrial engineering are 709, 649 and 666. Historical contract metadata contains 690, 616 and 647. Their runtime adapters already use the current official response for decisions; this repair does not change that behavior or alter those historical values. All observed acceptance cutoffs match the contracts. These historical rejection values must not be used as a substitute for live decisions.

## Live-data decision

`2026-10-21-calculator-routing-repair.sql` is a targeted, transactional repair for three rows: Communication freshness metadata, Civil Engineering's cutoff and its freshness metadata. It is idempotent and rejects an unexpected current cutoff/fingerprint. It passed in disposable PostgreSQL. Applying it to the shared preview/production database requires explicit approval; no application deployment to production is authorized.

Until that repair is applied, the seven TAU checksum repairs work with the current database, while Communication and Civil Engineering remain withheld by their freshness/cutoff checks. Grades, saved programmes, programme IDs, unrelated thresholds and formulas are preserved.

## Verification

Focused tests cover every declared verified artifact, checksum/schema drift, missing inputs, canonical/legacy evaluator routes, and preserved source-failure statuses. Existing build, lint, typecheck and pre-push guards remain required.

Browser recheck: on the signed-in branch preview, reload My list at desktop and mobile widths. Electrical and Mechanical Engineering must show the actual missing-input result instead of requirements-only; open details to read the missing inputs, then return to My list. Do not change the user's grades or bookmarks. Communication/Civil Engineering activation must be verified after approved live repair.
