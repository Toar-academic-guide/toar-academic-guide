---
title: Non-visual UX P1 fixes
date: 2026-10-25
type: fix
---

Implement the four selected findings from the 2026-10-25 UX walkthrough.
Follow `myway-rules.md`. Keep this PR queued after #272, #276, #273 and
BIU law (#277, already merged). The queue launcher starts this run after the
preceding coding process finishes; open predecessors remain merge dependencies.

For each item, add and run a reproducing test before changing production code.

1. **Engineering search:** normalize the Hebrew engineering synonym/construct
   forms in subject search, using existing subject names rather than an ID list.
   Cover the complete current engineering subject set, the engineering hub,
   new engineering subjects, and unrelated queries in
   `src/components/StudyJourney.ux-p1.test.tsx` and `src/lib/studyJourney.test.ts`.
2. **Haifa links:** replace CS/law programme and calculator URLs with current
   official destinations, preserving referral attribution. Cover both static
   catalogue data and legacy database serialization, without DB writes or a
   static fallback. Add `scripts/check-haifa-official-urls.ts` with deterministic
   tests and documented CI handling: permanent broken destinations fail;
   bounded retries for transient network/rate-limit/server failures, then an
   explicit inconclusive warning in CI; strict mode requires all final HTTP 200s.
3. **Exact grades:** leave the five compulsory one-unit starter values empty,
   preserve blanks when edited, and exclude untouched blank rows on submit.
   Keep math/English defaults and meaningful partial-row validation. Cover
   defaults, clearing, saved records, sector changes and average invariance in
   `src/components/JourneyExactGrades.test.tsx`.
4. **Programme context:** carry `program` in the programme CTA URL and resolve
   it against the loaded catalogue to select the corresponding field and
   institution/programme context. Explicit links take precedence over unrelated
   stored selections; invalid IDs retain the normal chooser. Cover the page
   link, calculator query boundary, hydration and reload in unit tests and
   `e2e/ux-p1.spec.ts`.

Use existing Next 16 async page/searchParams conventions. No CSS, layout,
new UI, status-label, brand or engineering catalogue-coverage changes.
Stop and report to Jorje if a layout change becomes necessary.

Run focused red/green tests, desktop/mobile Playwright checks, strict live
Haifa URL checking, lint, typecheck, formatting, relevant existing tests and
`npm run guard:pre-pr`. Include preview/CI evidence and any access limits in
the PR. No production DB writes, migrations, publication/freshness jobs,
manual deployment, merge, main push, comments or notifications.

Samuel reruns the four fixes plus BGU psychology on the preview. BGU
psychology behaviour is a preview acceptance check, not a fix in this PR.
