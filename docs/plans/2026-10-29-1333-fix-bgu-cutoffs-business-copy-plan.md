---
title: BGU Cutoffs and Business Copy - Plan
type: fix
date: 2026-10-29
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---
# BGU Cutoffs and Business Copy - Plan

## Goal Capsule

Students should receive BGU business administration conditions consistent with the official 2027 source, and operators should have seven reviewed cutoff corrections ready for publication.
The task brief governs scope and delivery; official captured BGU JSON governs facts.
Stop if an existing assertion must change, a manifest run key is required, or the lane fence prevents a necessary fix.
Implementation is test first. Delivery is a branch PR; Jorje owns deployment verification and the later SQL execution.

## Product Contract

### Summary

Replace the reviewed release with seven approved BGU changes and correct the business administration notes.
Provide reproducible official evidence and a guarded SQL packet for the later copy repair.

### Problem Frame

Seven production threshold rows differ from the official 2027 cutoffs.
Business pages describe Management at 580/600 while the evaluator already uses business administration at 620/600.

### Requirements

- R1. The canonical_change release contains only bgu_accounting 610→620, bgu_biology 610→585, business and bgu_business 590→620, economics and bgu_economics 615→620, and communication 590→520, all for bgu/2027 effective 2026-10-29.
- R2. Every change has exact_official proof with its registry ID, full GetRdpData URL and reproducible digest; accounting and biology remain excluded because production already matches.
- R3. Business notes use only the captured official business facts and agree with BGU_QUANTITATIVE_PROGRAMMES.business; stamp only existing BGU family rows and preserve unrelated entries verbatim.
- R4. Move the original manifest verbatim to a fixture and change only the approved historical test reads; every existing assertion stays unchanged.
- R5. Commit five official responses, sanitized headers, provenance, publication and W45 notes, and four SQL files strictly targeting the two BGU business requirement-note rows.
- R6. Never execute SQL, database writes, publication/freshness workflows, deploy, merge, alter settings, or edit fenced paths.

## Planning Contract

- KTD1. Use raw response-byte SHA-256 for hand-authored proofs. The generated digest hashes a normalized live proof payload that is absent from the saved GetRdpData-only packet; raw-byte hashing is explicitly approved by the brief (R2).
- KTD2. Keep historical publisher, sweep38 and catalogue tests attached to one exact copy of the 084fd7f manifest (R4).
- KTD3. The strict manifest schema has no run key. Publication does not write the weekly run ledger, so W45 remains available to the November 8 scheduled run (R2, R6).
- KTD4. The generic business page can resolve the institution-specific programme through getPublicProgramRequirementSources when its own notes are generic. Inspect this path and test the resulting source without editing src/lib (R3).
- KTD5. The repository has no supabase/migrations directory; use the actual schema in src/db/migrations/0000_warm_ogun.sql read-only. SQL changes only specific_admission_notes, compares the expected old text and checks affected rows; default transaction ending rolls back (R5, R6).

- KTD6. Leave communication checkedAt at 2026-10-21 while updating bgu_accounting and bgu_business to 2026-10-29 (R3). The orchestrator explicitly directed this deviation because src/lib/requirementTiles.test.ts pins its clock to 2026-10-23 and remains fenced; bump communication in a follow-up with lane approval.

## Implementation Units

### U1. Preserve historical tests and establish new contracts

- **Goal / requirements:** R1–R4, test first.
- **Dependencies:** None.
- **Files:** src/server/admissions/__fixtures__/reviewedManifest-2026-10-25.json, src/server/admissions/admissionsReleasePublisher.test.ts, src/server/catalogue/queries.test.ts, src/data/admissions/sweep38.test.ts, src/data/admissions/catalogueContentRepair.test.ts, src/data/admissions/bguCutoffsManifest.test.ts.
- **Approach:** Repoint historical reads per KTD2 and prove them green before changing data. Add failing contracts for the seven entries, evidence, in-memory publication and business copy.
- **Test scenarios:** Exact target/value/URL set; seven published release items; absence of unchanged aliases; both business page sources resolve corrected notes and policy values.
- **Verification:** Historical assertions remain word-for-word; new tests fail against old data for the intended reasons.

### U2. Apply verified data and save evidence

- **Goal / requirements:** R1–R3, R5–R6.
- **Dependencies:** U1.
- **Files:** src/data/admissions/reviewedManifest.json, src/data/admissions/catalogueContentRepair.json, docs/admissions-verification/evidence/2026-10-29-bgu-cutoffs-business/.
- **Approach:** Use KTD1 and KTD3 for proofs and publication notes. Rewrite only business copy and the two approved BGU checkedAt dates, leaving communication at its original date. Save source bytes and generate the file-only SQL packet per KTD5.
- **Test scenarios:** Source digests reproduce from committed files; SQL notes equal the repair JSON; unrelated repair entries retain their bytes.
- **Verification:** All U1 tests pass with seven in-memory release items and no changed historical expectations.

### U3. Verify and deliver

- **Goal / requirements:** All requirements.
- **Dependencies:** U2.
- **Files:** Evidence README and owned change set.
- **Approach:** Simplify within scope, run required checks and record outcomes, then create the authorized conventional commit and branch PR. No review pipeline is run under the explicit task instruction.
- **Test expectation:** Existing focused and guard suites supply regression coverage; no extra behavior is introduced.
- **Verification:** Required checks pass; PR documents the publication trigger, SQL handoff and guard count.

## Verification Contract

Run the historical tests before and after the data change, the new manifest/copy tests and related manifest, publisher, catalogue, policy and weekly-review tests.
Run npm run lint, npm run typecheck and env -u DATABASE_URL npm run guard:pre-pr; record the guard test count.
Verify fixture byte identity and unchanged existing assertion text independently of tests.
Database, Vercel and interactive browser verification are deferred to Jorje because the live copy changes only after his post-deploy SQL packet; do not claim they were performed.

## Definition of Done

Seven approved canonical changes parse and publish in memory, corrected notes agree with the official packet, and evidence digests reproduce.
All required local checks pass, only authorized files are committed, and no abandoned implementation remains.
The branch is pushed and a PR is opened with the exact required title, table, URLs, approved-test-update line and operational handoff.
