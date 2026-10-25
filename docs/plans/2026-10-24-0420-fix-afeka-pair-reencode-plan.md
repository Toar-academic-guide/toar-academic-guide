---
title: Afeka pair admission floors and stamps - Plan
type: fix
date: 2026-10-24
artifact_contract: ce-unified-plan/v1
product_contract_source: approved-encoded-brief
execution: code
---

# Afeka pair admission floors and stamps - Plan

## Goal Capsule

Students see Afeka's official EE and software engineering admission routes and source dates, with no false calculator match from the old 80/550 shell.
Use the existing college catalogue repair and unsupported evaluator mechanisms.
Deliver one PR on `codex/afeka-pair-reencode`; Jorje independently verifies readiness.

## Product Contract

### Summary

Replace both shells with gate A's Bagrut and psychometric routes and stamp the byte-identical notes against the supplied official captures.

### Problem Frame

The old Bagrut average 80 is a prior-degree average misrepresented as a school-certificate floor; psychometric 550 is unsupported.

### Requirements

- R1. Encode EE Bagrut math 4×85/5×75, English 4×70/5×60, physics 5×60 or prep 70; psychometric 600 and quantitative 115, math 4×80/5×70 or prep 70, same physics gate.
- R2. Encode software Bagrut routes with science (math 4×85/5×75, English 4×70/5×60, physics/CS 5×60 or named sciences 5×70 or specified prep 70) and without science (math 4×90/5×80, same English); psychometric 620 and quantitative 115 or 600 and quantitative 115 with the official science gates, both with math 4×80/5×70 or prep 70.
- R3. Both programs require full Bagrut entitlement and English beginners/basic classification before studies; remove 80/550 average/psychometric shells from static and serialized database reads.
- R4. Stamp 2026-10-24 with each supplied official URL and SHA256, using byte-identical displayed notes; note drift suppresses the stamp.
- R5. Return unsupported/unknown instead of inferred admission from averages, including weak, strong, missing-subject and boundary profiles; retain full conditions rather than misleading number tiles.
- R6. No FAQ changes, excluded sibling changes, prior-degree/diploma/prep multi-path expansion, production writes, deployment, merge, or code-review pipeline.

## Planning Contract

- KTD1. Follow `catalogueContentRepair.json` and `applyCatalogueContentRepair` to attach college details; skip legacy inference for these IDs so alternative paths never become cumulative gates. Follow Haifa's targeted serializer overlay after a successful database read.
- KTD2. Add only these pairs to the existing Batch C unsupported server/client maps. No reverse-engineered formula or single psychometric minimum can represent R1–R2 honestly.
- KTD3. Leave optional composite-score admission out: the approved main routes suffice and the formula is not established.

The official captures supplied with the approved brief establish the source contract. Peer college stamps and Haifa's serializer repair supply local implementation patterns. No relevant matching entry exists in `docs/solutions/`; no configured packs were found.

## Implementation Units

### U1. Re-encode and stamp both catalogue pairs

**Requirements:** R1–R4, R6. **Dependencies:** none.
**Files:** `src/data/degrees/academicPrograms.ts`, `src/data/degrees/index.ts`, `src/data/admissions/catalogueContentRepair.json`, `src/data/admissions/catalogueContentRepair.ts`, `src/server/catalogue/serializers.ts`; tests in the corresponding repair, degrees index, and serializers test files.
**Approach:** Replace source requirements, attach notes through repair, clear obsolete pair facts and floor maps on persisted reads, retain institution links and metadata.
**Test scenarios:**

- Both source arrays equal repair notes and produce the correct date/referral URL; whitespace drift suppresses the stamp.
- Persisted 80/550 requirements, facts and thresholds serialize without the shell.
- Unrelated program pairs retain their existing content and numeric fields.

**Verification:** Focused catalogue and serializer tests pass.

### U2. Keep evaluation and tiles honest

**Requirements:** R5–R6. **Dependencies:** U1.
**Files:** `src/data/admissions/batchCUnsupportedProgramIds.ts`, `src/server/admissions/batchCUnsupportedPathEvaluation.ts`, `src/server/admissions/evaluator.test.ts`, `src/lib/requirementTiles.test.ts`.
**Approach:** KTD2; reuse full-text tile fallback.
**Test scenarios:**

- Empty, 80/550, weak, strong, 599/600/601 and 619/620/621 profiles stay unknown without an inferred score or threshold.
- Missing or boundary math, physics, English and quantitative scores cannot activate acceptance.
- Both complete route lists remain available without reducing them to cumulative number tiles.

**Verification:** Evaluator, Batch C and requirement tile regressions pass.

### U3. Verify rendering and record source limits

**Requirements:** R1–R6. **Dependencies:** U1, U2.
**Files:** `src/app/programs/[programId]/page.test.tsx`, `docs/admissions-verification/2026-10-24-afeka-pair-reencode.md`.
**Approach:** Exercise existing page rendering and stamp drift behavior; run existing FAQ omission tests unchanged.
**Test scenarios:**

- Both rendered pages contain the complete route conditions and correct source/date, with neither obsolete shell.
- Existing non-allowlisted SEO tests continue to omit FAQPage.

**Verification:** Targeted unit/static checks, typecheck, lint, and pre-PR guard including admissions evidence pass. No Next.js server is started; browser/preview and deployed-state verification remain explicitly outstanding for Jorje.

## Verification Contract

Run focused Vitest coverage for repair, serializer, evaluator, Batch C, tiles, degrees index, requirements checked and program page tests. Run `npm run typecheck`, `npm run lint`, and `npm run guard:pre-pr` before push. Verify supplied capture hashes. The guard's seed operation is a local dry-run only.

## Definition of Done

U1–U3 pass their local verification, the simplification pass preserves proof tests, abandoned code is removed, and one committed/pushed PR targets main. Report PR URL, head SHA, skipped review wording, and the required independent preview/source verification; do not declare merge readiness.
