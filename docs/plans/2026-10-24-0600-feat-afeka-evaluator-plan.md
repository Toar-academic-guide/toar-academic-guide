---
title: Evaluate Afeka EE, software engineering and CS published routes
type: feat
date: 2026-10-24
---

## Goal capsule
Evaluate ordinary Bagrut/psychometric routes for `afeka_ee`, `afeka_softwareeng`, and `afeka_cs` using existing endpoint inputs. Re-encode and stamp CS with the six byte-identical software-engineering notes from main. Preserve EE/software notes and stamps, and avoid UI, FAQ, indexing, database, environment and deployment changes.

## Evidence and decisions
The #266 notes, repair rows and `docs/admissions-verification/2026-10-24-afeka-pair-reencode.md` agree with the supplied dated official captures. All thresholds are inclusive. The later CS brief explicitly excludes CS from the 600 psychometric science gate; this resolves the earlier brief's physics/CS shorthand in favour of the official physics gate for both software and CS. CS is an alternative for Bagrut with science only. The 620 route has no science gate. Other named sciences and subject-prep alternatives cannot be evaluated with existing inputs and belong in the existing result footnote, together with full Bagrut entitlement and English classification.

## Implementation units

### U1 — Route evaluator and integration
Reuse `publishedNumericRoutes.ts` gate composition and authoritative subject-record precedence; extend subject access only as needed for CS. Add a focused Afeka evaluator and dispatch before generic fallback. Remove EE/software from both Batch C maps. Any satisfied route returns accepted; a known failing conjunct rules out a route despite unrelated missing inputs; any remaining possible route yields unknown with specific missing fields; all ruled out yields below. Do not invent a composite or overall Bagrut floor. Keep tiles on the existing full-text route fallback.

### U2 — CS catalogue repair
Mirror the software six strings into CS source requirements and repair notes with the existing capture hash and checked date. Extend existing enrichment/serializer repair lists and tests. Leave source code and tests for FAQ unchanged. Preserve stale database-read repair behavior without any database writes.

### U3 — Verification and delivery
Replace obsolete unsupported assertions for the explicitly unlocked IDs with stronger route behavior checks. Cover strong Bagrut, psych-only, weak, mixed missing input, every inclusive numeric boundary, science alternatives, both math unit levels, missing units versus grade, record precedence, and API JSON serialization for all three IDs. Extend existing catalogue, stamp, tile and rendered-page tests for CS. Record routes with official capture line references and limitations in admissions verification docs.

## Verification contract
Install locked dependencies if absent; read installed Next docs before code changes. Run focused Vitest, lint, typecheck and `npm run guard:pre-pr`. No Next dev/start server. Compare unchanged EE/software source and repair notes to main byte-for-byte. Validate CS stamp/source links with existing render and resolver tests. Check final scope for prohibited paths. CE simplification precedes commit/push/PR creation; no code review pipeline per Encoded restriction.

## Definition of done
One PR against main with the requested title, source-line route table, behavior matrix and exact code-review skip line. Print URL and head SHA. No merge or production operations. Jorje retains the independent source/preview verification gate; local endpoint and render tests do not establish deployed browser behavior.

## Planning assessment
Scope and implementation patterns are established by peer evaluators and #266. No architecture or product decision remains after applying the later source-specific brief. Plan/document review pipelines are skipped under the supplied Encoded restriction against other review pipelines. Execution is already authorized and proceeds with ce-work.
