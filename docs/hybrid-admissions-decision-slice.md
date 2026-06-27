# Hybrid Admissions Decision Slice

## Product Output

Admissions decisions must return four fixed sections:

1. Status: accepted, likely accepted but needs verification, close to accepted, not accepted but has a path, far from the track, or insufficient data.
2. Explanation: the calculator result, published minimums, or structured facts that produced the status.
3. Missing gap: score gaps and unresolved manual gates.
4. Best next action: registration, date check, score improvement, prep program, transfer path, exceptions committee, similar program, other institution, official source, manual check, or save for tracking.

The product may say "התקבלת" when trusted calculated or published conditions support it. Confidence and source context explain how strong that decision is; they do not replace the status.

## Data Shape

The runtime decision engine consumes reviewed structured data:

- `admissions_source_candidates`: official or operator-provided URLs with origin, specificity, and confidence.
- `admission_facts`: concise gates or absences that can be compared against user data.
- `admission_alternative_paths`: paths that shape the next action but do not count as primary admission facts.

Broad scraped prose is not a decision input. It can remain in raw payloads, review notes, or documentation, but the user-facing result should cite exact facts and short explanations.

## Representative Slice

The first slice covers a small academic sample:

- calculator-backed university case
- formula-backed university case
- open-admission case
- non-calculator numeric case
- numeric plus manual-gate case
- weak-data case that degrades to low confidence or insufficient data

Vocational, certificate, online, and abroad options can appear as alternatives, not as primary academic acceptance decisions.

## Operator Checks

Use `/internal/data-health` to check whether a program is decision-ready:

- source candidate exists
- structured facts exist
- weak or generic sources are visible
- manual gates are counted separately from missing numeric facts
- alternatives are present when direct admission is not realistic

Use the pair-level admissions evidence section on the same page to confirm what runtime is actually using for each linked program/institution pair:

- exact official target
- official target that still needs applicant inputs
- blocked or stale official path
- score-only official coverage
- formula-backed estimate
- unsupported or missing official coverage, kept informational rather than incident-level by default

Scaling to all institutions should wait until the representative slice is reliable under those checks.
