# Technion reviewed winter cutoff publication

This is the publication follow-up to #281 (`9d44a793db0fbe9d9826d57d66fb0db8246d0480`). No UI, formula, input gate, medicine rule or SQL migration changes.

## Reviewed release

Replace the previous BGU Psychology 675 → 650 manifest with the same version-2 `canonical_change` structure. The BGU precedent is present in `git show 7e8deab:src/data/admissions/reviewedManifest.json`: both the institution programme and its general-subject alias are separate targets. The existing `Publish Reviewed Admissions Release` workflow publishes a manifest change only after it reaches main; this PR does not invoke publication.

| Programme ID | Institution | Cycle | Before | After |
| --- | --- | --- | --- | --- |
| technion_ee | technion | 2027 | 94 | 91.5 |
| technion_me | technion | 2027 | 92 | 87 |
| ee | technion | 2027 | 94 | 91.5 |
| me | technion | 2027 | 92 | 87 |

All four changes use `admission_cutoff`, effective review date `2026-10-25`, exact-official proofs and the corresponding registry IDs `technion-<programme ID>-live`. The publisher updates one matching `sekhem` row guarded on its before-value and writes the target transition and release item atomically. Its manifest digest makes retries idempotent. No manual cutoff SQL is included.

Source: [Technion's official winter תשפ״ז initial threshold table](https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/), `tablepress-485`. The winter EE row is 91.5 and ME is 87; spring EE 94 is not the winter cutoff. These are initial winter 2026 conditions, not newly published winter 2027 conditions. Cycle 2027 follows the existing reviewed release convention and the brief. The live page was checked on 2026-10-25; no formula was re-derived.

The proof digest was checked against `/workspace/seo-geo/raw/technion-sweep-2026-10-25/technion-sechem.html`: SHA256 `8dd512d269f64e33325e0342c8bcd1c7ff1b70c9a6cfce5773e2eac9a89cb400`. The existing local backup `/workspace/seo/technion_winter_2026-10-25/backup/admission_thresholds_full_before.json` confirms the four before-values and row IDs `<programme ID>:technion:technion:sekhem`. This run did not query production.

## Legacy read audit

Commands used:

```sh
rg -n 'ee:technion|me:technion' src scripts .github
rg -n "['\"](ee|me)['\"]|technion_ee|technion_me" src scripts .github
rg -n 'admissionThresholds|thresholdRows|serializeProgramRow' src/server/catalogue/queries.ts
rg -n 'loadPublicCatalogue|getPublicProgramPageData|listCataloguePrograms|programFaqPageLd' src/app src/lib
```

The literal composite-ID search has no matches. The broader search and generic queries show that the rows are read:

- Evaluator/registry: `src/data/admissions/technionProgramVerification.ts` explicitly registers `ee`/`technion_ee` and `me`/`technion_me`; `src/data/admissions/tauProgramVerification.ts` merges those artifacts. `src/server/ingestion/admissionsSourceRegistry.ts` creates live targets for every artifact. The evaluator resolves `<degree ID>__<institution ID>` through that registry. #281's live cutoff replay does not make the catalogue rows unused.
- Catalogue/API: `src/server/catalogue/queries.ts` loads every programme's threshold rows by programme ID, then passes each programme's rows to `serializeProgramRow`. `src/app/api/catalog/programs/route.ts` returns that catalogue, including general subjects.
- Pages/SEO/sitemap: `src/lib/publicCataloguePages.ts` consumes the same catalogue and uses general-subject thresholds to resolve providers. `src/app/programs/[programId]/page.tsx`, `src/lib/seo/metadata.ts` and `src/app/sitemap.ts` consume those results. FAQ generation in `src/lib/seo/jsonLd.ts` is allowlisted and does not currently include EE/ME or infer thresholds.
- Scripts: `src/db/seeds/catalogueSeed.ts` iterates programme thresholds to build IDs `<programme>:<institution>:<university>:sekhem`. The seed mirror is not the canonical publication path; no seed application was run.

Therefore both legacy rows are included in the canonical release.

## Production schema contract

The deployment record `/workspace/pm-research/db_changes.md` states that 0037–0040 are live but have no Supabase migration-history entries; the recorded history ends at 0036 (`assessment_progress`). `GUARDED_PRODUCTION_MIGRATIONS` now documents them separately from the journal and never puts them in the pending migration list.

For a current journal, preflight additionally requires `user_profiles.bagrut_weighted_average: real` (0037), `programs.is_listed: boolean` (0039) and `admission_thresholds.threshold_value: numeric` (0040). A missing/wrong column reports drift with `safeToMigrate: false`. `appliedThrough` still truthfully describes the recorded journal (0036). Schema snapshots cannot verify the catalogue data repairs in 0038/0039; the contract records their deployed status without claiming row verification. No history rows are fabricated and historical SQL must not be replayed.

## Validation

- Tests were added first: five failures demonstrated the old manifest and missing guarded-schema checks; the focused manifest/publisher/preflight/validator suite then passed (75 tests).
- The actual manifest passed `parseReviewedAdmissionsManifest`, the publisher's strict Zod validator, via a local read-only Node invocation. The generated-weekly-PR CLI checks a different three-file allowlist and is not applicable to this hand-authored PR with migration-contract changes.
- The new publisher regression checks all four cutoff changes, fractional 91.5, cycle, ledger values and idempotent retry using the in-memory repository. It does not connect to a database.
- Full suite, TypeScript, ESLint and `npm run guard:pre-pr` results are recorded in the PR body. Existing CI runs migration/seed/publication integration checks against disposable PostgreSQL.
- No production SQL, migrations, seeds, publication/freshness workflow runs, environment changes or manual deployments. There is no UI delta; browser checks are left to the existing CI smoke suites. Production publication and live verification remain with Jorje after merge.

Code review: skipped (ce-code-review unavailable) — Encoded profile restriction.
