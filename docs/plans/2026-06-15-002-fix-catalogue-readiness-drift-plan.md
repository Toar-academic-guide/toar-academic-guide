---
title: "fix: catalogue readiness drift for DB cutover"
type: fix
date: 2026-06-15
---

# Catalogue Readiness Drift Fix Plan

## Summary

Fix the DB-backed catalogue readiness failure behind PR 14 by proving and repairing drift between the git-tracked seed payload and the target database snapshot. Keep `CATALOGUE_SOURCE_MODE=database` as the verification target and make the repair path reproducible from repo code rather than static fallback or dashboard edits.

---

## Problem Frame

PR 14 is correctly failing closed when the database-backed catalogue is unhealthy. The current outage names `haifa_cs`, `haifa_psychology`, `haifa_law`, `haifa_economics`, and `haifa_biology` as sekhem programmes missing thresholds, but the git-tracked catalogue source marks those programmes as `admissionType: 'requirements'`.

That mismatch means the immediate problem is not the homepage or catalogue client path. It is stale or inconsistent catalogue state in the target database, incomplete reseeding, or both. The fix needs to prove which side is wrong, repair the target DB so it matches the current seed payload, and leave behind a verification path that keeps future cutover checks actionable.

---

## Requirements

- R1. PR 14 must be verifiable in `CATALOGUE_SOURCE_MODE=database` against a healthy DB-backed catalogue, without relying on static fallback.
- R2. The fix path must identify concrete drift between the current seed payload and the target DB snapshot, including programme `admissionType`, linked institutions, threshold coverage, and calculator-config coverage.
- R3. Running the repo’s catalogue seed workflow against the target DB must either converge the DB to the current payload or surface explicit mismatches that still block readiness.
- R4. The readiness gate must stay strict. The fix must repair the data path, not loosen the readiness rules to accept stale DB state.
- R5. The verification and repair workflow must be reproducible from git-tracked code and documented steps, not ad hoc remote dashboard edits.
- R6. Focused coverage must lock the Haifa `requirements` case and future seed-to-DB drift checks so failures point to the actual mismatch.

---

## Key Technical Decisions

- KTD1. Treat this as a seed-to-database drift bug first. The plan starts from `buildCatalogueSeed()` and the live DB snapshot because the current UI/API symptom is already a downstream effect.
- KTD2. Add an explicit catalogue-verification path alongside readiness. `evaluateCatalogueReadiness()` tells us the DB is unhealthy, but the fix needs a second view that says exactly which programmes or dependent records differ from the current seed payload.
- KTD3. Keep readiness fail-closed in database mode. A stale DB should remain a blocked cutover signal until the DB is repaired.
- KTD4. Treat remote reseed and post-seed verification as part of the product fix, not as separate ops cleanup. PR 14 is not truly fixed until the real target DB can serve `catalogueSource = database`.

---

## Implementation Units

### U1. Encode the Haifa Drift as Characterization Coverage

- **Goal:** Lock the expected seed/readiness shape for the Haifa programmes so future failures clearly distinguish stale DB state from a bad seed payload.
- **Requirements:** R2, R4, R6
- **Dependencies:** None
- **Files:** `src/db/seeds/catalogueSeed.ts`, `src/db/seeds/catalogueSeed.test.ts`, `src/server/catalogue/queries.test.ts`
- **Approach:** Add targeted characterization coverage around the current mismatch. The seed tests should prove that the Haifa programmes are emitted as `requirements` programmes and do not generate sekhem threshold expectations. The readiness tests should preserve the current fail-closed behavior for snapshots that still mark those same IDs as `sekhem` without threshold rows.
- **Patterns to follow:** Extend the existing deterministic coverage in `src/db/seeds/catalogueSeed.test.ts` and `src/server/catalogue/queries.test.ts` rather than introducing a second test harness.
- **Test scenarios:**
  - Happy path: the current seed payload emits `haifa_cs`, `haifa_psychology`, `haifa_law`, `haifa_economics`, and `haifa_biology` as `requirements` programmes.
  - Happy path: those Haifa programmes produce no sekhem-threshold seed rows.
  - Error path: a readiness snapshot that still marks one of those Haifa IDs as `sekhem` and has no threshold rows fails with an explicit mismatch signal.
  - Edge case: a `requirements` programme with no threshold rows does not fail readiness just because threshold records are absent.
- **Verification:** The test suite makes it obvious whether a future failure is caused by git-tracked source data or stale remote DB contents.

### U2. Add a Deterministic Seed-to-DB Verification Path

- **Goal:** Make target DB drift measurable before and after reseeding.
- **Requirements:** R1, R2, R3, R5, R6
- **Dependencies:** U1
- **Files:** `scripts/seed-catalogue.mjs`, `src/db/seeds/catalogueSeed.ts`, `src/server/catalogue/queries.ts`, `src/server/catalogue/queries.test.ts`
- **Approach:** Extend the seed workflow with a verification mode or equivalent helper that compares the target DB snapshot to `buildCatalogueSeed()` output and reports mismatches by programme ID and record class. At minimum, it should compare programme `admissionType`, programme-to-institution links, threshold presence for sekhem programmes, and calculator-config coverage. If verification shows that rerunning the current seed does not fully converge dependent rows, adjust the seed transaction so reruns reconcile changed catalogue state rather than only updating rows whose IDs still line up.
- **Patterns to follow:** Keep the structured JSON output style already used by `scripts/seed-catalogue.mjs`, and reuse the catalogue snapshot/readiness logic already centralized in `src/server/catalogue/queries.ts`.
- **Test scenarios:**
  - Happy path: verification against a current, fully seeded DB reports no mismatches and the same snapshot passes readiness.
  - Error path: verification against a snapshot where `haifa_*` programmes still carry `admissionType = 'sekhem'` reports those IDs explicitly.
  - Error path: verification reports missing calculator configs or missing programme links distinctly instead of collapsing them into a generic outage.
  - Integration: after reseeding a stale snapshot, verification becomes clean without duplicating or orphaning catalogue rows.
- **Verification:** An implementer can answer “is the DB stale or is the source payload wrong?” from the verification output alone.

### U3. Repair the Target DB and Prove Database-Mode Preview Behavior

- **Goal:** Bring the actual PR 14 target DB into alignment and verify the preview/API path on real database mode.
- **Requirements:** R1, R3, R4, R5
- **Dependencies:** U1, U2
- **Files:** `README.md`
- **Approach:** Use the verification path to inspect the actual target DB, reseed or reconcile it from the current repo payload, rerun verification, and then confirm the catalogue API serves healthy DB-backed responses with `meta.catalogueSource = database`. Capture the minimum operator sequence in the README so future previews are not “healthy by memory” and so the branch can be validated without loosening source-mode behavior.
- **Patterns to follow:** Extend the existing DB workflow and cutover checklist in `README.md` rather than creating a second operational document.
- **Test expectation:** none -- this unit is operational verification and documentation around the repaired DB path rather than new runtime behavior.
- **Verification:** The target DB snapshot matches the current seed payload, readiness passes, and PR 14 can be checked in `database` mode without static fallback.

---

## Open Questions

- Which concrete database instance is PR 14 preview using today: a shared long-lived catalogue DB or a branch-specific DB? This changes the repair target but not the planned code direction.
- If a full reseed still leaves drift behind, which dependent catalogue tables are not reconciling cleanly on rerun? This is an implementation-time diagnostic question to answer through the verification mode.

---

## Scope Boundaries

**Included in this fix**

- Haifa `requirements` vs `sekhem` drift characterization
- Seed-to-DB verification for catalogue completeness mismatches
- Reseed/reconciliation work needed to make the real target DB healthy
- Minimal documentation needed to repeat that repair and verification flow

**Deferred to Follow-Up Work**

- Broader catalogue rollout automation for every preview environment
- New admin tooling for catalogue inspection or review workflows
- Any fallback-policy changes outside strict database-mode verification

**Outside this plan**

- Recommendation-engine redesign
- Calculator-formula changes
- Auth, profile, or uploaded-document work

---

## Risks & Dependencies

| Risk | Impact | Mitigation |
| --- | --- | --- |
| PR 14 preview points at a different DB than assumed | Repair happens in the wrong environment and the outage persists | Verify the target DB binding first and keep the verification output tied to the inspected database |
| Rerunning the current seed does not reconcile all stale dependent rows | The DB remains unhealthy even after a nominal reseed | Build verification before repair, then harden the seed transaction only where drift survives |
| Readiness is weakened to make the outage disappear | The cutover looks healthy while serving stale catalogue data | Keep fail-closed readiness intact and require the DB to converge to the current payload |
| Verification lives only in manual notes | The next drift bug becomes another one-off investigation | Put the comparison logic in the tracked seed/query toolchain and document the repair path in-repo |

---

## Sources & Research

- Existing cutover plan: `docs/plans/2026-06-15-001-feat-production-catalogue-cutover-plan.md`
- Current readiness gate: `src/server/catalogue/queries.ts`
- Current seed builder and upsert flow: `src/db/seeds/catalogueSeed.ts`
- Current seed script entrypoint: `scripts/seed-catalogue.mjs`
- Current source-of-truth Haifa programme definitions: `src/data/degrees/academicPrograms.ts`
- Current DB workflow and cutover checklist: `README.md`
- Local research was sufficient for this plan; no external research was needed because the failure is rooted in repo-owned seed and readiness behavior.
