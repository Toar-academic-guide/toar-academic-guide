# Issue 369 handoff — 2026-11-08

## Delivered in this branch

- Added 25 current first-degree routes to the static catalogue: Achva 8, Beit Berl 12, David Yellin 5. Each has a sourced qualification, official link and scoped admission summary. Four broad imported placeholders remain addressable but are no longer listed.
- Connected every new programme to a subject page. Existing psychology, education and criminology subject pages now resolve the corresponding college route while retaining its source-accurate title.
- Recorded every route and official source in [the claim table](docs/admissions-verification/2026-11-08-four-colleges.md). The seed payload validates locally; production catalogue rows have **not** been written.

## Open evidence and product decisions

- **Schechter remains in the four-college objective.** Its current public offerings are M.A. Jewish studies and certificate programmes, with no B.A. found. Amit's choice between outbound-only presentation and internal postgraduate/certificate pages is pending. No undergraduate placeholder was invented. This work must be finished in the **same PR** after that decision.
- **Beit Berl AI + Education B.A.** The current first-degree index names the route and qualification, but its linked route URL redirects to the homepage. No route-specific entry conditions were found. The public record links to the index and says the conditions require college confirmation.
- **David Yellin Nonformal Education B.Ed.** Its programme page confirms a B.Ed. plus education-worker certificate in the secondary route, with a fourth year optional for a teaching certificate. Central B.Ed. conditions are described with their scope; additional route-specific conditions remain unconfirmed.
- David Yellin special education's main block and central prerequisites both state Bagrut average **95** for the standard route; a later exception paragraph says “below 92.” The student copy uses 95 and preserves the separate combined-score **540** and admissions-committee route without inferring an exception cutoff or formula.
- Current production database inventory has zero listed own programmes for the four canonical colleges and the two checked Monday aliases. This code PR does not itself publish rows to the production API. No production mutation was made.
- Current base still has generic calculator CTAs on college/programme pages. PR #417 addresses supported-only calculator CTAs and metadata; this branch does not copy that separate PR. Until its behavior lands, the visible CTA on the AI and nonformal pages should not be read as a supported eligibility calculation.

I asked Samuel for the two missing route sources on [issue #369](https://github.com/Toar-academic-guide/toar-academic-guide/issues/369#issuecomment-6723519775) and corrected the AI route-link status in a [follow-up](https://github.com/Toar-academic-guide/toar-academic-guide/issues/369#issuecomment-6723652127).

## Verification

- Focused Vitest: 26 catalogue-link tests, including all 25 new programme-to-subject paths, pass. The wider focused catalogue, institution and seed suite passed **79 tests** after the final mapping assertion.
- TypeScript `tsc --noEmit`: passed after the final mappings.
- `npm run db:seed:dry-run`: 215 institutions, 428 programmes, 495 relations and requirement versions, 1,324 source URLs, zero validation errors. This is a dry run, not a database write.
- Checked all 25 programme URLs live; 24 reach their intended pages, and the Beit Berl AI URL redirects. No claimed admissions formula was added.
- Browser: hosted production baseline at **1280 × 900** and **390 × 844** for all four institution pages; local **static-mode** preview at the same sizes for the three undergraduate institution pages, representative programme pages, and psychology/early-childhood hubs. Images are in `evidence-369/`. The hosted baseline has no listed programmes for Achva, Beit Berl or David Yellin. Local pages show 8, 12 and 5 respectively. Representative Hebrew and RTL copy was visually inspected on desktop and mobile. `agent-browser` was used because the host-native CUA browser was unavailable. No page errors were reported in this local browser run.
- Required `npm run guard:pre-pr` under Node 24 passed: **148 test files, 3,887 tests**. Four old count/thin-hub assertions were updated to reflect 25 added programmes, 17 new subject hubs, the now-linked education hub, and 444 canonical public URLs.

## Practical UI check

1. At 1280px and 390px, open `/institutions/achva`, `/institutions/beit_berl`, and `/institutions/david_yellin`. Expect 8, 12 and 5 specific programme links, including their degree qualifications; no broad placeholder cards.
2. Open Achva Psychology, Beit Berl Early Childhood, and David Yellin Early Childhood. Check the Hebrew admission summary, official link and qualification. Follow each subject link: Psychology should list Achva; Early Childhood should list Beit Berl and David Yellin.
3. Open Beit Berl AI + Education and David Yellin Nonformal Education. Expect their exact qualification and plainly incomplete route-specific admissions evidence. Do not interpret the generic calculator CTA as an admission result while PR #417 is pending.
4. Schechter should be revisited on the **same PR** after Amit's presentation decision; verify M.A./certificate qualifications and that undergraduate calculator copy is absent from any postgraduate route.
