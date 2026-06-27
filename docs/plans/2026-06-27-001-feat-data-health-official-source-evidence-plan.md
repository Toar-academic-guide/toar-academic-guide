---
title: "feat: data health official source evidence"
type: feat
date: 2026-06-27
origin: docs/brainstorms/2026-06-27-001-feat-data-health-official-source-evidence-requirements.md
---

# Data Health Official Source Evidence

## Summary

Extend `/internal/data-health` with a pair-level admissions evidence section that shows, for every linked program/institution pair, what evidence mode the public runtime currently uses and which official target metadata backs that result when available.

This should complement the existing aggregate readiness cards, not replace them. Operators need one page that answers both "is the slice healthy?" and "what is runtime actually using for this pair?"

---

## Problem Frame

`src/server/admissions/capabilityMatrix.ts` already knows whether a linked pair is exact, needs input, estimated, score-only, blocked, stale, unsupported, or missing. That runtime truth does not currently flow into `/internal/data-health`.

The current dashboard in `src/app/internal/data-health/DataHealthDashboard.tsx` only exposes aggregate decision-readiness counts and weak-source warnings. It cannot show whether TAU and Haifa are backed by exact official targets, whether another linked pair is formula-estimated, or whether a missing official target is merely informational.

The feature is therefore an operator visibility gap, not a public admissions-calculation change. The work should surface existing runtime evidence classifications inside the internal dashboard without redefining readiness policy. (see origin: `docs/brainstorms/2026-06-27-001-feat-data-health-official-source-evidence-requirements.md`)

---

## Requirements

### Pair Coverage

- R1. `/internal/data-health` must render one admissions evidence row for every linked `programInstitutions` pair represented in the dashboard data.
- R2. The row model must preserve the runtime evidence mode for each pair: `exact`, `needs_input`, `blocked`, `stale`, `score_only`, `estimated`, `unsupported`, or `missing`.
- R3. The new section must remain additive to the existing `decisionReadiness` summary; aggregate readiness cards and issue counts stay in place.

### Official Source Traceability

- R4. Exact or official-backed rows must expose the runtime source metadata the operator needs to verify the live mapping: institution, program, source target identifier, official source reference URL when available, and external program identifier or adapter target when available.
- R5. Rows that are blocked, stale, or input-gated must expose the relevant operator-facing detail: freshness state, blocked reason, and required applicant inputs when present.

### Severity Semantics

- R6. Rows with no official-calculation target must remain visible but must not on their own count as operational-risk or readiness-failure signals in the dashboard.
- R7. Visual treatment must make exact and input-gated official rows easy to scan, keep blocked and stale rows attention-worthy, and demote missing/unsupported informational rows.

### Testability and Maintenance

- R8. Server-side tests must cover the pair-level evidence aggregation contract, including exact official, needs-input, estimated, score-only, blocked, stale, unsupported, and missing cases.
- R9. UI tests must cover rendering of the new section, key metadata fields, and the low-severity treatment for missing official-target rows.

---

## Key Technical Decisions

- KTD1. Reuse `buildAdmissionsCapabilityMatrix()` as the classification source of truth instead of recreating capability logic inside the data-health query layer. This keeps `/internal/data-health` aligned with the public admissions runtime.
- KTD2. Build a dedicated dashboard row model in `src/server/data-health/queries.ts` rather than pushing raw capability entries into the page. The dashboard needs program/institution names, display-ready metadata, and stable severity semantics.
- KTD3. Treat missing or unsupported official targets as informational dashboard rows, not as additions to the existing operational-risk list. The product intentionally supports mixed evidence modes, so the dashboard must reflect that policy instead of redefining it.
- KTD4. Render the pair-level section inline in the dashboard with compact metadata rows instead of introducing a separate drill-down page or expandable provenance inspector. The operator need here is scan-first verification, not deep diagnostics.
- KTD5. Keep row labels operator-facing English for this slice so the new section stays consistent with the rest of the internal dashboard and existing test snapshots.

---

## High-Level Technical Design

The new section should be driven from a single server-side transformation:

```mermaid
flowchart TB
  LinkedPairs[programInstitutions pairs]
  Catalogue[programs and institutions]
  Freshness[source_freshness_states]
  Capability[buildAdmissionsCapabilityMatrix]
  Report[data-health report]
  Dashboard[/internal/data-health]

  LinkedPairs --> Capability
  Catalogue --> Capability
  Freshness --> Capability
  Capability --> Report
  Report --> Dashboard
```

The data-health query layer should:

- load the linked programme/institution pairs already present in the report inputs
- build a lightweight catalogue snapshot for `buildAdmissionsCapabilityMatrix()`
- load freshness states for relevant source target ids
- produce one typed dashboard row per linked pair with both runtime classification and display metadata

The dashboard component should consume that typed row list and render it as a scan-first matrix with compact status chips and detail lines.

---

## Implementation Units

### U1. Pair-Level Admissions Evidence Report Model

- **Goal:** Extend the internal data-health query layer to return one typed admissions evidence row per linked program/institution pair.
- **Requirements:** R1, R2, R4, R5, R6, R8
- **Dependencies:** None
- **Files:** `src/server/data-health/queries.ts`, `src/server/data-health/queries.test.ts`, `src/server/admissions/capabilityMatrix.ts`, `src/db/schema.ts`
- **Approach:** Add a new `decisionEvidence` or similarly named section to `DataHealthReadyReport` that is derived from existing `programs`, `institutions`, `programInstitutions`, calculator config, threshold, and freshness data. Reuse `buildAdmissionsCapabilityMatrix()` for capability classification, then map each entry into a dashboard-oriented row shape that includes program name, institution name, evidence mode, source target id, source URL/reference, freshness state, blocked reason, required inputs, and exact target metadata.
- **Patterns to follow:** Mirror the existing report-shaping style in `src/server/data-health/queries.ts`: query raw rows first, then convert them into a typed, bounded application payload. Follow `buildAdmissionsCapabilityMatrix()` as the authoritative capability classifier.
- **Test scenarios:**
  - Exact official: given TAU or Haifa exact-target data, when the report is built, then the row is classified as `exact` or `needs_input` and includes target id, external program identifier, and source target metadata.
  - Blocked/stale official: given a freshness row with `blocked` or stale/failed state, when the report is built, then the row is classified accordingly and includes the blocked or freshness context.
  - Estimated: given a linked pair with calculator config plus threshold but no official exact target, when the report is built, then the row is `estimated`.
  - Score-only: given a partial source target, when the report is built, then the row is `score_only`.
  - Unsupported/missing: given a linked pair without an exact target and without enough fallback structure, when the report is built, then the row is `unsupported` or `missing` and is flagged informational rather than critical.
  - Edge case: given a program linked to multiple institutions, when the report is built, then each pair gets its own independent row.
- **Verification:** `src/server/data-health/queries.test.ts` proves the new report section stays aligned with the capability matrix across the supported modes.

### U2. Dashboard Section for Admissions Evidence

- **Goal:** Render the new pair-level evidence matrix inside `/internal/data-health` without disturbing existing readiness and operational sections.
- **Requirements:** R1, R3, R4, R5, R6, R7, R9
- **Dependencies:** U1
- **Files:** `src/app/internal/data-health/DataHealthDashboard.tsx`, `src/app/internal/data-health/DataHealthDashboard.test.tsx`, `src/app/internal/data-health/page.tsx`
- **Approach:** Add a dedicated "Admissions evidence" section near the current admissions decision-readiness panel. Render one row per linked pair with a clear evidence-mode chip and compact metadata lines for source target id, external program id, required inputs, freshness state, and blocked reason when present. Missing or unsupported rows should remain visible with subdued styling and without adding to the "Immediate attention" panel.
- **Patterns to follow:** Reuse the dashboard's existing compact-panel language and small status surfaces instead of introducing nested cards or a heavy table treatment. Keep the section scan-first and consistent with the current internal dashboard typography.
- **Test scenarios:**
  - Given a ready report with exact TAU and Haifa rows, when the dashboard renders, then the section shows those rows with their source target metadata.
  - Given `needs_input`, `blocked`, and `stale` rows, when the dashboard renders, then the row labels and detail text expose required inputs or freshness/blocked context.
  - Given `missing` or `unsupported` rows, when the dashboard renders, then the rows are present but do not appear in the critical-attention list.
  - Given an empty pair list, when the dashboard renders, then it shows a controlled empty state instead of a blank panel.
- **Verification:** `src/app/internal/data-health/DataHealthDashboard.test.tsx` covers representative row types and ensures low-severity rows stay out of the critical surface.

### U3. Operator Semantics and Documentation Alignment

- **Goal:** Keep the dashboard semantics documented so future contributors do not treat missing official targets as production failures.
- **Requirements:** R3, R6
- **Dependencies:** U1, U2
- **Files:** `docs/internal-data-health-dashboard.md`, `docs/hybrid-admissions-decision-slice.md`, `CONCEPTS.md`
- **Approach:** Update the internal dashboard docs to describe the new admissions evidence section, its evidence modes, and the distinction between informational mixed-coverage rows and genuine operational risk. Add or tighten vocabulary in `CONCEPTS.md` only if the current admissions terminology is ambiguous for future plan/work cycles.
- **Patterns to follow:** Preserve the repo's existing distinction between canonical runtime evidence, operator review surfaces, and public decision behavior.
- **Test scenarios:** Documentation-only unit; no automated tests required.
- **Verification:** A future reader can tell from the docs why TAU/Haifa exact coverage is visible here and why other linked pairs may still appear as estimated, score-only, or informational missing.

---

## Acceptance Examples

- AE1. Given an allowlisted operator opens `/internal/data-health`, when linked program/institution pairs exist, then the page shows one admissions evidence row per linked pair.
- AE2. Given the TAU or Haifa pair is backed by an exact official target, when the dashboard renders that row, then it shows the evidence mode plus source target id and external program identifier.
- AE3. Given an official mapping requires applicant inputs, when the dashboard renders that row, then it shows `needs_input` and lists the required inputs instead of presenting the pair as exact-ready.
- AE4. Given a linked pair is formula-backed or score-only, when the dashboard renders that row, then it names that evidence mode explicitly.
- AE5. Given a linked pair has no official target, when the dashboard renders that row, then the row is visible but does not by itself create a critical operational-risk alert.
- AE6. Given a freshness state becomes blocked or stale, when the dashboard renders that row, then the operator can see that status and the relevant blocked or freshness detail in the pair row.

---

## Sources / Research

- `src/server/admissions/capabilityMatrix.ts` already contains the runtime classification logic and the existing exact targets for TAU and Haifa.
- `src/server/data-health/queries.ts` is the current report-shaping boundary for `/internal/data-health`.
- `src/app/internal/data-health/DataHealthDashboard.tsx` is the existing internal dashboard surface and establishes the current operator-facing UI language.
- `docs/hybrid-admissions-decision-slice.md` and `docs/internal-data-health-dashboard.md` establish `/internal/data-health` as the operator checkpoint for admissions decision readiness and data health.

---

## Risks & Dependencies

| Risk | Impact | Mitigation |
| --- | --- | --- |
| The dashboard duplicates capability logic instead of reusing runtime classification | Internal evidence view drifts from public admissions behavior | Keep `buildAdmissionsCapabilityMatrix()` as the classification source and only map it into dashboard rows |
| Pair-level rows accidentally get folded into critical readiness semantics | Operators treat expected mixed coverage as a production incident | Keep missing/unsupported rows informational by design and test that they do not enter the critical-attention surface |
| Row metadata grows noisy and hard to scan | The dashboard becomes a provenance dump instead of an operator tool | Limit the section to the metadata needed to validate runtime behavior and defer deep provenance to other tooling |
| Freshness/source metadata is incomplete for some pairs | Operators misread empty fields as broken queries | Render optional fields conditionally and reserve warning treatment for explicit blocked/stale states |

---

## Scope Boundaries

### Included

- Pair-level admissions evidence rows for every linked program/institution pair in `/internal/data-health`
- Reuse of existing runtime capability classification and source-target metadata
- Inline operator-visible metadata for exact, input-gated, blocked, stale, score-only, estimated, unsupported, and missing states
- Focused tests for the report model and dashboard rendering

### Deferred

- New official-source adapters or exact-target integrations for additional institutions
- Changes to public admissions result behavior or calculation formulas
- Drill-down provenance inspectors, filters, or editable dashboard controls
- Reclassification of missing official targets as readiness failures
