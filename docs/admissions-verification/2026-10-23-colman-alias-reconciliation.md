# Colman alias reconciliation — 2026-10-23

Scope: evaluator and catalogue display wiring for two legacy programme IDs at `colman`.

| Alias ID | Canonical ID | Existing Bagrut floor | Existing psychometric prerequisites |
| --- | --- | --- | --- |
| `colman_law` | `colmgmt_law` | Colman weighted average ≥100 | Psychometric ≥540; the college's required weighted composite is unpublished. |
| `colman_business` | `colmgmt_business` | Colman weighted average ≥85 | Psychometric ≥555 and quantitative ≥100; the college's required weighted composite is unpublished. |

Thresholds, certificate confirmation, missing-input handling, decisions and Hebrew copy are reused unchanged from `colmanPublishedRoutesEvaluation.ts`. `canonicalProgramId` in `src/lib/seo/programAliases.ts` owns both mappings. Dispatch and route-table lookup resolve through that map; report IDs and snapshot inputs retain the requested alias for saved references.

Evidence reused: `docs/admissions-verification/2026-10-22-official-requirements-4.json`, its law/business entries, and the existing canonical catalogue requirements. Those entries cite the official [Colman admission page](https://www.colman.ac.il/academics/ba/b-a-admission/), [law page](https://www.colman.ac.il/academics/ba/law/) and [business page](https://www.colman.ac.il/academics/ba/business-administration/). This wiring task did not re-fetch or re-verify official thresholds.

Confidence and limitations remain those of the canonical evaluator: a general profile average never substitutes for the Colman weighted average; certificate confirmation remains separate from a numeric match; satisfying psychometric prerequisites below the Bagrut floor leaves the unpublished composite decision with the college. No new formula, composite or threshold is encoded. The original source packet does not explicitly state an admission year.

Alias programme pages select the canonical programme's requirements through the existing public catalogue display path, including requirement tiles, source links and caveats. Stale alias requirements are not combined with canonical requirements. Result explanations reuse the canonical published-route explanation. `colman_cs`, CS evaluator dispatch and the Batch C unsupported list are unchanged.

Verification:

- Focused Vitest: 158 tests passed across Colman published routes, programme aliases, public catalogue pages and study journey. Pair fixtures cover weak profiles, inclusive Bagrut and psychometric boundaries, missing Colman average, missing psychometric/quantitative scores, certificate confirmation and an empty profile. Full evaluator results match except for snapshots, which intentionally preserve the requested ID.
- Rendered alias-page tests inject stale legacy requirements and confirm the selected requirements match the canonical source and stale text is absent from rendered markup.
- `npm run typecheck` passed.
- `npm run guard:pre-pr` passed: migration consistency and grants checks, local catalogue seed dry-run (no validation errors), committed Monday evidence verification, and 1,934 tests across 90 files. It emits an existing migration-journal timestamp warning for `0002`; the check succeeds. The raw Monday export is absent, so the guard skips local regeneration drift checking.

No database SQL, migrations, live seeds, environment changes or deployment commands were executed. No SQL packet is needed for this display/evaluator reconciliation. Live Supabase data and preview/production browser behavior were not verified; heavy Playwright was omitted for this unit-covered wiring change. Jorje's source/product and preview verification remains outstanding before a merge decision.
