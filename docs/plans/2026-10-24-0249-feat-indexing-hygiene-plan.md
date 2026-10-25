---
title: "feat: Indexing hygiene"
date: 2026-10-24
artifact_contract: ce-unified-plan/v1
product_contract_source: supplied-indexing-brief
execution: code
---

## Goal Capsule
Make the homepage identity consistent and let crawlers discover the public catalogue with meaningful modification dates. Follow the supplied indexing brief and standing MyWay rules. Deliver one PR on codex/indexing-hygiene; do not merge, deploy, mutate the database, change environment settings, or touch FAQ content/tests. Encoded profile excludes review pipelines. The caller owns delivery after ce-work and ce-simplify-code.

## Product Contract
### Summary and problem frame
The indexing diagnosis found no blocking policy: discovery paths are sparse, sitemap dates absent, the root identity inconsistent, and the production Vercel alias serves a duplicate.
### Requirements
- R1: Only the root absolute URL, homepage canonical, and root structured-data URLs gain a slash; other identities remain exact.
- R2: Every sitemap entry receives a real date. Prefer catalogue row timestamps or applicable source checkedAt dates; code-backed dates cover entries without DB timestamps. Static dates come from a recorded commit, never request time.
- R3: SSR Next Link blocks expose all generated subject hubs and 10–20 institutions from the homepage; the footer links institutions, about, and all hubs. Institution programs link their hub and up to eight same-subject programs at other institutions, excluding self/aliases/unlisted entries. Link all siblings when fewer than three exist.
- R4: Production Vercel hosts redirect 308 to the apex with exact path/query, while preview/apex/auth/calculator behavior stays intact.
- R5: Keep Hebrew copy short, right-aligned, responsive, and within the existing Way styles. Present visual evidence for Jorje/Amit approval before merge.

## Planning Contract
### Key technical decisions
- KTD1: Reuse loadPublicCatalogue for public data and its resolved generalProgramIds for hubs. Database failures continue to propagate.
- KTD2: A checked-in provenance registry records actual catalogue source commit dates; requirements stamps refine programs/institutions without needing DB writes. Preserve optional DB updatedAt through serializers when available. Aggregate hub/provider dates from related catalogue entries.
- KTD3: Render the homepage browse block as a server child of StudyJourney, below the hero only in the home state. Render the shared server footer from the root layout. Resolve related links on the server from catalogue subject identity, including generated subject IDs for institution-labelled programs.
- KTD4: Put the production alias redirect before session verification in the existing proxy, leaving the matcher unchanged.

## Implementation Units
### U1. Root identity and sitemap dates
**Requirements:** R1, R2. **Dependencies:** none.
**Files:** src/lib/site.ts, src/app/page.tsx, src/app/sitemap.ts, src/lib/seo/catalogueModified.ts, src/types/catalogue.ts, src/server/catalogue/serializers.ts, src/lib/seo/seo.test.ts, src/lib/seo/catalogueModified.test.ts, affected structured-data hash tests.
**Approach:** Keep sitemap URL membership/order fixed. Record source provenance; map real dates to every entry without request clocks.
**Test scenarios:** Root slash/default/other-path normalization; exact existing non-root sitemap URLs; all dates parse and remain stable across different clocks; source-stamp and row-timestamp selection.
**Verification:** focused tests plus rendered canonical/sitemap XML.
### U2. Crawl links
**Requirements:** R3, R5. **Dependencies:** U1.
**Files:** src/components/StudyJourney.tsx, src/components/seo/CatalogueLinks.tsx, src/app/page.tsx, src/app/layout.tsx, src/app/programs/[programId]/page.tsx, src/lib/publicCatalogueLinks.ts, src/lib/publicCatalogueLinks.test.tsx.
**Approach:** Reuse resolved catalogue identities. Minimal section titles, wrapping links, no new marketing or admission copy. Shared link treatment and responsive lists.
**Test scenarios:** Rendered homepage has at least twenty catalogue anchors; all generated hubs appear; related sections exclude self/same institution and cap at eight; every eligible institution program has its hub and all available siblings up to the cap; catalogue failure stays visible.
**Verification:** built app raw HTML plus desktop/mobile screenshots and no horizontal overflow.
### U3. Production alias redirect
**Requirements:** R4. **Dependencies:** none.
**Files:** src/proxy.ts, src/proxy.test.ts.
**Approach:** Check VERCEL_ENV and hostname suffix, build target from fixed origin plus pathname/search.
**Test scenarios:** Production alias 308 with query preserved, production apex pass-through, preview alias pass-through, existing calculator/auth coverage unchanged.
**Verification:** proxy unit tests; live alias curl deferred until authorized production deployment.

## Verification Contract
Run lint, typecheck, focused Vitest, and guard:pre-pr. Build with explicit local/static catalogue mode for offline verification. Use a short-lived next start on a free port with guaranteed cleanup for raw HTML and browser checks; no dev servers. Compare all non-root sitemap locations against the existing catalogue. Record browser screenshots and insufficient-sibling subjects in PR evidence. Do not run database mutation commands.

## Definition of Done
All four behaviors have meaningful passing tests; local rendered evidence establishes canonical, sitemap dates and SSR link counts; screenshots document desktop/mobile layout; simplification completes without altering proof tests; abandoned code is removed. Commit/push the scoped files, open the specified PR against main, include acceptance evidence and the required code-review skip phrase. Production redirect verification and visual approval remain explicit pre-merge requirements for the owner.
