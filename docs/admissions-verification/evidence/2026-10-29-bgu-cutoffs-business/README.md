# BGU 2027 cutoffs and business administration copy — 2026-10-29

## Source captures

Official BGU GetRdpData responses were captured on 2026-10-29 at 10:17 Asia/Jerusalem (UTC+02:00, 08:17 UTC; minute precision supplied by the original evidence). These five JSON files are byte-identical copies of the read-only source packet in `/workspace/qa-evidence/bgu-freshness/raw/official-*.json`. No refetch, calculator POST, or workflow was run for this task. Response headers retain the HTTP status, content type and ETag; Set-Cookie lines have been removed.

All sources are BGU-owned GetRdpData endpoints for cycle 2027, semester 1, institution 0, degree level 1:

- [accounting](https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=142&p_pat1=1&p_spe1=6&p_degree_level=1) — `official-accounting.json`, `official-accounting.headers`.
- [biology](https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=205&p_pat1=15&p_degree_level=1) — `official-biology.json`, `official-biology.headers`.
- [business](https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=142&p_pat1=1&p_spe1=1&p_degree_level=1) — `official-business.json`, `official-business.headers`.
- [economics](https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=142&p_pat1=3&p_degree_level=1) — `official-economics.json`, `official-economics.headers`.
- [communication](https://bgu4u22.bgu.ac.il/apex/10g/candidate_site/GetRdpData/?p_lang=he&p_year=2027&p_semester=1&p_institution=0&p_dep1=183&p_pat1=2&p_degree_level=1) — `official-communication.json`, `official-communication.headers`.

## Approved canonical changes

Before-values come from the task-approved production `admission_thresholds` snapshot documented in the prior `SURFACES.md` (captured through the database-backed public catalogue API at 10:18 Asia/Jerusalem). No production SQL was run here. After-values are from the official responses above. All seven entries are `institutionId: bgu`, `cycle: 2027`, `ruleKind: admission_cutoff`, `effectiveFrom: 2026-10-29`, `proofType: exact_official`.

| programme ID | before | after | saved proof | source ID |
|---|---:|---:|---|---|
| bgu_accounting | 610 | 620 | official-accounting.json | bgu-bgu_accounting-live |
| bgu_biology | 610 | 585 | official-biology.json | bgu-bgu_biology-live |
| business | 590 | 620 | official-business.json | bgu-business-live |
| bgu_business | 590 | 620 | official-business.json | bgu-bgu_business-live |
| economics | 615 | 620 | official-economics.json | bgu-economics-live |
| bgu_economics | 615 | 620 | official-economics.json | bgu-bgu_economics-live |
| communication | 590 | 520 | official-communication.json | bgu-communication-live |

Unprefixed `accounting` and `biology` are excluded: their production values already equal 620 and 585. A material `canonical_change` must not carry value-identical entries, and its publisher skips already-applied cutoffs without creating release items. The separate bootstrap PR owns those baseline entries. The already-published Technion and BGU medicine entries are removed from the current release and preserved only in the historical test fixture.

## Digest reproduction

Generated review runs hash the stable JSON of `proof.normalizedPayload` in `src/server/admissions/weeklyReviewRun.ts`. This hand-authored packet contains only GetRdpData responses, not the normalized live proof payload (which also requires calculator execution). Therefore the explicitly approved fallback is used: SHA-256 of the exact bytes of each committed `official-*.json` file, without parsing, sorting, whitespace changes or newline changes. A shared official response gives aliases the same digest. The business repair row uses the same hex digest without the `sha256:` prefix, following `sourceSha256` convention.

From this directory:

```sh
sha256sum official-*.json
```

| programme ID | digest |
|---|---|
| bgu_accounting | `sha256:379554c8b279e8481cae5c15b58f0d7283a13984806f214cf6a2d8e4ba3732f8` |
| bgu_biology | `sha256:356fc7985722a02497da7ae1cbfc7499f2b6b16e4aa9ccd80d0a0f8663847d2a` |
| business | `sha256:45cef96a9bf34aea0943d943a1d0013c23fb7db22f3d2be7a67c7ef4b19b87a4` |
| bgu_business | `sha256:45cef96a9bf34aea0943d943a1d0013c23fb7db22f3d2be7a67c7ef4b19b87a4` |
| economics | `sha256:5e28fed1d41a352272588ae3c64cf1de9baff03656439b53e95fb489149738d6` |
| bgu_economics | `sha256:5e28fed1d41a352272588ae3c64cf1de9baff03656439b53e95fb489149738d6` |
| communication | `sha256:3227390d8e66f796922f0731cef1b6bf8bb8488733e5a5e7b049e3243992e94c` |

## Business administration content

`official-business.json` identifies department 142, path 1, specialization 1 as כלכלה חד מחלקתי - מנהל עסקים. Its comments explicitly state סכם כמותי 620 and פסיכומטרי 600; `psycho_sekem` is null, so the cutoff comes from those comments rather than that null field. The other quantitative business/economics/accounting comments are interpreted the same way. Biology and communication expose 585 and 520 directly in `psycho_sekem`.

The notes now describe 620/600, the 640/570 alternate route, Bagrut average 107 with 5 units mathematics at 75 or 4 units at 85, the quantitative-130 alternative with a passing mathematics grade, and preparatory average 87. They retain the standard mathematics floor of 4 units at 75 or 5 units at 65, English בסיסי, Hebrew ה׳ where required, the semester-A introduction-to-mathematics course rule, the 25.08.2026 full-quota notice with registration still recommended, and exceptions up to 20 points subject to language requirements and available places. These match `BGU_QUANTITATIVE_PROGRAMMES.business`; no evaluator policy, formula, input gate or other threshold was edited. The source still reports registration closed; meeting the scores does not guarantee a place.

Only the existing `bgu_accounting` and `bgu_business` BGU repair rows receive `checkedAt: 2026-10-29`. The unchanged communication row retains `checkedAt: 2026-10-21`, as directed by the orchestrator. There are no biology/economics-family repair rows and no `business`/BGU row, so none were invented. The generic `business` page has no specific notes and resolves to `bgu_business` through `getPublicProgramRequirementSources`; the new tests exercise both page IDs through that resolver. All other repair entries are preserved byte-for-byte. The accounting date-only update retains its existing notes and source receipt. Communication is byte-identical to the original entry.

The old business source URL omitted the programme parameters; it now uses the full endpoint. The old `/categories/business/` programme URL described the stale Management identity. It now uses `/categories/economics/`, the same catalogue destination as the existing accounting row, consistent with the Economics department explicitly identified by GetRdpData and its returned `department_url`.

communication checkedAt left at 2026-10-21: src/lib/requirementTiles.test.ts pins its clock to 2026-10-23 and is outside this PR's lane; bump in a follow-up with lane approval.

## Publication and weekly identity

Merging this manifest auto-triggers `.github/workflows/admissions-publication.yml` (`Publish Reviewed Admissions Release`) through its main-push path filter. That existing protected workflow publishes the seven thresholds to production, atomically guarded by the before-values; it is not run from this branch. Jorje must verify the deployed catalogue and publication after merge. If production no longer matches the approved before-values, publication fails closed (or skips an already-applied after-value); investigate rather than changing assumptions silently.

This manifest has **no run key**. `parseReviewedAdmissionsManifest` has a strict schema with no `run_key` or `runKey` field. The hand-authored publication path does not create an `admission_review_runs` record. Scheduled freshness keys must match `^20\d{2}-W\d{2}$` and each key can have only one release kind/proof identity (`admissionsReviewRunLedger.ts`). No ledger entry or automation branch is created by this packet. It therefore cannot collide with the November 8, 2026 (`2026-W45`) scheduled freshness run. No W45 metadata or freshness ledger is touched.

## SQL packet for Jorje — files only

**None of these SQL files has been executed.** Preview shares the production database. Jorje runs this packet only after merge, the production deployment is READY, and the current-row backup has been checked. Production programme pages read database `admission_requirements.specific_admission_notes`; committing repair JSON alone does not update those rows. Page copy changes only after Jorje applies and commits the SQL. A Vercel preview against the shared database will still show the old copy until then.

This checkout has no `supabase/migrations`; the actual table/column definitions were inspected read-only in `src/db/migrations/0000_warm_ogun.sql` and `src/db/schema.ts`. Every SELECT and UPDATE is scoped to `institution_id = bgu` and `program_id IN (business, bgu_business)`. The sole updated column is `specific_admission_notes`; thresholds, requirements arrays, facts, IDs, metadata and source URLs are not updated.

1. `01-backup.sql`: save the actual two current requirement-note rows before any update.
2. `02-apply.sql`: replace notes with exactly the eight strings in `catalogueContentRepair.json` for `bgu_business`/BGU. Require one row per programme and two old-text matches, then inspect both `notes_match` values.
3. `03-rollback.sql`: restore the exact five pre-change strings from the `bgu_business` repair row at commit `084fd7f`, guarded by the new text and the same two-row count.
4. `04-verify.sql`: inspect the rows and require two results, one per programme, with `notes_match = true` and `row_count_matches = true`.

Apply and rollback both end with **ROLLBACK**, so executing either file as written persists nothing. After inspecting the in-transaction verification, Jorje must deliberately replace that final ROLLBACK with COMMIT for the intended operation. A raised exception aborts the transaction; do not bypass the expected-text or row-count checks.

Rollback assumption: both current production programme-note rows equal the pre-change repository repair text at `084fd7f`. The prior live captures show both pages rendering that text through the specific programme source, but they do not independently prove the generic row contents. This task did not read the production requirement rows. If the backup differs for either row, stop and regenerate the apply expected text and per-row rollback from the saved actual rows before executing; never overwrite an unverified row.

## Local verification

- `npm ci` completed; the repository pre-push hook is configured.
- Before data changes: the fixture-repointed publisher, catalogue query and sweep38 suites passed: **54 tests**. The fixture is byte-identical to `084fd7f:src/data/admissions/reviewedManifest.json`.
- Test-first proof: **8 new cases failed** against the old manifest, old dates and stale 580/600 Management notes; all 23 existing content-repair cases passed.
- After data changes: all six touched suites passed: **85 tests**, including the seven in-memory release items and both business page sources.
- Broader related checks: **231 tests passed across 16 suites**. `npm run lint` and `npm run typecheck` both passed.
- Independent file checks passed: all three historical test files differ only in their import path; the existing content-repair test file has insertions only; the fixture and five official JSON files match their originals byte-for-byte; unrelated repair entries retain their bytes; headers contain no Set-Cookie; apply/verify SQL arrays exactly equal the new repair notes and rollback exactly equals the old notes.
- The initial guard had 3,443 passes, 13 failures and one worker-start timeout. The communication failure was reproduced in isolation and traced to the October 23 clock in the fenced tile test. The orchestrator approved preserving communication's original date; no fenced test was edited. The orchestrator also reported all ten other affected files passing in isolation (404/404), identifying those failures as load-related.
- The revised new date test was run before the data adjustment and failed only for communication, expecting October 21 instead of October 29. This task's new tests were adjusted under the explicit follow-up authorization; all pre-existing assertions remain unchanged.
- After the approved date adjustment, **105 tests passed across seven focused suites**, including the unchanged requirement-tiles suite. The required `env -u DATABASE_URL npm run guard:pre-pr` then **passed: 3,482 tests across 143 suites** (32.15 seconds), with no bypass. This includes the migration consistency check, catalogue seed dry-run, operational-grant checks and committed admissions-evidence verification.
- `ce-plan` and `ce-work` were followed. The `ce-simplify-code` pass had no eligible production-code change: this task contains data/docs, the required file-only SQL and protected proof tests. No test was pruned or rewritten, and no review pipeline or review agent ran.
- No direct interactive browser, production schema/row query, preview deployment or live database-backed flow was performed. Jorje must verify desktop/mobile business pages, landing calculator and publication status after deployment and SQL as appropriate. The tests exercise the real page-source resolver against the static catalogue; they are not a claim of live browser verification.

Approved test update: Jorje 2026-10-29, fixture move only, no expected values changed.
