---
title: Haifa Psychology Floors and Source Stamp - Plan
type: fix
date: 2026-10-24
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Haifa Psychology Floors and Source Stamp - Plan

## Goal Capsule

- Objective: Prospective students see the regular Haifa psychology admission conditions and can distinguish them from the separate פסיפס track.
- Means: Reuse verified catalogue repair and withheld calculator evidence (KTD1–KTD3).
- Authority: The task brief and its official captured HTML govern admissions facts; repository rules and the supplied MyWay admissions workflow govern delivery.
- Execution: One existing feature branch and one PR against main; the coding agent implements and verifies, Jorje verifies readiness.
- Stop conditions: No production SQL, DB writes, merge, deployment commands, or external messages.

## Product Contract

### Summary

Replace the regular programme's incorrect psychometric and Bagrut minima with the published סכם conditions, identify פסיפס as a separate track, and attach the checked source date.
Keep the calculator honest when ordinary Bagrut and psychometric inputs cannot establish admission.

### Problem Frame

The page currently presents the פסיפס composite score as a psychometric floor and an unrelated 85 as a Bagrut average.
Students could rule themselves out or trust an unsupported result.

### Requirements

**Catalogue content**

- R1. The main requirement is `סכם 650 לפחות; ציונים 630–649 נמצאים בטווח ההמתנה.`; remove psychometric 680 and Bagrut 85 as regular minima.
- R2. Use the stamped Haifa peer wording for English pre-basic and Hebrew 90, conditional until 120, with the official placement/course alternatives.
- R3. Include `תוכנית פסיפס (מסלול נפרד עם החוג לפילוסופיה): סכם 680 לפחות + ראיון קבלה.` without making its interview or score regular-programme gates.
- R4. Stamp matching notes with 24.10.2026 and the official source URL, using SHA256 `ce3270195a0ee34608b949f6b2b698b69a4de9fcf80007721f99a915b2232476` and `published_conditions` coverage.

**Calculator and delivery**

- R5. Preserve the regular סכם threshold of 650 and policy waiting minimum 630; return unknown through the existing withheld path rather than manufacture a psychometric substitute or request institutional composite inputs.
- R6. Correct static and database-backed catalogue reads, including stale inferred main-floor facts, without database mutations or static fallbacks on database errors.
- R7. Deliver focused regression evidence, browser verification where available, the pre-PR guard, and the named verification document, then commit, push, and open a PR without merging.

### Scope Boundaries

No FAQ allowlist or FAQPage test edits, hubs, UI redesign, other programme repairs, Ofek, miluim, prior BA, OU, or makiha admission paths.
A new formula and a generic catalogue overlay rollout were considered and excluded: neither is needed to establish this programme's published requirements and honest unknown result.

## Planning Contract

### Key Technical Decisions

- KTD1. **Keep the existing three-line Haifa presentation.** Store identical notes in `src/data/degrees/academicPrograms.ts` and `src/data/admissions/catalogueContentRepair.json` (R1–R4); existing AdmissionRequirements rendering needs no new UI.
- KTD2. **Repair this programme at catalogue serialization.** Reuse `applyCatalogueContentRepair` for this ID after a successful DB read, remove obsolete floor facts for this pair, and bypass legacy inference for this programme so the secondary interview cannot become a default gate (R3, R6). Other programme serializers retain their behavior.
- KTD3. **Use existing withheld evidence.** Add only `haifa_psychology__haifa` to the ledger's pair-specific withheld evidence (R5); leave the existing programme policy acceptance/waiting values and activation state intact.

### Assumptions

The provided captured HTML is the pinned historical authority for this encode, rather than a fresh admissions-cycle scrape.
The current catalogue serialization boundary is the smallest shared point that can fix both the page and tiles in DB mode without SQL.
Browser verification may use explicit local static mode; deployed DB verification is read-only and must be reported separately.

### Sources and Research

The supplied product brief, packet, standing MyWay rules, and admissions accuracy workflow define the contract.
The captured official HTML hash was checked against the supplied SHA256.
Official URL: https://admissions.haifa.ac.il/social-sciences/program/3268/.
Peer rows are `haifa_communication` and `haifa_sociology` in the repair JSON.
`src/lib/requirementsChecked.ts` requires byte-identical notes; `src/lib/requirementTiles.ts` declines to summarize unsupported semantics.
`src/server/catalogue/serializers.ts` currently reads persisted notes unchanged; `src/data/degrees/index.ts` infers an interview from any matching text.
No extra external implementation research is needed for these existing patterns.

## Implementation Units

### U1. Re-encode catalogue conditions and stamp

**Goal:** Correct requirements in both catalogue modes.
**Requirements:** R1–R4, R6; KTD1, KTD2.
**Dependencies:** None.
**Files:** `src/data/degrees/academicPrograms.ts`, `src/data/degrees/index.ts`, `src/data/admissions/catalogueContentRepair.json`, `src/data/admissions/catalogueContentRepair.ts`, `src/data/admissions/catalogueContentRepair.test.ts`, `src/server/catalogue/serializers.ts`, `src/server/catalogue/serializers.test.ts`.
**Approach:** Apply the existing repair pattern to the source notes and the specific serialized pair; suppress obsolete regular-floor facts without changing other programmes.
**Test scenarios:**

- Correct notes yield the exact date and official referral URL; a changed note suppresses the stamp.
- A stale database row with psychometric 680 and Bagrut 85 serializes to the corrected content without those gates.
- The secondary interview is not inferred as a regular-programme gate.
- Other programme data remains unchanged by the new targeted read repair.

**Verification:** Catalogue repair, seed, and serializer regressions pass.

### U2. Preserve calculator uncertainty and tile honesty

**Goal:** Prevent unsupported admission claims for the regular programme.
**Requirements:** R5; KTD3.
**Dependencies:** U1.
**Files:** `src/data/admissions/formulaBackedVerificationLedger.ts`, `src/server/admissions/evaluator.test.ts`, `src/lib/requirementTiles.test.ts`.
**Approach:** Use the pair-specific withheld evidence mechanism; keep requirements as text when tile semantics cannot be represented safely.
**Test scenarios:**

- Weak, strong, missing-input, and psychometric 679/680/681 profiles yield unknown without a fake floor or composite-score request.
- Policy acceptance remains 650, waiting minimum 630, and activation remains withheld.
- Tile selection cannot turn the secondary 680 or interview into ordinary cumulative gates.

**Verification:** Focused evaluator and tile regressions pass without calling the official calculator for this pair.

### U3. Verify public rendering and document limits

**Goal:** Supply reviewable evidence for Jorje.
**Requirements:** R7.
**Dependencies:** U1, U2.
**Files:** `src/app/programs/[programId]/page.test.tsx`, `docs/admissions-verification/2026-10-24-haifa-psychology-reencode.md`.
**Approach:** Exercise the existing page and AdmissionRequirements presentation, then record source, before/after floors, separate-track treatment, stamp, and calculator limits.
**Test scenarios:**

- The rendered page contains the main waiting band, separate פסיפס line, date, and official source link.
- Desktop and mobile keep the existing right-aligned compact requirement list.
- Existing non-allowlisted FAQ behavior remains unchanged; inspect rendered JSON-LD without editing FAQ tests.

**Verification:** Focused rendering tests and browser checks pass; the pre-PR guard completes before push.

## Verification Contract

Use focused Vitest coverage for repair, serializers, evaluator, tiles, seed, and programme-page rendering.
Run `npm run typecheck` and `npm run guard:pre-pr` before delivery.
Use Playwright for desktop/mobile programme rendering and ordinary calculator inputs when available; distinguish local static results from deployed preview results.
Record impossible checks and their reason in the verification document and PR.
No DB writes, migrations, seed execution, freshness workflows, or production SQL are allowed.

## Definition of Done

U1–U3 meet their verification outcomes, notes match the stamp exactly, and abandoned implementation attempts are removed.
The branch is committed and pushed with a single PR against main; Jorje's independent verification remains required before readiness or merge.
