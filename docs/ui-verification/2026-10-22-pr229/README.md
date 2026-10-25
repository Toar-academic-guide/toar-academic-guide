# PR #229 browser evidence

Captured 22 October 2026 in the hosted `toar-academic-guide` preview using a real browser. Desktop viewport: 1440×900; mobile viewport: 390×844. Full-page images can exceed viewport height.

Implementation head: `356cf824911e08204ee4272de1322764303cd807`.

Preview: https://toar-academic-guide-git-fix-myw-91230b-amitm1630-6681s-projects.vercel.app

- `desktop-score.png`: final head, BGU Communication score 700 against 520, additional confirmations separate, Contact/Save first.
- `mobile-score.png`: same changed behavior on the earlier implementation preview before the main/SEO integration. Not a new final-head mobile run.
- `desktop-comparison.png`, `mobile-comparison.png`: two institution-specific cards, desktop columns/mobile stack, after comparison layout correction.
- `desktop-legacy.png`, `mobile-legacy.png`: Psychology institution cards after preserving populated institution-specific notes (`3098f69` preview).
- `desktop-public-requirements.png`, `mobile-public-requirements.png`: final head's public BGU Psychology page, compact simultaneous/alternative routes and closed additional-conditions disclosure.

Authenticated browser verification exercised saved-grade loading, a temporary Communication save, saved-list reload, and removal of that test save. The original saved list was restored; academic inputs were not edited. Contact opened the correct programme/institution form; no enquiry was submitted. An authenticated browser session is machine-local and is not transferred by these artifacts.

The final implementation head passed [CI](https://github.com/Toar-academic-guide/toar-academic-guide/actions/runs/39752869176) (1,749 tests passed, 65 skipped) and [preview Playwright](https://github.com/Toar-academic-guide/toar-academic-guide/actions/runs/39752981284) (24 passed, 2 skipped). Skips are not evidence of execution. Local production build and required pre-push guard passed; the guard ran 1,131 tests without bypass.

Requirements/data coverage and limitations: [follow-up audit](../../admissions-verification/2026-10-22-remaining-followup.md). This evidence is focused verification, not a claim that every button and every admission route was exercised on the final head. Historical `design-qa.md` refers to older work.
