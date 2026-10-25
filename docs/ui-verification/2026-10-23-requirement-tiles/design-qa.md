# Requirement tiles verification

Verified on 23 October 2026. Only the program-page requirement cards and the calculator detail requirements block opt in. RecommendationResults and the saved-comparison requirements block retain AdmissionRequirements.

## Data and coverage

The read-only report is [coverage.json](coverage.json). Reproduce it with:

```sh
node --conditions=react-server --import tsx scripts/requirement-tiles-coverage.ts
```

The local catalogue is the repository's static/seed dataset because this checkout has no DATABASE_URL. This is the existing explicit local mode; no failed DB read was substituted with static data. The numeric cross-check separately builds all 405 seed programs and serializes them through the database serializer without executing a seed or writing a database.

397 listed canonical public program pages: 11 contain at least one tiled institution block; 386 use only their existing lists. The 11 pages contain 12 tiled blocks representing eight distinct program/institution sources. General subject pages can reuse the verified institution-specific source selected by the existing public loader.

| Fallback reason for the entire page | Pages |
| --- | ---: |
| No program-specific verified record | 327 |
| No complete structured AND/OR model | 25 |
| Mixed unverified and unsupported route models | 8 |
| Insufficient structured numbers | 19 |
| Incomplete published requirements | 7 |

The complete program IDs and 52 public institution blocks without a sufficiently complete structured AND/OR model are in coverage.json. This classification concerns the structured representation, not a claim that the official prose is inherently unclear. Those blocks keep their complete original list.

Generic alternatives use the evaluator's BGU_SOCIAL_SCIENCE_RULES (score, psychometric, operator and bagrut), corroborated against the recent program-specific official notes. The ordinary double-major scope remains on each tile. Generic cumulative gates use catalogue thresholds and minimumPsychometric only when the official primary condition explicitly requires both, with no unrepresented alternative route. Current seed support is education, communication and political_science at BGU (alternatives), and physiotherapy at BGU (cumulative; eligibility for selection, not final admission).

The four typed overrides are tlvyaffo_cs (combined score, route-specific and common conditions), colmgmt_law (college discretion and prior degree), colmgmt_business (college discretion and quantitative condition), and colmgmt_cs (unpublished weighted threshold and conditional internal-test exemption). They require exact canonical requirements and notes from the approved official JSON. Colman copy does not say עם בונוסים. CS prep paths retain the internal test.

The generic gate requires published_conditions, a program/institution match, an institution-owned source URL, source fingerprint and unchanged verified notes. Verification older than 30 days, incomplete coverage, unlisted programs, source drift and unknown relationships fall back. Calculator-reported stale, incomplete, unverified, placeholder or blocked-official-source issues also suppress tiles. Legacy thresholds, personality profile scores, synthesized admissionFacts, institution-level Monday confidence and calculator capability alone do not establish trust.

## Browser evidence

Playwright exercised the four program pages, tau_law and nursing, plus generic education, at 1440px and 390px. Disclosures start closed, links and RTL alignment remain intact, and closed/open states have no horizontal overflow. Desktop and mobile screenshots were inspected for legibility and wrapping; only 1440px evidence is published here.

The existing official-requirements suite also passed all 31 cases, including 320/390/768/1280/1440 program pages, the local real evaluation API, calculator detail actions and empty/filled score-input alignment. Together with the new 11 cases, 42 Playwright tests passed.

For law low, MTA low, CS Bagrut match and generic BGU education, the test first visited https://findmyway.co.il/app/calculator#detail and captured the rendered badge, explanation, actions, link-row text and original requirement items. It then replayed the observed catalogue/evaluation responses into the local page and compared those values at both widths. This isolates presentation from local static-mode provider relations and live scoring. Every original list item remains once in the closed calculator details, with only nonredundant average/prep clarifications appended. The calculator has no check-your-chances self-link.

The generic education production baseline returned החישוב אינו זמין כרגע. The local UI preserves that actual unavailable state; the test does not claim successful live scoring for it. The baseline JSON files record the observed copy. The four-program local API checks ran without response replay.

No database writes, migrations, seed execution, freshness/publication runs, platform environment changes, manual deployment, merge, comments or outreach were performed. The required guard's local seed dry-run is validation only.

## Checks

- Full Vitest: 2,008 passed, 65 skipped (existing integration/environment skips).
- Typecheck: passed.
- ESLint: passed; one existing unused-import warning in bagrutPolicies.ts.
- Pre-PR guard: passed, including 1,222 targeted tests, migration consistency, operational grant checks and local seed dry-run; no bypass.
- Inline ce-simplify-code: consolidated shared average/prep copy, preserved proof assertions and all trust checks. Review pipelines and review agents were skipped as requested.
