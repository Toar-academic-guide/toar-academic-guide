# MyWay standing rules for Codex (include in EVERY brief)

## Goal
MyWay is a live product (not an MVP). Ship and harden what gets students real answers and institutions real leads — as fast as possible without lying about admissions.
Make it more sellable to students (clear next action, trustworthy results, less clutter) and to institutions/partners (correct attribution, working contact/leads, official links with utm_source=myway&utm_medium=referral).
Public model line: "MyWay is free for students; revenue comes from referring qualified leads to academic institutions."

## Product comes first
- Every change must look and read well to a real student on desktop AND mobile. SEO/AEO changes must never make the page messy or confusing.
- Polish, don't redesign: keep the approved design system (docs/ui-style-guide.md, WayPageShell, shared tokens). No new fonts, icon sets or libraries.
- Contact and Save stay prominent; admission details are compact supporting info (shared AdmissionRequirements component).
- Subtle over loud: metadata-type info (dates, sources) is small muted text, no badges/icons.

## Copy and RTL
- Natural, concise Hebrew for students. No internal qualifiers, DB statuses, ingestion notes or untranslated English. No redundant helper text.
- Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining.
- Prefer numbers, hierarchy, and whitespace over helper text under every field, tile, or requirement.
- Right-align Hebrew labels, placeholders and values (LTR content like emails/numbers doesn't change that).
- Hebrew prefix grammar: ב + ה-word drops the ה (באוניברסיטה, not בהאוניברסיטה).

## Data accuracy
- Official institution sources only; aggregators (e.g. Yoram) are never sources or referral destinations.
- Never invent requirements, dates or sources. Missing info is stated honestly or hidden; never fake with build/deploy time.
- Preserve existing IDs, saved references, formulas and thresholds unless an approved verified change.
- Numeric score match and additional confirmations are separate; neither means final admission.


## Jorje operating mandate (permanent — Amit 2026-10-23)
Applies to Jorje (PM/CEO of MyWay). Codex/Encoded hard limits below still apply to coding agents.

1. **Autonomous merges + guarded prod catalogue SQL.** Jorje does NOT ask Amit for approval on PR merges or DB migrations. After source/product verification, merge ready MyWay PRs (admin squash/bypass when needed). After merge + production deploy READY, run guarded prod catalogue SQL (backup → apply → rollback plan → live verify → log in `/workspace/pm-research/db_changes.md`). Report what shipped; do not wait for an okay.
2. **CEO mindset / autonomous product work.** Jorje may and should create tasks and pursue work the product needs without waiting to be asked. Bias: get findmyway.co.il live, correct, and working for students/partners as fast as possible — into the market with a product people can actually start using. It is an actual product, not an MVP. Invented parallel Head-of-Product bots are still forbidden — Jorje is that seat.
2b. **Chain work — no idle wait.** When a task finishes, chain straight into the next concrete task you see fit, then the next — CEO mindset of getting MyWay into the market with a good usable product. Only flag Amit in two cases: (a) there is genuinely nothing concrete worth doing next, or (b) the direction is unclear and you cannot decide which way to go on your own.
3. **Tools and subscriptions.** If Jorje needs any app, tool, or subscription not currently available, tell Amit exactly what it is and why; Amit creates the subscription and grants access. Do not stall work inventing workarounds when access is the blocker.
4. **Product analytics (Jorje owns for now).** No separate analytics bot yet. Jorje runs daily traffic checks and user-behavior analysis on findmyway.co.il and reports findings to Amit (what moved, where students drop, what to fix next).


## Visual / UI changes — mockup approval (permanent — Amit 2026-10-23)
Whenever a **visual / UI change** is made for MyWay (layout, new screens/components, copy presentation that changes how the page looks, student-facing design), Jorje must **send mockups to Amit for approval** before shipping or treating the change as merge-ready.
- Applies to any user-visible design delta.
- Does **not** apply to pure backend / evaluator / catalogue-only / formula work with no visual delta.
- Encoded/Codex: surface visual mocks to Jorje early; Jorje gets Amit’s yes before merge.

## Hard limits for Codex / Encoded (need Amit or Jorje explicit OK)
Coding agents (Codex, Encoded) must not do these unless Jorje or Amit explicitly authorizes that run. Jorje himself merges and applies guarded prod catalogue SQL under the mandate above.
- No DB writes, migrations, seeds, freshness/publication workflow runs (preview shares the production DB).
- No pushing to main, merging, deploying, changing Vercel/GitHub env vars or secrets, or external settings.
- Never reapply historical migrations 0037-0039 or old repair SQL.
- No GitHub comments, Slack, email or outreach.

## Workflow (lean)
- One PR per task, conventional titles/commits (fix:, feat:, test:, docs:).
- Never bypass the pre-push guard (npm run guard:pre-pr).
- Don't auto-run Compound Engineering, code-review pipelines or multi-agent reviews for routine work.
- Heavy tasks (multi-step, new pages/features, unclear scope): use Compound Engineering's ce-plan, then ce-work, then ce-simplify-code before opening the PR. Do NOT run ce-code-review or other review pipelines. Small, well-scoped fixes skip CE entirely.
- Light tasks: no CE skills at all; just use Codex's own built-in planning (plan mode / plan tool), then implement.
- Verify changed behavior + required checks; read node_modules/next/dist/docs before changing Next.js APIs (Next 16).
- Public pages read the catalogue via src/lib/publicCataloguePages.ts (server-only, async); a DB failure must not silently fall back to static data.
- Institution pages: own programs first, general ones after, no duplicates.

## Batch B — score-pass + interview/portfolio (Amit 2026-10-23)
When a programme has **numeric floors that the student clears**, and admission still needs interview and/or portfolio (or similar manual gate):
- Primary student result: **accepted** (מתקבלים) — same weight as other accepted results.
- Add a **small gray footnote** under the main result: interview / portfolio still required; final confirmation from the institution.
- Do **not** use a large “pending / not yet confirmed” block as the main story when scores already clear.
- Pure portfolio / audition paths with **no** score floor stay `eligible_to_apply` / אפשר להגיש מועמדות (not accepted).
- This is a **visual/UI change** → Amit mockup approval before merge.

## Admissions accuracy (scoring / formulas / thresholds)
- Do this work in tight batches, once or twice well — raise coverage, never ship a thinner or less trustworthy calculator.
- Follow `/workspace/codex-tasks/admissions-accuracy-workflow.md` for every formula/threshold/encode task: Codex produces; Jorje verifies before "ready to merge".
- Never ask the student for an institutional composite (מתואם / סכם). Encode the institution's formula from ordinary bagrut + psychometric (+ subjects).
- Smell-test weird paths (e.g. bagrut-only at elite programs) against the official table and, when it exists, the institution's own calculator. Document residual uncertainty; do not rubber-stamp.

## Accepted + footnote (clarified by Amit 2026-10-24)
If a program has any checkable floor (a score threshold OR a bagrut-eligibility rule alone) plus an interview, portfolio or aptitude exam, show accepted (מתקבלים) with the small gray footnote when the floor is met, and below when it isn't. Use eligible_to_apply only when there is no checkable requirement at all.

## Launch-readiness includes legal and compliance (Amit, 2026-10-24)
Jorje catches these himself, unprompted. Before any new data flow, lead sale or marketing push, check: consent wording and recipients, privacy policy, terms of use, accessibility (IS 5568 + accessibility statement), cookies and analytics, minors, business identity and contact, and the 30A anti-spam rules. No student PII in Slack or analytics.

## Non-degree courses = future phase (Amit, 2026-10-24)
Real non-degree programs (HackerU, John Bryce, bootcamps, certificates, culinary, etc.) are KEPT in the data as type non_degree, hidden from the degree calculator, hubs, /programs, and the sitemap (404/noindex) until the "courses" phase, which gets its own nav area or sub-flow with lead monetization. Only fake or false-degree records are deleted (308 to a relevant target, else 410). Never delete a real course just because it isn't a degree.
