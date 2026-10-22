---
title: Requirement number tiles - Plan
type: feat
date: 2026-10-23
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---
# Requirement number tiles - Plan

## Goal Capsule

Students can scan trustworthy admission thresholds and open the full conditions when needed.
Means: a shared opt-in requirement tiles component (KTD1).
Authority: Amit's latest clarification overrides earlier file names in the brief. Implement and verify locally, simplify, then push only codex/requirement-tiles and open one PR against main. No database mutations, migrations, seeds, publication/freshness runs, environment changes, manual deployment, merge, comments or outreach. No review pipelines or multi-agent reviews.

---
## Product Contract

### Summary

Use Variant B number tiles on program pages and the calculator detail requirements block. Preserve existing list rendering when trustworthy structured data cannot represent the requirements.

### Problem Frame

The current admission card buries thresholds in prose. Estimated legacy thresholds and institution-wide evidence cannot safely stand in for verified program-specific requirements.

### Requirements

- R1. Apply the approved tiles, short qualifiers, optional common chips, and closed פרטים נוספים disclosure using existing styles and RTL alignment.
- R2. Show מספיק אחד מאלה: only for explicit alternatives; use התנאים: for cumulative gates. Unknown semantics fall back to the existing list.
- R3. Use structured catalogue or evaluator route data corroborated by current official evidence. Reject incomplete coverage, unverified sources, mismatched current requirements, and stale records.
- R4. Keep the four approved overrides exactly as specified in the task and cross-check their numbers with docs/admissions-verification/2026-10-22-official-requirements-4.json. Preserve the Colman copy corrections and MTA formula direction.
- R5. Only the main calculator detail requirements block in src/components/StudyJourney.tsx changes. Preserve all current conditions in details without duplicate items, omit the calculator link there, and preserve decisions, badges, explanations, actions and links. RecommendationResults and the other StudyJourney block retain their rendering.
- R6. Keep external link rows and attribution intact; program-page calculator links use ROUTES.calculator.
- R7. Verify desktop and 390px mobile, publish only 1440px screenshots, and report coverage and fallback reasons across the full catalogue.

---
## Planning Contract

### Key Technical Decisions

- KTD1. Add a separate shared component and pure tile selector; leave AdmissionRequirements' default rendering intact (session-settled: user-directed — chosen over changing all callers: only program pages and calculator detail are authorized).
- KTD2. Resolve program-page tiles in publicCataloguePages from the same selected sourceProgram/sourceDetail used for the visible list. Never substitute seed data for a failed database read.
- KTD3. Use BGU_SOCIAL_SCIENCE_RULES fields score, psychometric, operator, psychometricOnly and bagrut for explicit ordinary alternative routes. Their operator provides AND/OR semantics; qualifiers retain cumulative subconditions and general language conditions. Use catalogue thresholds, minimumPsychometric, minimumBagrut and high-confidence numeric admissionFacts only when a current verified record corroborates their field and value and the route semantics are explicit. Do not infer alternatives from the existence of two numeric fields.
- KTD4. Gate recent records using catalogueContentRepair coverage, checkedAt, sourceUrl and exact notes; require published_conditions. Its incomplete_published_requirements records always fall back. The four overrides require exact canonical requirements and notes against the approved official fixture. No arbitrary date from build/deployment is used. Legacy admissionFacts often come from text synthesis, groupKey is not retained by DB serialization, and most recently repaired rows intentionally clear facts; these are not independent verification. Monday capability/confidence alone is institution-level and insufficient. Preserve absence of information versus explicit open admission.
- KTD5. Keep structured rules and presentation separate from evaluator logic. Reuse the existing number/formula list renderer for disclosure content, preserving default output.

### High-Level Technical Design

Directional data flow:

```text
Loaded catalogue source + verified evidence
  -> accuracy/semantics selector -> tiles model or fallback reason
  -> shared component -> number tiles + closed full details
                     -> unchanged AdmissionRequirements on fallback
```

Decision sketch:

```text
unlisted/incomplete/unverified/changed/stale -> existing list
approved four-program evidence match       -> typed override
explicit structured routes + evidence      -> alternative tiles
corroborated cumulative gates              -> cumulative tiles
unknown semantics / too little data        -> existing list
```

### Research

src/server/catalogue/serializers.ts carries thresholds, directPsychometric and institutionDetails, and takes minimums from static policy configuration. Recent official content repairs disagree with several legacy thresholds (e.g. tau_law 695 versus published 647), so those values cannot be displayed merely because they are numeric. The public loader already selects authoritative per-institution requirements. The Monday execution board was read including subitems; it provides no additional task-specific requirements. Next's installed server/client component guide and docs/ui-style-guide.md govern boundaries and styling. Existing official-requirements Playwright tests cover the four programs and calculator detail.

---
## Implementation Units

### U1. Select trustworthy tiles

Goal: reusable presentation models for supported catalogue sources (R2–R4; KTD3–KTD4).
Files: src/lib/requirementTiles.ts, src/lib/requirementTileOverrides.ts and tests.
Approach: typed four-program override; evidence-backed structured generic routes/gates; explicit fallback reasons for coverage reporting. Execution note: add selector and catalogue-wide cross-check tests before implementation.
Test scenarios: every seeded program's displayed numbers are backed by official text/structured data; incomplete or changed notes and requirements do not tile; explicit OR and AND labels differ; four overrides agree with official fixture.
Verification: focused Vitest tests and full seed coverage enumeration.

### U2. Render and connect the shared requirements block

Dependencies: U1.
Goal: approved compact card on both authorized surfaces (R1, R5–R6; KTD1–KTD2, KTD5).
Files: src/components/RequirementTiles.tsx, src/components/AdmissionRequirements.tsx (renderer export only), src/lib/publicCataloguePages.ts, src/app/programs/[programId]/page.tsx, src/components/StudyJourney.tsx and relevant tests.
Approach: responsive wrapping tiles with right-aligned Hebrew, closed disclosure, optional calculator link. Use the exact same selected source and raw list for fallback. Calculator details retain all prior list items alongside approved explanatory content, deduplicated.
Test scenarios: fallback DOM equals existing component; details closed; formula has LTR bdi; calculator has no self-link; unchanged other callers and decision/actions.
Verification: component and public-loader tests, existing journey tests.

### U3. Verify and publish

Dependencies: U2.
Goal: a reviewable PR with evidence (R7).
Files: affected e2e tests, docs/ui-verification artifacts and coverage report.
Approach: compare calculator decision/badge/explanation against main/production for law low, MTA low, Colman CS Bagrut match and generic tiled program. Verify four program pages plus tau_law and nursing at 1440 and 390px. Run ce-simplify-code inline, without review agents or review pipelines, per user instruction.
Test scenarios: layout has no overflow/clipping, disclosure retains every requirement, calculator status and actions identical to baseline.
Verification: npm run test, npm run typecheck, npm run lint, npm run guard:pre-pr; Playwright; desktop screenshots. Then push only the prepared branch and gh pr create.

---
## Verification Contract

Run all four required npm checks, no bypass. Use existing read-only catalogue/evaluation endpoints and Playwright without saving profile data or triggering publication. Record exact tiled/fallback public-program totals, grouped reasons and ambiguous semantics list; include four program and four calculator screenshots at 1440px in the PR. If live data or preview access is unavailable, identify the precise limitation rather than claim it passed.

## Definition of Done

All U1–U3 behaviors verified, no evaluator changes or unauthorized caller changes, no abandoned exploratory code, required checks passing, coverage documented and one PR open with the required title. Print the PR URL last.
