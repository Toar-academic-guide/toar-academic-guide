# Data Health Official Source Evidence

## Summary

Expose a pair-level admissions evidence view inside `/internal/data-health` so operators can see, for every linked `Academic Program` and `Institution`, what the current evidence mode is and which official calculation target or fallback source backs it.

The dashboard should not only surface coarse readiness counts. It should show the operator whether a pair is backed by:

- an exact official calculation target
- an official target that still needs required applicant inputs
- a partial or blocked official source
- a formula-backed estimate
- a missing or unsupported source

For exact and official-backed pairs such as TAU and Haifa, the dashboard must also expose the exact source reference the runtime uses, including the external program identifier and adapter target.

## Problem

The current `/internal/data-health` dashboard shows aggregate `decisionReadiness` counts and weak-source warnings, but it does not let an operator answer a more specific question:

> For this linked program/institution pair, what evidence does the public admissions runtime actually use right now?

That leaves a gap between:

- the public admissions engine in `src/server/admissions/capabilityMatrix.ts`
- the operator dashboard in `src/app/internal/data-health/DataHealthDashboard.tsx`

Today, the exact-runtime slice already contains official target metadata for specific pairs such as:

- `haifa_cs__haifa`
- `tau_datascience__tau`

But `/internal/data-health` does not render that pair-level evidence, so operators cannot verify from the dashboard whether a visible public result is coming from an exact official target, a score-only fallback, or a formula estimate.

## Existing Grounding

- `src/server/admissions/capabilityMatrix.ts` already defines pair-level capability classification and exact official targets.
- `src/server/data-health/queries.ts` already summarizes aggregate `decisionReadiness`, but not per-pair runtime evidence.
- `src/app/internal/data-health/DataHealthDashboard.tsx` already has an admissions-focused section and is the right operator surface for this information.
- `docs/hybrid-admissions-decision-slice.md` already frames `/internal/data-health` as the operator check for whether a program is decision-ready.

## User

Primary user: allowlisted internal operator using `/internal/data-health` to confirm what the admissions runtime is actually doing for linked program/institution pairs.

## Desired Outcome

An operator opening `/internal/data-health` can answer all of these without leaving the dashboard:

1. Which linked pairs currently have exact official calculation coverage?
2. Which exact official targets still require more applicant inputs?
3. Which pairs are currently formula-estimated versus official-source-backed?
4. For exact official pairs, which adapter target and external program identifier are being used?
5. Which pairs are missing official targets entirely, without that being misreported as a production failure?

## Product Decisions

### Pair Scope

Show every linked program/institution pair, not only exact official-calculation pairs.

### Row Detail Level

Each row should expose:

- institution
- program
- evidence mode
- official source reference URL when one exists
- source target identifier
- freshness state when one exists
- blocked reason when relevant
- required inputs when relevant
- exact external program identifier or adapter target when relevant

### Treatment of Missing Official Targets

If a linked pair has no official-calculation target yet, it is informational only.

It should be visible in the dashboard, but it should not by itself count as:

- an operational risk
- a readiness blocker
- a red dashboard alert

This is important because the public product intentionally supports mixed evidence modes, not only exact official calculation coverage.

## Approaches Considered

### Approach A: Exact-only add-on

Add a small exact-target section that lists only TAU, Haifa, and future official-calculation pairs.

Why it is attractive:

- smallest UI change
- low operator noise

Why it falls short:

- hides formula-estimated and unsupported pairs
- does not explain the full public-runtime coverage model
- does not answer the user’s request to understand every institution’s current evidence source

### Approach B: Pair-level admissions evidence matrix

Add a new dashboard section that lists every linked program/institution pair and its current evidence mode, with richer detail for official-source-backed rows.

Why it is attractive:

- matches the public admissions runtime model
- makes exact, needs-input, estimated, blocked, score-only, and missing states visible in one place
- scales cleanly as more exact official targets are added
- lets operators inspect TAU and Haifa while still understanding the rest of the catalogue

Tradeoff:

- denser than the current summary-only dashboard

### Approach C: Full provenance inspector

Expose every source candidate, admissions fact, alternative path, and runtime mapping inline for each pair.

Why it is attractive:

- maximum transparency

Why it is not the right first move:

- too noisy for the dashboard’s read-only operating role
- duplicates deeper review and diagnostics surfaces
- makes scanning harder instead of easier

## Recommended Direction

Choose **Approach B: pair-level admissions evidence matrix**.

That is the smallest change that still makes `/internal/data-health` useful as the operator truth surface for public admissions runtime coverage.

## Required Behavior

### New Dashboard Section

Add an admissions evidence section to `/internal/data-health` that renders one row per linked `Academic Program` and `Institution`.

### Row Fields

Each row should show:

- program name
- institution name
- evidence mode
- official source URL or source reference label, when present
- source target id, when present
- external program id or equivalent exact-target identifier, when present
- freshness state, when present
- blocked reason, when present
- required applicant inputs, when present

### Evidence Modes

The dashboard should distinguish at least these modes:

- exact official
- official but needs input
- blocked official source
- stale official source
- score-only source
- estimated from local formula
- unsupported
- missing

The display language can be operator-facing English as long as it is consistent with the rest of the dashboard.

### Visual Priority

The section should be scan-friendly first:

- exact official and official-needs-input rows should be easy to identify
- blocked and stale rows should still surface as attention-worthy
- missing official target rows should stay visible but low-severity

### Relationship to Existing Readiness

This new pair-level section should complement current `decisionReadiness`, not replace it.

Aggregate counts remain useful for top-level scanning. The new section gives operators the concrete per-pair explanation behind those counts.

## Scope Boundaries

### In Scope

- surface pair-level runtime evidence for all linked pairs in `/internal/data-health`
- expose exact official source references for TAU, Haifa, and future exact targets
- show required-input state for official targets that are not yet directly runnable
- show non-exact evidence modes for the rest of the linked pairs

### Out of Scope

- changing the public admissions calculation behavior itself
- creating new official targets for institutions that do not yet have them
- inline editing or approval actions in the dashboard
- exposing raw ingestion payloads or deep provenance dumps
- changing readiness policy so that every linked pair must have exact official coverage

## Success Criteria

1. An operator can open `/internal/data-health` and see, for each linked pair, what runtime evidence mode currently backs it.
2. TAU and Haifa exact-target rows visibly show the official source reference and external target metadata used by runtime.
3. Pairs without official targets are visible but do not inflate operational risk or fail readiness by themselves.
4. The section remains readable enough for dashboard scanning, not only for deep debugging.

## Acceptance Checks

- Given an allowlisted operator opens `/internal/data-health`, when linked admissions pairs exist, then the dashboard renders a pair-level admissions evidence section.
- Given a linked pair has an exact official target, when the dashboard renders that row, then it shows the source target id and external program identifier.
- Given a linked pair requires additional applicant inputs before exact official evaluation can run, when the dashboard renders that row, then it shows the required-input state rather than pretending the pair is exact-ready.
- Given a linked pair has only formula-backed or score-only coverage, when the dashboard renders that row, then it shows that evidence mode explicitly.
- Given a linked pair has no official target, when the dashboard renders that row, then the row appears as informational and does not by itself create a readiness failure or operational-risk alert.

## Open Questions for Planning

- Whether the pair-level section should be capped to a fixed number of rows with priority ordering, or fully rendered with grouping/filtering.
- Whether the evidence mode labels should be purely operator-facing English, Hebrew, or mixed.
- Whether exact target metadata should be shown inline in each row or tucked behind a compact expandable pattern.
