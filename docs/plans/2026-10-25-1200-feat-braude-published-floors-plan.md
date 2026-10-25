---
title: 'feat: Reconcile Braude ids and encode published floors'
date: 2026-10-25
type: feat
product_contract_source: ce-plan-bootstrap
---

## Goal Capsule

Give Braude applicants source-backed floor checks while retaining legacy programme and institution references. Phase 1 delivers a directly tested evaluator; dispatcher wiring belongs to Oded.

## Product Contract

### Problem Frame

Braude has three institution identities and no department-aware published-floor evaluator. A generic engineering or mechina record cannot safely stand in for a department.

### Requirements

- R1. Canonical public identity is `braude`; resolve `ort_braude` and `mon_12220708942` in the data layer without deleting stored ids or saved programmes.
- R2. Encode only department numbers shared by the supplied research section and the live official source. Record disagreements and omitted conditions as gaps.
- R3. A checkable miss decides its route below before missing inputs; a complete passing route gives a green score result. OR routes combine as pass / all below / otherwise needs_input.
- R4. Never infer a quantitative composite. Ambiguous averages and uncaptured bonus-route subject floors remain unresolved. Full bagrut is assumed.
- R5. Produce an unapplied, guarded SQL review packet and verification note. Leave dispatcher and Batch C behavior unchanged.

## Planning Contract

### Key Technical Decisions

- KTD1. Use an explicit alias map in `src/data`, consumed by catalogue data adapters and tested with retained ids. Preserve all stored rows.
- KTD2. Import numeric gates from `publishedNumericRoutes.ts`; keep Braude-specific evidence, precedence and result assembly local. Shared helpers and types are fenced.
- KTD3. Compute a no-bonus unit-weighted average only from an explicitly complete ordinary-exam subject record. A generic average is ambiguous. Do not guess bonus-inclusive optimal averages or the omitted subject floors.
- KTD4. Explicit department identifiers are supported locally, including the existing `mon_12220708942_cs`. Generic engineering and mechina receive no department rules. No new programme rows or cutoff changes are needed in this phase.
- KTD5. Research/live discrepancies prevent green where they leave a required condition unchecked. Record exact additional evidence and why it is not encoded.

### Scope Boundaries

No evaluator dispatcher, shared gate/result/type, UI, route/SEO, DB schema, migrations, seeds, workflows, deployment or external settings edits. No DB execution. No review pipeline, per brief. No new input fields. No formula estimation or institutional composite request.

## Implementation Units

### U1. Preserve and reconcile identities

**Requirements:** R1. **Files:** `src/data/institutionAliases.ts`, its test, `src/data/institutions.ts`, catalogue data adapters and their tests as needed.

**Approach:** Canonicalize at read/lookup boundaries while keeping raw records and programme ids intact. Resolve legacy names to the canonical identity. Avoid route changes.

**Test scenarios:** Both aliases resolve to braude; unknown ids stay unchanged; legacy rows remain; all three programme ids survive; static/database linked identities agree.

### U2. Published department routes

**Requirements:** R2–R4. **Files:** `src/server/admissions/braudePublishedRoutesEvaluation.ts` and `.test.ts`, `src/server/admissions/batchCUnsupportedPathEvaluation.test.ts`.

**Dependencies:** U1. **Execution note:** Write and run failing rule tests before implementation.

**Approach:** Named local floor gates with provenance; route-local miss precedence and programme OR aggregation; show unchecked composites and average/subject gaps as additional conditions. Preserve current Batch C lists because wiring is fenced.

**Test scenarios:** Every encoded floor exactly at/one below; 4u/5u alternatives; CS 600/580 math switch; missing section versus failed known floor; complete CS profile green; composite programmes never green; each bonus department and gap; incomplete records; advanced subject pass/miss/unknown; generic engineering/mechina excluded; live evaluator remains unsupported.

### U3. SQL packet and evidence

**Requirements:** R5. **Files:** `docs/admissions-verification/2026-10-25-braude-batch-a.sql` and `.md`.

**Approach:** Mirror the existing dated packets, use schema-backed names, private backup and drift guards, one APPLY transaction, separate ROLLBACK/VERIFY. No cutoff SQL; no new rows required except the canonical institution if absent. Explain source discrepancies, averages, route precedence and exact future dispatcher hook.

**Test expectation:** SQL is inspected only; never executed. Source values cross-checked against read-only official HTML.

## Verification Contract

Run lint, typecheck, focused tests, full unit suite and pre-PR guard. Reproduce unrelated failures against origin/main without weakening expectations. Simplify using ce-simplify-code while preserving proof tests. Do not run ce-code-review or other review pipelines. Commit and push only the named feature branch; create one PR against main with full evidence and the required review-skip line.

## Definition of Done

The PR contains tested aliases, independently callable routes, unchanged unsupported live behavior, documented gaps and an unapplied SQL packet. No visual change is intended; any observed catalogue identity/display difference is explicitly reported. Jorje owns source/product verification and any eventual SQL/publication.

## Sources

Supplied Braude section of the Batch A research brief; official https://w3.braude.ac.il/intrested/ and https://info.braude.ac.il/yedion/fireflyweb.aspx?prgname=Reg_Calc_1. Existing Afeka/Tel-Hai rules and catalogue serialization are the implementation patterns.
