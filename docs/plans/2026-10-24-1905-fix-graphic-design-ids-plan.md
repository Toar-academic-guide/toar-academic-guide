---
title: Correct three mislabeled graphic-design programme IDs
date: 2026-10-24
type: fix
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

## Goal Capsule

Correct the Jerusalem dance and TAU music identities and retire the duplicate Sam Spiegel record using catalogue code that works against the existing production database.
Delivery is a tested feature-branch PR and an unexecuted guarded SQL packet; Jorje applies SQL after production is READY.

## Product Contract

### Requirements

- R1. Replace `jerusalem_academy_graphic_design` with `jerusalem_academy_dance`: תואר ראשון במחול, B.Dance, four years, audition-only Batch B admission with no invented numerical floor.
- R2. Merge `rubin_graphic_design` into the existing TAU `rubin_classical` row: תואר ראשון במוזיקה, B.Mus., four years. The keeper's explicit institution name and `rubin` institution's tau.ac.il domain distinguish it from Jerusalem's separate classical/jazz rows.
- R3. Delete `spieldocs_graphic_design`, redirect to `/institutions/spieldocs`, and correct the institution website to https://www.jsfs.co.il. Preserve `samspiegel_documentary`.
- R4. Return 308 for each old URL; remove old IDs from sitemap, browse/hub/related/institution links and institution JSON-LD. Stamp changed programmes with verified 24.10.2026 notes matching the repair manifest byte for byte.
- R5. Prepare BACKUP/APPLY/ROLLBACK SQL with assertions and verification, without executing it. No visual changes, new components, subject-slug follow-up, production writes, merges or main pushes.

Sources: official-source packet supplied with this task (2026-10-24); https://jamd.ac.il/dance, https://jamd.ac.il/acceptance, https://go.tau.ac.il/he/arts/ba/music, https://arts.tau.ac.il/music/kabla-I, https://www.jsfs.co.il/about and https://www.jsfs.co.il/registration.

## Planning Contract

- KTD1. Repair only the affected identities at the static catalogue and successful database-read boundaries. Database failures retain existing fail-loud behavior; no new fallback.
- KTD2. Use the existing alias map for dance and music saved references and add framework redirects for all three retired public paths. Keep the institution-only redirect separate from programme aliases.
- KTD3. Add explicit awarded credential data for the two verified degrees and use it in programme schema without inferring credentials for other programmes.
- KTD4. Use the established repair manifest for notes, source and date; replace contaminated descriptions/facts only for the two corrected programmes.

Directional data flow: source catalogue / successful DB serialization → affected identity repair → catalogue API / public catalogue → links, sitemap and JSON-LD.
The SQL packet uses soft retirement where needed to preserve saved and operational references, while code removes retired records from the active catalogue.

## Implementation Units

### U1. Characterize and correct catalogue identities

Files: `src/data/degrees/`, `src/data/admissions/`, `src/data/institutions.ts`, `src/server/catalogue/`, `src/lib/catalogueStatic.ts`, `src/server/admissions/batchBManualPathEvaluation.ts` and affected tests.
Requirements: R1–R3, R5. Execution note: write and observe failing behavior tests first, including stale database rows and post-packet rows.
Verify exact identity/credential/duration, no duplicate TAU row, honest dance evaluation for absent/weak/strong scores, source stamps and the corrected institution URL.

### U2. Retire public URLs and verify discovery

Depends on U1. Files: `next.config.ts`, `src/lib/seo/`, public catalogue link tests and focused e2e tests.
Requirements: R4–R5. Test redirects before implementation; assert real HTTP status/location, sitemap and all public link sets, institution OfferCatalog and P48M/credential schema. Preserve remaining collided subjects' behavior without introducing new subject slugs.

### U3. Prepare operational packet and deliver

Depends on U2. Files: `supabase/packets/2026-10-24-graphic-design-ids.sql` and verification documentation.
Requirements: R5. Inspect schema/FKs and prepare private backups, transactional guarded updates, rollback and verification SELECTs. Validate syntax locally where available; never execute against a connected database.

## Verification Contract

Observe red tests before changes, then run focused catalogue/API/link tests and real-browser desktop/mobile checks for affected public pages. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run guard:pre-pr`. No seeds, migrations, publication or freshness jobs.

## Definition of Done

All required checks pass or concrete unrelated blockers are reported; tests prove the stale/pre-packet and corrected/post-packet cases. The branch is committed and pushed and a PR is opened against main with source evidence, Rubin resolution, redirect table, intentional count changes, SQL instructions and the mandated code-review skip line. No review pipeline runs under the supplied profile restriction.
