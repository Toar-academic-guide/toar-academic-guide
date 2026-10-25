---
title: 'feat: calculate MTA nursing and economics-management routes'
date: 2026-10-23
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

## Goal Capsule

Students choosing `tlvyaffo_nursing` or `tlvyaffo_business` receive a calculated result from ordinary grades. Weak 420/70 profiles fall below the modeled routes; score matches remain subject to institutional confirmation. Jorje owns the readiness decision.

## Product Contract

### Problem Frame

The evaluator returns unknown from stale catalogue placeholders despite published numeric routes. The business ID denotes MTA's economics and management BA; preserve its ID and saved references.

### Requirements

- R1: Nursing automatic 90/520; committee alternatives 90/500, psychometric 520 with Bagrut eligibility, or combined 515 with psychometric 430. Keep interview/committee separate and pending.
- R2: Business alternatives 94/550, psychometric 580 with eligibility, combined 580, Bagrut 96; normal math 4u/80 or 5u/55. The explicit 600/620 alternative allows 4u/65. English 85 applies to both programs under general conditions.
- R3: Ask only for missing ordinary inputs that can resolve a route; never request a precomputed institutional composite. Preserve score match independently of additional conditions.
- R4: Preserve MTA CS and other institution behavior; document estimated averages, formula limits, and gaps.
- R5: Verify boundary/unit/API behavior and desktop/mobile student copy; run the pre-push guard; open one PR against main. No DB writes, migrations, publication, settings changes, comments, merging, or manual deployments.

## Planning Contract

### Key Technical Decisions

- KTD1 (session-settled: user-directed): Extract `mtaCombinedScore` from the CS evaluator, preserving its formula, rounding, and domain rather than duplicating constants.
- KTD2: Follow the existing `withScoreAssessment` contract: numerical matches plus unresolved institution/manual confirmations yield pending, never accepted.
- KTD3: Check failed numeric alternatives before requesting subject inputs that cannot rescue them. For matched business routes, request only missing math/English fields.

### Scope Boundaries

Only the two named program IDs plus a behavior-preserving CS helper extraction. Prep-course completion, degree conversion, dual degrees, and other MTA programs are out of scope. In-repo copy can replace stale placeholders; no production catalogue changes.

## High-Level Technical Design

| Route outcome | Missing subjects | Result |
| --- | --- | --- |
| All numeric alternatives fail | Any | below |
| A viable alternative lacks scores | Any | needs_input for those scores |
| Numeric match | Required math/English missing | needs_input for missing fields |
| Numeric match, subject gate fails | None | below, preserving numeric match |
| Numeric match, gates met | None | pending institutional/manual confirmation |

## Implementation Units

### U1. Share the MTA combined calculation

**Requirements:** R4, KTD1. **Dependencies:** none.
**Files:** `src/server/admissions/mtaCombinedScore.ts`, `src/server/admissions/mtaComputerScienceEvaluation.ts`, `src/server/admissions/mtaComputerScienceEvaluation.test.ts`.
**Approach:** Move the existing arithmetic and domain unchanged. Verify rounded 630 boundaries and invalid domain behavior through existing CS tests.

### U2. Calculate the published nursing and business routes

**Requirements:** R1–R4, KTD2–KTD3. **Dependencies:** U1.
**Files:** `src/server/admissions/mtaPublishedRoutesEvaluation.ts`, its test, `src/server/admissions/evaluator.ts`, `src/lib/calculatorInputRequirements.ts`, coverage metadata/tests, and `src/app/api/admissions/evaluate/mta.test.ts`.
**Approach:** Dispatch only for MTA and the named IDs. Prefer subject-record math to legacy fields. Keep general eligibility, English, and committee/interview confirmations separate. Permit Bagrut-only business and psychometric-only alternatives through API validation.
**Test scenarios:** weak 420/70; every inclusive route boundary; just-below cases isolated from competing routes; 430 psychometric floor; 4u/65 exception; normal math boundaries; English 84/85; missing math/English; missing optional base scores; subject-record precedence; dispatch isolation; unchanged CS/Reichman/Colman/Ono regressions.
**Verification:** Focused tests and full required checks pass without DB writes.

### U3. Verify student output and record uncertainty

**Requirements:** R3–R5. **Dependencies:** U2.
**Files:** `e2e/mta-admissions.spec.ts`, `docs/admissions-verification/2026-10-23-mta-nursing-economics-management.md`, affected in-repo catalogue/requirement copy if needed.
**Approach:** Exercise the real API and calculator at desktop/mobile widths. Compare representative combined scores with the official calculator when accessible. Record source packet sections, formula confidence, scope exclusions and screenshots. Apply ce-simplify-code before delivery; no review pipeline per the user's instruction.
**Verification:** Weak below, strong pending with numeric match, missing math prompts in Hebrew, Contact/Save visible, no composite input or overflow.

## Verification Contract

Use the supplied official conditions text/HTML and the official MTA calculator. Boundary tests must isolate each alternative so a competing route cannot mask a failure. Run focused tests, typecheck, lint, formatting and `npm run guard:pre-pr`; use local static mode only for explicit browser verification. Document any unavailable deployed check honestly.

## Definition of Done

Named routes are dispatched, regression checks pass, student copy is checked on desktop/mobile, uncertainty and evidence are documented, and one PR is open against main. Jorje verification and Amit's merge/publication decision remain outstanding. Plan confidence: grounded in existing CS/Colman/Reichman patterns; no deepening needed. Document/code review pipelines intentionally omitted per the task instruction.
