---
title: Two-domain psychometric guide - Plan
type: feat
date: 2026-11-06
topic: two-domain-psychometric-guide
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
execution: code
issue: https://github.com/Toar-academic-guide/toar-academic-guide/issues/380
---

# Two-domain psychometric guide - Plan

## Goal Capsule

- **Objective:** Prospective students understand the psychometric reform, what it means for their existing scores, and what to check before applying to their chosen programme.
- **Means:** An informative Hebrew guide at `/psychometric-two-domain`.
- **Product authority:** Issue #380 and Amit's confirmed brainstorm decisions on 2026-11-06, recorded below.
- **Open blockers:** None for implementation planning. Approval covers this requirements document; implementation requires separate approval.

## Product Contract

### Summary

Create a student-facing guide covering the new exam, previous test takers, and admissions implications in one page.
Explain each topic to the depth needed for a useful answer, with official sources and practical next steps.

### Key Decisions

- **Cover all three student questions together.** Governs R1–R4. (session-settled: user-directed — chosen over prioritising one audience: Amit wants all three questions answered.)
- **Use informative content without an artificial brevity limit.** Governs R5. (session-settled: user-directed — chosen over a deliberately short guide: students may need substantial explanation.)
- **Explain admissions and link to official policies.** Governs R4, R6. (session-settled: user-directed — chosen over an institution-by-institution comparison: the selected scope provides guidance and authoritative next steps.)
- **Keep the work informational.** Governs Scope Boundaries. (session-settled: user-approved — chosen over extending calculator or profile behaviour: Amit confirmed the page-only scope.)

### Requirements

**Student questions and content**

- R1. Explain what changes from December 2026, including exam structure, subjects, duration, and the role of separate English testing.
- R2. Explain the practical steps for first-time candidates, including registration, official preparation resources, and when separate English registration is needed.
- R3. Explain existing score validity, where previous candidates find their two-domain score, and how previous English and emphasis scores are treated.
- R4. Explain what applicants must check for their chosen programme, including accepted score types, English requirements, and relevant deadlines, with links to official institution policies.
- R5. Provide enough explanation, common situations, and examples to answer the student questions properly, including the general, quantitative-emphasis, and verbal-emphasis scores where relevant.

**Evidence and language**

- R6. Use NITE as the authority for exam and scoring facts and official institution pages for admissions policy links; preserve programme-specific uncertainty instead of implying a universal admissions rule.
- R7. Verify numerical examples and current factual claims against the applicable official source before publication, with accessible source links supporting the content.
- R8. Write in natural Hebrew using plural, gender-neutral address where practical, with no internal implementation or research commentary in student-facing content.

**Page experience and discovery**

- R9. Publish a substantive, indexable page at `/psychometric-two-domain` using the existing design system.
- R10. Organise the guide with descriptive headings so students can find the material relevant to their situation on mobile and desktop.
- R11. Keep Hebrew text right-aligned and preserve readable numeric ranges and mixed-direction content.
- R12. Include the page in the sitemap and link to it from relevant existing preparation or calculator pages.

### Content Organisation

Use an opening explanation of the reform, followed by sections for exam structure and scoring, first-time candidates, previous candidates, and admissions implications.
Place common questions and official next steps alongside the relevant explanation or in a clearly labelled concluding section.
This is a reading structure for R1–R5 and R10, not a new interactive questionnaire; exact visual composition can follow the existing site patterns during planning.

### Acceptance Examples

- AE1. **Covers R1, R2, R5–R8.** A first-time candidate can identify the new exam format, understand the role of English testing, and follow the appropriate official registration and preparation links.
- AE2. **Covers R3, R5–R8.** A previous candidate can understand whether the reform itself requires retaking the exam, locate the official route to their scores, and distinguish the treatment of the two-domain score from previous emphasis scores.
- AE3. **Covers R3, R4, R6–R8.** A candidate with an existing English score can find the applicable validity explanation and understand which programme-specific requirements still need checking.
- AE4. **Covers R4, R6, R7.** A candidate applying to a particular programme receives a clear list of policy questions and official institution links, without an unsupported admission prediction or a claim that every institution uses the same score.
- AE5. **Covers R9–R12.** At 390px and 1280px, a reader can scan all sections, read Hebrew and numeric ranges correctly, and follow the relevant official next-step links without horizontal overflow.

### Practical Verification

Open `/psychometric-two-domain` on the eventual preview at 390px and 1280px.
Read it once as a first-time candidate and once as someone with previous psychometric and English scores, checking AE1–AE4.
Follow the registration, score-access, and admissions-policy links and confirm their destinations match the surrounding text.
Check AE5 visually, including visible Hebrew copy and numeric ranges, and provide screenshots at both widths to Amit before merge.
Confirm that a relevant existing preparation or calculator page links to the guide and that its canonical URL appears in the sitemap.

### Scope Boundaries

- No institution-by-institution admissions comparison or catalogue of programme exceptions.
- No changes to admission calculations, calculator formulas, saved profiles, or eligibility predictions.
- No new score-conversion calculator, personalised recommendation flow, or registration system.
- No implementation, deployment, issue update, or PR creation is authorised by this document approval.

### Dependencies and Planning Notes

The original issue reported a missing route on 2026-11-05; planning must inspect the current branch and existing related pages before choosing implementation details.
Recheck the official sources when drafting the page because exam and admissions guidance can change.
The related Monday topic-hub item was marked Not Started with no subitems when inspected during this brainstorm; this document does not update that board.

### Planning Resolutions

The implementation below resolves internal linking, source destinations, and the optional `llms.txt` entry.
There are no remaining product decisions blocking implementation; content drafting and final source checks remain implementation work.

### Sources and Research

- [GitHub issue #380](https://github.com/Toar-academic-guide/toar-academic-guide/issues/380): original page brief, source constraints, discovery requirements, and screenshot expectations.
- [Monday topic-hub task](https://malichi-hub.monday.com/boards/18407769281/pulses/13354483352): existing task context.
- [NITE reform announcement](https://www.nite.org.il/news/notice-081026/): the December 2026 change to verbal and quantitative domains.
- [NITE two-domain FAQ](https://www.nite.org.il/two-domain-psychometric-entrance-test/faqs/), checked 2026-11-06: the reform itself does not require previous candidates to retake the exam. Previous candidates can find a two-domain score in their personal area. Previous quantitative- and verbal-emphasis scores are not retrospectively recalculated under the new format. Institutions determine how scores and English affect admission. These distinctions inform R3 and R4; the page must retain the qualifications in the official guidance.

---

## Planning Contract

### Verified Repository Baseline

Planning inspected GitHub `main` at `9b5bd40e13e351550123be8b9f1a6e18d0f14834` on 2026-11-06.
The current local checkout is an older, unrelated branch with modified and untracked work; it is not the implementation baseline.

- `src/app/psychometric-dates/page.tsx` supplies the closest page pattern: `WayPageShell`, explicit metadata, official source links, RTL text, isolated numeric ranges, and a reform note.
- `src/app/sekhem-calculator/page.tsx` has an explanatory FAQ below the calculator suitable for an inbound guide link.
- `src/app/sitemap.ts` explicitly lists public routes and authored modification dates.
- `public/llms.txt` already describes public guides/tools and directs readers to official authorities.
- `src/lib/seo/seo.test.ts` pins the sitemap order and count, the `llms.txt` date, and the calculator bullet's last position.
- `e2e/psychometric-dates.spec.ts` checks both required widths, a single existing calculator CTA, readable content, link target sizes, and no horizontal overflow.
- The new guide route is absent from the inspected `main` tree.
- `main` uses Next.js 16.4.2; the current checkout has 16.3.6. Read the installed Next.js documentation again in the eventual implementation worktree before coding.

### Implementation Decisions

- **Server-rendered article.** Add a normal Server Component route with static authored content and metadata, passing the article as children to the existing `WayPageShell`. The shell is already a Client Component; the article does not need client state, a client directive, runtime source fetching, or catalogue queries. Covers R1–R10.
- **Local content and styles.** Keep prose, small source/link constants, and section IDs in the new `page.tsx`, with one adjacent CSS module. This page does not justify a CMS, generic article renderer, shared content schema, or new dependencies. Covers R5, R9–R11.
- **Readable article layout.** Use the existing typography, colour variables, focus styles, and approximately 800px reading width. Present one H1, a short introduction, simple in-page section links, and visible H2 sections. Keep substantive answers expanded. Covers R5, R10, R11.
- **Native links.** Use `Link` for internal routes and anchors for section jumps and official sites. Preserve right alignment and use `<bdi dir="ltr">` around numeric ranges, dates, and mixed-direction score notation. Covers R7, R10, R11.
- **No exam-date duplication.** Explain the reform's effective date, but link to `/psychometric-dates` for the live schedule and registration deadlines rather than copying its calendar. Covers R1, R2, R4.
- **Metadata follows existing public pages.** Export a Hebrew title, description, canonical URL from `absoluteUrl`, Open Graph fields, and Twitter summary metadata using `SITE_NAME`. Use the stable `/psychometric-two-domain` route; no redirect is needed. No additional structured-data framework is needed for this issue. Covers R9.
- **Source authority stays explicit.** Use NITE for the exam explanation and institutional sites only for their own admission guidance. Link to the latest destination without reproducing an institution-specific rule comparison. Covers R4, R6, R7.
- **Include one `llms.txt` entry.** Describe the guide as an explanation based on NITE, not an official exam authority. Insert it before the calculator bullet so that the existing calculator placement contract remains intact. Update the document's real editorial date and its existing assertions.

### Page Composition and Content Work

The proposed H1 is `פסיכומטרי דו־תחומי: מה משתנה ומה זה אומר עבורכם`.
Use these reading sections, with stable ASCII anchor IDs:

| Section | Anchor | Content to draft and verify |
| --- | --- | --- |
| מה משתנה בבחינה? | `changes` | Effective date, exam structure, duration, and the separation of English |
| איך מחושב הציון? | `scores` | General and emphasis scores, their different purposes, and any helpful sourced example |
| ניגשים בפעם הראשונה? | `first-exam` | Official preparation, exam registration, and separate English registration where needed |
| כבר יש לכם ציון? | `existing-scores` | Validity, personal-area access, previous English scores, and the distinction between two-domain and emphasis scores |
| איך השינוי משפיע על הקבלה ללימודים? | `admissions` | What to check for the programme and intake year: accepted score, English threshold/classification, and submission deadlines |
| שאלות נפוצות | `questions` | Remaining common situations, without repeating entire earlier answers |

Keep sources near the claims they support.
Add a single truthful content-review date associated with the sources; change it only when the content is reviewed, never on every build.
Examples should explain a distinction or action. Do not invent a conversion from a 50–150 domain score to a 200–800 general score or imply that a weighting example is an admission prediction.
Write the final Hebrew after checking the sources, then read it as a prospective student at both target widths.

### Source and Destination Plan

- Exam overview: [NITE two-domain exam](https://www.nite.org.il/two-domain-psychometric-entrance-test/).
- Current reform facts: [NITE October announcement](https://www.nite.org.il/news/notice-081026/).
- Score validity, prior candidates, English, registration, and scoring distinctions: [NITE FAQ](https://www.nite.org.il/two-domain-psychometric-entrance-test/faqs/).
- Registration, preparation, personal area, and Amirnet: follow the corresponding official links from those NITE pages and verify each final destination while drafting. Use ordinary public links; no account access or submission is needed.
- Admissions section: include a small, explicitly illustrative set of official policy links, initially [TAU's reform guidance](https://go.tau.ac.il/he/Psychometric-english) and [HUJI's psychometric admissions page](https://info.huji.ac.il/node/475), alongside `/institutions` for finding other institutions. These are links to check the institution's policy, not a claim of comprehensive coverage or new-format readiness.

The TAU page inspected during planning still described future score availability, while the newer NITE announcement says previous scores are available.
Use current NITE guidance for that exam fact; do not copy older institutional summaries into the guide.
Recheck the institution destinations during drafting, including their applicable academic year. If a destination is no longer useful, use that institution's current official admissions entry page and label it accordingly.
Missing evidence for a required answer remains unfinished content work under R7, not permission to invent an answer.

### Files to Change

| File | Planned change |
| --- | --- |
| `src/app/psychometric-two-domain/page.tsx` | New authored guide, section anchors, source links, and metadata |
| `src/app/psychometric-two-domain/page.module.css` | Article spacing, typography, RTL alignment, numeric isolation, mobile wrapping, and keyboard focus |
| `src/app/psychometric-dates/page.tsx` | Add one contextual link immediately after the visible reform note, outside the reused `ReformNote` component so it appears once |
| `src/app/sekhem-calculator/page.tsx` | Add one contextual guide link after the explanatory FAQ, outside the calculator form and outside the FAQ answer strings used by JSON-LD |
| `src/app/sitemap.ts` | Add the route after `/psychometric-dates` and set a stable authored modification date |
| `public/llms.txt` | Add the guide entry before the calculator bullet and update the editorial date |
| `src/lib/seo/seo.test.ts` | Update existing sitemap order/count and `llms.txt` date assertions; retain the existing calculator and official-authority contracts |

The current sitemap test expects 404 URLs; this addition makes 405 against the inspected baseline. Reconcile against fresh `main` rather than overwriting intervening additions.
No changes are planned for shared navigation, the lead form, calculator inputs, formulas, authentication, database data, or CI workflows.

---

## Implementation Units

### U1. Prepare the isolated branch and source-backed content

After implementation approval, refresh `main` and create one isolated worktree/branch for #380, preserving unrelated local work.
Copy this plan into that worktree, install its pinned dependencies, and read its applicable instructions and installed Next.js guides.
Draft the Hebrew sections and verify their official sources and link destinations according to R1–R8.
Finish the required source coverage before considering the page ready.

### U2. Build the guide and add discovery links

Implement the article and local CSS following the decisions above, then add the two inbound links, sitemap entry, and `llms.txt` entry.
Use a wrapping section-link list and normal document flow; the article needs no sticky navigation, animations, tabs, or score-entry controls.
Preserve the existing psychometric-dates CTA and calculator behaviour.
Update the existing SEO assertions to reflect intentional changes.

### U3. Verify the page and prepare the handoff

Run the focused checks below, fix observed regressions, and read the visible Hebrew copy on mobile and desktop.
Capture screenshots at 390px and 1280px and provide the preview URL when a deployment is available and authorised.
Use the existing CI/preview workflows for any later PR; no new workflow or speculative review stage is part of this plan.

At planning time PR #385 was still open. Recheck before opening a PR for #380 and follow the one-PR-at-a-time rule; do not close another PR or infer an exception from implementation approval.

---

## Verification Contract

### Focused Local Checks

Run these in the new worktree after implementation, not in the unrelated checkout:

```sh
npm run typecheck
npx eslint src/app/psychometric-two-domain/page.tsx src/app/psychometric-dates/page.tsx src/app/sekhem-calculator/page.tsx src/app/sitemap.ts src/lib/seo/seo.test.ts
npx prettier --check src/app/psychometric-two-domain/page.tsx src/app/psychometric-two-domain/page.module.css src/app/psychometric-dates/page.tsx src/app/sekhem-calculator/page.tsx src/app/sitemap.ts src/lib/seo/seo.test.ts
npx vitest run src/lib/seo/seo.test.ts src/app/psychometric-dates/page.test.tsx src/app/sekhem-calculator/page.test.tsx
CATALOGUE_SOURCE_MODE=static npm run build
CATALOGUE_SOURCE_MODE=static npx playwright test e2e/psychometric-dates.spec.ts e2e/indexing-hygiene.spec.ts --project=chromium
```

Static catalogue mode is for local checks of existing adjacent pages, not a change to production behaviour.
Use the existing page and SEO suites without adding brittle tests that duplicate the article's wording.
The new page's content, links, metadata, keyboard behaviour, and layout are covered by the direct browser checks below.
Existing required CI checks remain required, including the full test and Playwright suites already configured by the repository.
Before an authorised push/PR, run `npm run guard:pre-pr` and honour the existing hooks; the change touches the calculator page even though its calculation logic is unchanged.

### Practical Browser Checks

1. Open `/psychometric-dates`, find the visible reform note, and follow the new guide link. Expect one contextual guide link and the existing calendar and calculator CTA to remain usable.
2. Open `/sekhem-calculator`, scroll below its FAQ, and follow the guide link. Expect the calculator form and existing FAQ to remain intact.
3. At 390px and 1280px, open `/psychometric-two-domain` directly. Expect an HTTP 200 page with one H1, all substantive sections visible in the document, RTL right alignment, correctly ordered ranges, and no horizontal overflow.
4. Use the section links with mouse and keyboard. Expect each link to reach its corresponding heading with visible focus and readable content below the shared header.
5. Follow AE1–AE4, opening the official registration, score, English, and institution-policy destinations. Confirm the destination matches its label; do not submit a registration or sign in.
6. Check the server-delivered HTML and metadata: the article text is present before client interaction, the canonical is `https://findmyway.co.il/psychometric-two-domain`, and the title/description are specific to this guide.
7. Check `/sitemap.xml` and `/llms.txt` for the guide URL. The sitemap entry uses the actual editorial date and does not change between identical requests.
8. Read the visible Hebrew and save full-page screenshots at both widths for Amit before merge. Check touched adjacent pages at those widths as well.

Vercel previews may intentionally carry deployment-level `noindex` headers; distinguish those from the page's production metadata when checking indexability.
Verify the deployment belongs to the `toar-academic-guide` project and the implementation commit. If protected-preview access is unavailable, report that limit and retain local browser evidence without claiming the preview was tested.

---

## Definition of Done

- R1–R12 and AE1–AE5 are satisfied with complete official-source coverage for the published explanations.
- All planned local checks and applicable existing CI checks pass, with observed failures resolved or clearly reported.
- Desktop/mobile screenshots and practical verification results are available for Amit.
- The diff contains only the guide, its discovery links, required SEO assertion updates, and this plan.
- No calculator or profile behaviour has changed, and no institution comparison is implied.
- Implementation approval, PR readiness, merge, and deployment are reported separately; completion of this plan authorises none of those actions by itself.
