---
title: Prep Page Content and Consent Verification - Plan
type: feat
date: 2026-10-30
artifact_contract: ce-unified-plan/v1
product_contract_source: user-brief
execution: code
---

# Prep Page Content and Consent Verification - Plan

## Goal Capsule

Prospective students can read the approved preparation guidance and understand who receives their enquiry.
The implementation follows KTD1 and KTD2.
The original task and Follow-up 1 govern scope and local delivery; the approved copy and main mockup govern content and appearance.
Follow-up 1 authorizes local commits with the known page-test conflict still present.
Other existing expectations remain unchanged and any additional conflicts are reported.

---

## Product Contract

### Summary

Add the four approved reading blocks beneath the existing preparation hero and characterize every lead-delivery boundary for consent and age attestation.

### Problem Frame

The preparation enquiry page has no supporting reading content, and the promise that unticked leads remain with MyWay needs explicit regression coverage.

### Requirements

**Content and appearance**

- R1. Render the approved four blocks verbatim only for the preparation target with no institution, preserving route, query parameters and metadata.
- R2. Follow the main mockup and measured spec, including paragraph boundaries, lists, ten emphases, approved SVG, link behavior and scoped responsive widths.
- R3. Preserve the existing form, consent wording and behavior; only the approved preparation dialog width and mobile submit padding change.
- R4. Keep the hero CTA and whole dialog above the fold at both requested viewports with no horizontal overflow.

**Consent and delivery**

- R5. Unticked consent and invalid stored age attestation never authorize partner forwarding.
- R6. Ignore client text/time evidence, keep MyWay-only storage separate from partner delivery, and preserve contact-free Slack and analytics payloads.
- R7. Use tests before implementation, mock submissions and integrations, and leave all existing expectations unchanged.

**Delivery**

- R8. Run every requested check, record the known assertion conflict and any additional failures, commit locally, and produce the full external report.

### Scope Boundaries

No route, schema, migration, dependency, environment, SEO metadata or external settings changes.
No new CTA, JSON-LD, partner integration or live lead submission.
An added Monday marker is considered unnecessary: the destination is MyWay's own board and no partner-delivery caller exists.
A change to that assessment would require actual code evidence of partner access or forwarding.

---

## Planning Contract

### Key Technical Decisions

- KTD1. Keep the new reading renderer on the server with a typed, static content module extracted programmatically from the approved mockup, checked against Amanda's section 2. This preserves characters and keeps prose out of the client bundle.
- KTD2. Use a page CSS module activated by the existing preparation condition. Descendant dialog and hero selectors preserve shared form markup and institution targets.
- KTD3. Characterize actual serialized payloads with existing mock patterns. No backend mutation is warranted unless those tests demonstrate a real leak.

### Risks and Dependencies

The whole-markup ban on free-course language in `src/app/enquiry/page.test.tsx:98` conflicts with the approved government-course sentence. It stays unchanged pending Jorje approval; this is a release blocker, not an implementation blocker under Follow-up 1.
The repository writer creates new server-owned consent evidence; stored-lead eligibility belongs to `prepForwarding.ts`, not that writer.

---

## Implementation Units

### U1. Characterize consent and age boundaries

**Requirements:** R5, R6, R7.
**Dependencies:** none.
**Files:** the existing tests beside `src/server/enquiries/prepForwarding.ts`, `repository.ts`, `monday.ts`, `notifications.ts`, and `src/app/api/enquiries/route.ts`.
**Approach:** Add cases without changing existing assertions. Use mocked DB transactions, fetch and PostHog capture, including executing the scheduled after callback.
**Execution note:** Write and run these cases before any production changes; a passing characterization baseline is valid when no leak exists.
**Test scenarios:**

- Unticked and missing consent cannot become forwardable through forged text/time.
- Null, missing and obsolete stored attestation fails the gate.
- The writer emits null evidence without affirmative consent and owns evidence for explicit affirmative submissions.
- Monday uses only the internal destination and existing contact columns, including malformed attestation cases.
- Slack and PostHog retain their exact field allowlists across all consent cases.

**Verification:** All added backend cases pass or a genuine leak is minimally fixed and documented.

### U2. Render the approved preparation reading section

**Requirements:** R1, R2, R3, R4, R7.
**Dependencies:** U1.
**Files:** `src/lib/prepPageContent.ts`, `src/app/enquiry/PrepPageContent.tsx`, `src/app/enquiry/prep-page.module.css`, `src/app/enquiry/page.tsx`, and additional cases in `src/app/enquiry/page.test.tsx`.
**Approach:** Apply KTD1 and KTD2 with semantic markup, two internal Next links and two externally announced source links.
**Test scenarios:**

- SSR contains four ordered headings, lists with four and three items, and exactly ten approved strong phrases.
- Rendered copy matches a checked-in approved-text fixture exactly after removing only accessibility announcements.
- Institution enquiry output has no reading section or preparation styling.
- Link destinations, attributes and icon placement match the brief.

**Verification:** New rendering cases pass and the known existing no-free-language assertion is the sole expected failure.

### U3. Verify responsive flow and finish locally

**Requirements:** R4, R7, R8.
**Dependencies:** U2.
**Files:** `e2e/prep-page-content.spec.ts`; full report outside the repository as requested.
**Approach:** Use the real local route, native dialog and mocked enquiry API, then simplify only current changes inline.
**Test scenarios:**

- At 1280 by 800 and 390 by 844, assert semantic counts, reading measure, card/dialog widths, submit line count, fold positions and overflow.
- Verify empty and filled Hebrew fields remain right aligned, close/reopen the dialog, and submit only to a route mock.
- Verify source-link focus and styling and capture local diagnostic screenshots without private data.

**Verification:** Every requested browser spec passes or failures are classified against the base using the same worktree and environment.

---

## Verification Contract

Run lint, typecheck, the repository format check plus formatting checks restricted to changed files, full Vitest, the pre-PR guard, and all three requested Playwright specs.
Use a bounded worker count or the authorized shards if resource contention stalls full Vitest.
The known `page.test.tsx:98` failure remains visible; do not exclude or rewrite it.
Protect all existing assertions and the new proof tests during simplification.

---

## Definition of Done

Implementation and all added tests are complete, copy comparison passes, check counts and limitations are recorded, and no development server remains running.
Only scoped files enter conventional local commits; no push or PR action occurs.
The report identifies Jorje's pending test approval and any unresolved mockup mismatch.
Remove experimental or abandoned implementation code before completion.
