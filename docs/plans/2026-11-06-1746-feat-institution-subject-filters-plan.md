---
title: Institution Subject Filters - Plan
type: feat
date: 2026-11-06
topic: institution-subject-filters
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
execution: code
issue: https://github.com/Toar-academic-guide/toar-academic-guide/issues/379
---

# Institution Subject Filters - Plan

## Goal Capsule

- **Objective:** Help prospective students find institutions offering their chosen field or programme and reach the relevant programme's admission requirements.
- **Means:** Extend `/institutions` with pressable subject pills and a scannable institution comparison.
- **Product authority:** Issue #379 and the user's approval on 2026-11-06 of the interactive pill sketch, full catalogue coverage, search, and “הצגת הכל”.
- **Open blockers:** No unresolved product choice prevents planning. Catalogue coverage and institution/programme mappings still need verification; the sketch's fictional records are not evidence of coverage.

## Product Contract

### Summary

Show all institutions initially and let students narrow the list with broad-field and specific-programme pills.
Use the real catalogue, with searchable, expandable subject lists and links to matching programmes.
Keep the page concise on desktop and mobile.

### Key Decisions

- KD1. **Browse before filtering.** Governs R1. (session-settled: user-directed — chosen over requiring a subject first: students can explore all institutions before narrowing.)
- KD2. **Support both levels of subject specificity.** Governs R2–R5. (session-settled: user-directed — chosen over broad-only or programme-only filtering: students may know either a field or an exact programme.)
- KD3. **Pressable pills in separate field and programme groups.** Governs R2–R5. (session-settled: user-directed — chosen over the dropdown sketches: the user requested pills and approved the working interaction.)
- KD4. **The demonstration is not the coverage boundary.** Governs R6–R8. (session-settled: user-approved — chosen over displaying the entire long list at once: preserve complete coverage while using search and expansion to keep the page manageable.)

### Requirements

**Browsing and filtering**

- R1. Opening `/institutions` with no filters shows all public institutions in the directory, with one result per institution.
- R2. Provide separate pill groups for broad fields and specific programmes, allowing at most one active selection in each group.
- R3. Selecting a field narrows both the available programme pills and institution results to that field; changing or clearing the field clears the specific-programme selection.
- R4. A specific programme can be selected without first choosing a field, and only institutions offering that programme remain in the results.
- R5. Pressing an active pill again clears that group's selection, while “הכל” clears it explicitly; active selections must remain visible.
- R6. Long pill lists support text search and “הצגת הכל”, with matching and selected choices accessible even when the list is collapsed.

**Coverage and results**

- R7. Include all public catalogue fields and listed programmes, including applicable certificate and vocational offerings, using actual programme-to-institution relationships.
- R8. Resolve missing or ambiguous mappings needed for R7 from official sources before shipping the affected filtering; do not invent offerings or present missing information as proof that an institution does not offer a subject.
- R9. Show each institution's name, location, type, and matching programme links, preserving access to its institution page.
- R10. Retain existing region, institution-type, qualification/funding, and institution-name filtering; these restrictions combine with the subject selection.
- R11. Show accurate institution and programme counts for the displayed scope, with correct singular/plural Hebrew and no duplicate programme counts caused by aliases or generic subject pages.
- R12. Provide institution-name sorting in both directions and a clear empty state that leaves the filters available to change.

**Presentation**

- R13. Use a scannable comparison table on desktop and stacked institution rows on mobile, with concise Hebrew labels and right-aligned text and input values.
- R14. Pill filters support touch and keyboard use with visible focus and selected states.
- R15. Align the page title and metadata with finding and comparing institutions by subject, without unsupported ranking, admission, or coverage claims.

### Key Flow

F1. A student opens the directory, optionally selects a field, selects a programme, narrows by region or institution type, and opens a matching programme's admission information. Covers R1–R10.

The page places the title above the broad-field pills, then specific-programme pills, followed by secondary filters and institution results. Search and expansion belong with the long subject lists. Desktop results use aligned columns; mobile results keep each institution's details and programme links together. Covers R6, R9, R13.

### Acceptance Examples

- AE1. **Initial view and reset — R1, R3, R5:** Open the directory with no filters. Select “הנדסה”, then “הנדסת תוכנה”. Press the programme again to restore all engineering matches; clear the field to restore the unfiltered institution list when no secondary filters apply.
- AE2. **Direct programme selection — R4, R9:** Select a specific programme without choosing a field. Every result offers that programme, and its programme link opens the correct institution/programme information.
- AE3. **Change field — R3:** With engineering and software engineering selected, choose a different field. The previous programme selection clears and cannot silently exclude institutions in the new field.
- AE4. **Complete lists — R6–R8:** Find a real programme beyond the initially visible pills through search and “הצגת הכל”. Its institution matches agree with the catalogue and official mapping evidence; placeholder, retired, or generic rows do not create false offerings.
- AE5. **Combined filters and zero matches — R10, R12:** Combine a programme with a region and institution type. Only institutions satisfying all selections remain. A combination with no matches displays the empty state, and clearing the restrictive filter restores results.
- AE6. **Counts, links, and mobile — R9, R11–R14:** At 1280px and 390px, check a single-result case, a multiple-result case, sorting, keyboard/touch selection, and opening a matching programme. Read both empty and filled search values and Hebrew labels; no controls or programme names should overflow horizontally.

### Scope Boundaries

This work covers issue #379's directory comparison and subject discovery. Grade-based eligibility remains in the calculator. It does not add institutional rankings, tuition comparisons, or a separate shortlist feature. Broad expansion of thin institution descriptions belongs to #369; evidence work required for correct subject mappings remains part of R8.

The sketch establishes interaction and layout direction, not production branding, exhaustive subject taxonomy, or a replacement for the real catalogue. Existing qualification/funding controls remain governed by R10 even though the simplified interactive sketch omitted them.

### Dependencies

The active public catalogue supplies the programme inventory. U1 accounts for its complete listed population and resolves required mappings before U2 consumes it. KTD1–KTD3 define the data boundary and identity rules; KTD4 defines pill ordering and expansion. No product question is left for implementation to invent.

### Success Criteria

Before implementation, the implementation plan must identify affected files and required checks. User verification follows AE1–AE6 on a preview, with screenshots at 1280px and 390px before merge as required by issue #379. A working UI with incomplete required mappings does not complete this work.

### Sources

- [Issue #379](https://github.com/Toar-academic-guide/toar-academic-guide/issues/379): comparison scope, accurate counts, sortable results, and required screenshots.
- `src/components/InstitutionsDirectory.tsx` and `src/data/institutionDirectory.ts`, inspected on GitHub `main` on 2026-11-06: existing directory, region/type/qualification filters, institution identity handling, and no current subject selection.
- `src/data/degrees/types.ts` and `src/data/degrees/index.ts`, inspected on GitHub `main`: programme categories, institution associations, listing status, and academic/non-academic programme types.
- `src/lib/publicCataloguePages.ts` and `src/app/institutions/[institutionId]/page.tsx`, inspected on GitHub `main`: existing institution programme resolution, canonical/listed filtering, and programme links. This is a code-level check, not a verification of deployed catalogue completeness.
- Machine-local visual reference: `/tmp/compound-engineering-501/ce-brainstorm-visual/institutions-379-20261106/screens/002-clickable-pills.html`; filtered screenshots are `pills-desktop.png` and `pills-mobile.png` in the same run directory. These temporary examples use fictional data. They are best-effort references while the directory exists; their absence is not a blocker and this document governs any disagreement.


---

## Planning Contract

### Baseline and Scope of Execution

Planning inspected GitHub `main` at `9df52a5ffe8d4dbc62d9cd65b37ff1a3dbed2bbf` on 2026-11-06. The local checkout is an older branch with unrelated changes; implementation starts in an isolated worktree from current `main`, on `codex/379-institution-subject-filters`. Carry this plan into that worktree without moving or reverting existing work.

Deliver one feature PR. Recheck the current PR ownership/state before opening it, following the project's one-PR-at-a-time rule. Do not merge, deploy production, or update Monday/GitHub discussions as part of planning. Implementation begins only after the user approves this concrete plan.

This plan changes the directory page, its programme projection and subject mapping, related metadata, and focused tests. It does not require a new API, database table, dependency, or background job. If evidence shows an existing catalogue record needs a production data correction, identify the exact correction and its existing publication path before execution; material expansion needs approval.

### Key Technical Decisions

- KTD1. **Resolve programmes on the server through the existing public catalogue.** Make `src/app/institutions/page.tsx` async, consistent with the institution detail route's data-loading pattern. Call `loadPublicCatalogue()` once per render, then pass a compact serializable directory projection to the client. Do not pass admission formulas, evidence notes, entire programme objects, or credentials. Governs R7–R11.
- KTD2. **Share the existing institution programme selection.** Extract the selection currently inside `getPublicInstitutionPageData()` into a reusable helper within `src/lib/publicCataloguePages.ts`; keep the existing wrapper's output unchanged. The directory composer uses that helper, `canonicalInstitutionId()`, and `canonicalProgramId()` so listed status, aliases, generic subject ownership, and provider-specific precedence follow the institution pages. Preserve database error propagation. Governs R1, R7–R9, R11.
- KTD3. **Use an explicit, complete subject mapping.** Add a small directory-specific mapping module covering canonical programme IDs, stable subject keys, and broad field keys. Existing `PROGRAM_FIELD_MAP`, programme categories, and `institutionProgramName()` are inputs to reconcile, not proof of complete coverage. Group genuinely equivalent programmes across institutions under one pill while preserving each offering's real programme ID and URL. Keep academic degrees and similarly named professional courses distinct; do not use keyword matching as evidence of an offering. Governs R2, R7–R9, R11.
- KTD4. **Keep interaction state local and immediate.** The client owns selected field, selected programme, existing secondary filters, subject-list searches, expansion state, and sort direction. Derive matches from the server projection without refetching for each press. Subject search filters available pills, not institution results until a pill is selected. Default subject ordering and institution sorting use a Hebrew collator. Governs R2–R6, R10, R12.
- KTD5. **Reuse the page shell and controls.** Extend `InstitutionsDirectory.tsx`; use a small local pill-group helper rather than a new filtering framework. Render native buttons with `aria-pressed`, labelled searches, and existing visual tokens. Remove the separate featured institution strip so it cannot display institutions outside the filtered result set. Governs R1, R9, R13, R14.

### Data Shape and Reconciliation

Add `src/lib/institutionDirectoryData.ts` as a server-only composer and `src/data/institutionSubjects.ts` for the subject mapping. Define the narrow client DTO beside the existing directory types, without changing database or public API response types:

- Each institution retains its canonical ID, name, existing metadata/filter tags, official link, and an array of programme offerings.
- Each offering includes its canonical programme ID, short display name, subject key, broad field key, and actual programme URL.
- Each pill option includes a stable key and Hebrew label; programme options also identify their broad field.

Use the existing directory as the initial institution population, reconcile aliases without merging distinct institutions, and include any public catalogue provider missing from that population. Preserve the two distinct Tiltan institutions and existing official-link rules. Do not manufacture Monday item IDs for catalogue-only providers; the client DTO should not require them.

For a programme offered at several institutions, one subject pill selects all matching offerings. Prefer the provider-specific programme URL already used by the public catalogue. If the existing route is a general subject page, retain its genuine provider relationship and link rather than fabricating a provider-specific route. U1 must identify such cases so they cannot count twice alongside a specific programme.

An institution with no programme records remains visible before subject filtering. Its unavailable programme count is “—”, not a claim of zero offerings; retain the existing official institution link. This does not excuse an unresolved mapping for a listed catalogue programme: those are U1 gaps under R8.

Counts have explicit units: the result count is distinct institutions; each institution's programme count is its deduplicated matching offerings. Do not introduce a global total that mixes distinct subjects and institution/programme pairs.

### Pill and Result Details

Display “הכל” followed by the first 8 options on desktop and 4 on mobile in each collapsed pill group. Keep the selected pill visible in addition to that slice. “הצגת הכל” reveals the rest and “הצגת פחות” collapses it without changing selections. While searching, show all matching options and keep any selected option visible. Use CSS breakpoints for the collapsed presentation to avoid reading viewport width during server rendering.

A field change clears the programme selection and its search text. Clearing a programme preserves the field and secondary filters. Direct programme selection does not silently apply a field selection. Field and programme options are not removed by secondary filters, so a zero-result combination remains understandable and reversible.

Keep qualification/funding, geography, institution-type and name controls below the subject groups. Render one institution result set: a table at desktop width and readable stacked rows on mobile. Preserve the institution-name link and show matching programme links, with an initial 3 links per institution and local “הצגת הכל” when needed. Sorting changes only order, not counts or selection.

Use “מוסדות לימוד בישראל – השוואה לפי תחום לימודים” for the page metadata title and “מוסדות לימוד בישראל” for the visible heading. Update the description to mention subject, location, and institution type. Keep `/institutions` as the canonical URL. Feed JSON-LD the same unfiltered, deduplicated institution set as the initial UI; filtering remains client-local.

---

## Implementation Units

### U1. Establish complete catalogue mappings

**Files:** new `src/data/institutionSubjects.ts`, new `src/data/institutionSubjects.test.ts`, and `docs/institutions/issue-379-catalogue-mapping.md` as a concise evidence ledger. Read `src/data/degrees/fieldEnrichment.ts`, catalogue listing/alias helpers, and existing official programme sources.

Inventory all listed canonical programmes and public institution relationships from the active catalogue. Record programme ID, institution ID, short label, subject key, broad field, and the source for any mapping correction. Reconcile every distinct category and programme; do not restrict coverage to the sketch's three fields or the partial enrichment map. For ambiguous programme equivalence or missing provider mappings, consult official programme pages and retain the evidence in the ledger. Exclude retired/alias rows according to existing canonical rules, with explicit reasons.

**Exit:** every in-scope listed programme has a reviewed subject/field mapping and provider resolution, with no unexplained omissions. The ledger separately identifies institutions lacking programme data. No claim of production completeness is made by this planning document; the inventory and official-source gap closure are implementation work.

**Focused checks:** full-inventory mapping coverage, invalid subject references, accidental academic/certificate conflation, and generic/provider duplicate handling. Covers R7, R8, R11.

### U2. Connect the directory to public programme data

**Files:** `src/lib/publicCataloguePages.ts`, `src/lib/publicCataloguePages.test.ts`, new `src/lib/institutionDirectoryData.ts` and its test, `src/data/institutionDirectory.ts`, `src/data/institutionDirectory.test.ts`, `src/app/institutions/page.tsx`.

Implement KTD1–KTD3 after U1. Extract the existing programme selection without changing institution detail behavior, compose the canonical institution population, and return the compact DTO. Use one catalogue load and build reusable lookup maps in memory. Keep internal evidence fields out of the client projection and propagate catalogue load failures through the existing Next.js error handling.

**Exit:** directory programme IDs agree with institution-page selection, all required institutions remain available, and the initial page renders real programme links on the server. Covers R1, R7–R11.

### U3. Build the approved pill interaction and comparison

**Files:** `src/components/InstitutionsDirectory.tsx`, new `src/components/InstitutionsDirectory.test.tsx`; update `src/app/institutions/page.tsx` metadata and narrow the input type of `institutionDirectoryLd()` in `src/lib/seo/jsonLd.ts` only if required by the compact DTO.

Implement the selection, search, expansion, sorting, counts, and responsive presentation specified above. Preserve the existing institution name and official links. Apply natural Hebrew and right alignment to labels, placeholders, filled searches, and result text. Keep the initial server and client render identical.

**Exit:** AE1–AE6 work with the complete real option set and do not require a field selection before choosing a programme. Covers R2–R6, R9–R15.

### U4. Verify the page and prepare one PR

**Files:** new `e2e/institutions-directory.spec.ts`; update `e2e/durable-url-model.spec.ts` only if a selector depends on the replaced directory presentation. Record screenshots and verification results alongside the PR evidence using existing repository conventions.

Add focused browser coverage for the new filtering behavior to the existing Playwright setup; do not add a workflow. Check the preview against real catalogue data and confirm it belongs to the `toar-academic-guide` project. Preserve existing required CI jobs and run the pre-push guard. Read the Next.js guides from the implementation worktree's installed package before code changes; the current local package is older than the inspected `main` lockfile.

**Exit:** the verification contract below passes, desktop/mobile screenshots are available for the user, and any remaining limitation is stated accurately. The intended delivery is one PR; merge requires its normal review/approval process.

---

## Verification Contract

Planning changed this Markdown document only. The following checks are required during implementation, not claimed as already executed.

| Area | Check | Expected result |
| --- | --- | --- |
| Coverage and data projection | `npx vitest run src/data/institutionSubjects.test.ts src/data/institutionDirectory.test.ts src/lib/institutionDirectoryData.test.ts src/lib/publicCataloguePages.test.ts src/lib/institutionProgramName.test.ts` | Complete mapping coverage, canonical institutions, no duplicate offerings, institution detail selection preserved, and database-load errors not hidden |
| Interaction | `npx vitest run src/components/InstitutionsDirectory.test.tsx` | Direct programme selection, field changes, deselection, search beyond collapsed options, counts, and zero-result recovery |
| Browser | `npx playwright test e2e/institutions-directory.spec.ts e2e/durable-url-model.spec.ts` | Approved flow and existing navigation work at 1280px and 390px |
| Quality/build | `npm run typecheck`, `npx eslint <changed TS/TSX files>`, `npx prettier --check <changed source files>`, `npm run build` | All pass; use actual changed paths in the scoped lint/format commands |
| Required guard and CI | `npm run guard:pre-pr` before pushing/opening the feature PR; existing GitHub checks | No bypasses; all applicable checks pass. Changes under `src/data/` make the existing internal data-health smoke applicable under the inspected classifier |
| Deployed catalogue | Compare preview mappings/counts with the active catalogue and U1 evidence; open representative programme links | Correct live providers, no placeholders or static fallback masking a failed database read |
| Adjacent shared behaviour | Existing catalogue/institution-page tests plus landing-page calculator smoke when validating the shared catalogue change | Shared programme selection and catalogue loading remain functional |

### User Verification

1. Open `/institutions` on the preview at desktop and mobile widths. All institutions should appear initially, with no selected subject except “הכל”.
2. Select “הנדסה”, then “הנדסת תוכנה” using the actual mapped options. Only institutions with those programmes should remain; their programme links should point to the relevant real pages.
3. Press the active programme again, then clear the field. The results should broaden in that order. Select a programme directly from the unfiltered page to verify that choosing a field first is optional.
4. Find a programme outside the initial visible pills using search and “הצגת הכל”. Select it, collapse the list, and confirm the selected pill remains visible and active.
5. Combine a programme with a region and institution type; verify the matching and zero-result cases, then clear the restrictive filter. Check singular/plural counts and institution-name sorting.
6. Open an institution and a matching programme. Confirm that the institution identity and admission information correspond to the selection.
7. At 390px, check tap targets, wrapped Hebrew text, empty and filled search alignment, and absence of horizontal overflow. At 1280px, check table alignment and keyboard focus. Capture both widths for review.

---

## Definition of Done

- U1 accounts for the complete in-scope catalogue and resolves all mapping gaps required for the feature.
- The real page satisfies R1–R15 and AE1–AE6; the sketch's fictional data is absent.
- Focused tests, the existing required guard/CI, and preview verification pass, with 1280px and 390px screenshots.
- One feature PR contains the approved scope and concrete verification evidence, with no unrelated working-tree changes.
- A preview or open PR is reported as such; it is not described as merged or deployed to production.
