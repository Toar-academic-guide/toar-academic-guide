# Public sekhem calculator evidence — 2026-10-28

The public page consumes `POST /api/admissions/evaluate` in sequential batches of at most fifty programmes. It never imports the legacy calculator or the retired coverage registry. Raw grades and psychometric sections cross the existing API boundary; institutional formulas remain in the evaluator. This run made no production requests or database writes.

## Retained-source parity

`src/components/sekhem/SekhemResults.mapping.test.tsx` runs the real batch route, evaluator, policies and adapters. Only catalogue/freshness persistence and official HTTP transport are replaced. Unknown transport requests fail. Existing captures under `docs/admissions-verification/` and the retained HUJI feed supply official responses; fixtures do not replace the evaluator's answer.

| Institution / programme | Profile | Returned score / threshold | Returned kind / decision |
|---|---|---|---|
| TAU / tau_ee | P730, B115, retained subject context | 730 / 710 | exact / accepted |
| HUJI / huji_psychology | P660, B90 | 19.71 / 22.5 on the wire | exact / below |
| BGU / bgu_psychology | P650, institutional B112 | 734 / 650 | exact / pending |
| Haifa / haifa_cs | P800, institutional B120, actual language/date/subject inputs | 806 / 700 | manual_gate / eligible_to_apply |
| Technion / technion_civil | P800, B100, retained subject context | 98.9 / 87 | needs_input / unknown |
| Reichman / reichman_law | P700 | 700 / 700 | estimated / pending |
| BIU / biu_law | P420, B70 | absent / absent | estimated / below |
| Afeka / afeka_cs | Existing accepted published-route profile | absent / absent | exact / accepted |
| HIT / cs | P700, B100 | absent / absent | needs_input / unknown |
| HUJI / psychology and huji_psychology | P700, B90 | score, threshold and gap absent | manual_gate / unknown |

The Technion language gate is an existing evaluator dependency, preserved honestly. Static catalogue HIT coverage uses `cs`; `hit_cs` is absent. No alias workaround is encoded in the page. Direct psychometric routes retain their returned metric label rather than being renamed as composites.

HUJI Kidum's long explanation contains numeric bands even though its numerical result fields are intentionally absent. Its exact returned `sourceLabel` (`מסלול ראויים לקידום`) names the route without displaying those bands. Both real aliases have a strict digit-free rendered-row test. Other manual gates use actual returned condition labels or gate text. The dropped institution-check label never renders.

## Serialization and inputs

- The NEW HTTP precision test failed on `19.71195484` versus `19.71` in both single and batch responses before implementation. Only HUJI `score` is rounded after evaluation: two decimals, medicine three. Raw verdicts, thresholds, gaps, snapshots and digests remain unchanged. Boundary tests retain `below` when a rounded score equals the threshold.
- Official medicine presentation evidence remains `2026-09-28-huji-medicine-official.json`, sourced from HUJI's official medicine calculator. Ordinary two-decimal wire presentation is the approved PM decision, not a newly claimed official formula.
- The standing PM assumption treats entered grades as full bagrut; the page sets `complete=true` after validating rows. It adds no full-certificate confirmation checkbox. Certificate type remains explicit, unknown by default. A complete entered internal-certificate profile reaches both existing TAU and BGU institutional-average policies; the page copies no formula.
- Zero grades and raw one/two-unit rows remain intact. Invalid narrower legacy projections are omitted. Duplicate aliases, invalid integers, score bounds and subject-count bounds are validated.
- Optional Haifa fields appear from the latest missing-input response. Obsolete overrides disappear from subsequent requests. Yes/no answers retain boolean types. Stale responses cannot restore obsolete verdicts. Tests cover fifty-programme batches, partial success, explicit retry, rate-limit failure and preserving completed results.

## Discovery and copy

Static selector inventory: **41 programme pages / 11 admission FAQ answers**. Exact IDs are pinned in selector tests and listed in the plan. Ariel-sourced thresholds are excluded generically. TAU adaptation-only/prior-degree FAQ requirements are excluded by source and wording, not programme-ID blacklists. Runtime selection uses resolved current display data, so current catalogue changes can change counts without a code patch.

FAQ Answer text remains unchanged. Qualifying Answers gain a schema.org `potentialAction`/`ViewAction` targeting the calculator, with a visible programme-page link beside the published requirements. Existing numerical and answer-copy expectations remain intact.

One baseline test necessarily changes: commit `f0c589c`, `test(seo): [NEEDS APPROVAL] include the new calculator sitemap URL`. Its exact URL array adds `${SITE_URL}/sekhem-calculator` immediately after `/about`; its length expectation changes `401` to `402`. The test name follows that count. No assertions are removed or relaxed.

Approved mockup/copy overrides: API-owned thresholds and verdicts replace stale unsupported badges; no-score institutions share `בחלק מהמוסדות נבדקים תנאי קבלה בלי חישוב סכם.`; actual gates replace the dropped institution-check label; every actionable institution group has an explicit lead CTA; raw section/certificate/response-required controls support the evaluator; the average sentence uses the approved institutional-policy wording; repeated formula-year text and fabricated example/result summaries are omitted. Reichman's estimate attribution and Afeka's alternative-routes link remain.

## Verification boundary

All enquiry calls are mocked in unit tests. Playwright installs enquiry interception before navigation and always fulfills it, never continuing to the network. Browser response fixtures exercise the real public route and catalogue in explicit local static mode; they are not live admissions proof or approval screenshots.

Final checks after simplification: lint, typecheck and format check passed; full Vitest passed (299 suites, 4,632 passing tests; 14 suites/101 tests skipped and one expected failure unchanged); webpack production build passed in explicit static catalogue mode; the new Playwright spec passed all four cases; pre-PR guard passed (132 suites / 3,050 tests plus offline migration/seed checks). An unchanged five-second hub test timed out when browser compilation ran concurrently; the complete standard npm test command passed when run separately, without any timeout or assertion change. Local browser verification covers 1280/390, empty/filled RTL fields, no horizontal overflow, navbar clearance, each group CTA, explicit lead recipients, unchecked preparation consent, focus return, actual rendered absolute title, canonical, sitemap/llms and homepage placement.

The stale registry and its test are deleted; independent aggregate coverage remains 141 total / 124 exact / 16 withheld. `sekhemCalculators.ts` and every forbidden evaluator/data/rule file are unchanged. The two #317 overlaps are the programme-page insertion and isolated sitemap expectation update.

Eitan's parallel work remains external to this lane: Technion Hebrew readiness, duplicate IDs, BGU pending/unavailable routes, Haifa subject-derived average and TAU score spot-checks. Responses flow directly into this page without support flags or formula patches. Merge main after #317 without rebasing. Real preview catalogue checks and Amit/Yonatan approval screenshots remain for the coordinator before merge; nothing was pushed or published here.
