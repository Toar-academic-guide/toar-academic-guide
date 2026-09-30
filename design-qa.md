# Assessment Intro Visual QA

Date: 2026-09-16. Scope: replace clipped artwork and refine the four guidance bubbles.

## Evidence

- Visual reference: `C:/Users/Yonatan/AppData/Local/Temp/codex-clipboard-badfb7d4-5605-4f71-8d58-a3de4842242d.png` (1487 x 1058).
- Live artwork reference: https://rescale.framer.ai/.
- Desktop screenshot: `C:/Users/Yonatan/AppData/Local/Temp/way-intro-desktop.png`; viewport 1487 x 1058 CSS pixels.
- Mobile screenshot: `C:/Users/Yonatan/AppData/Local/Temp/way-intro-mobile.png`; viewport 390 x 844 CSS pixels, full-page capture.
- Reference and implementation were displayed together for comparison. Desktop viewport inspection was used for geometry; the full-page capture has browser scaling artifacts and is not a pixel-identical comparison.
- State: assessment introduction, latest approved copy, shared public navigation. The fourth success bubble and revised copy intentionally differ from the original mockup.

## Findings And Fixes

- Resolved P1: the old bitmap itself ended mid-object. Replaced it with the complete transparent Rescale sculpture. All outermost source pixels have alpha 0, verified programmatically.
- Resolved P2: the first replacement position was partially covered by the interests bubble. Moved the sculpture to unused space. Desktop and mobile screenshots confirm it is visible in full.
- Resolved P2: identical pale bubble surfaces. Added the source Rescale textures, distinct asymmetric contours, blue/cyan/lilac surfaces, and staggered positions.
- Resolved P2: secondary artwork behind the text card. Moved the small crystal above the card with room for animation.

## Fidelity Checks

- Typography: existing Hebrew font retained; readable bubble labels, no bold emphasis in body copy. Removed forced heading nowrap to allow narrow desktop layouts to wrap.
- Layout: broad right text panel and winding left path retained. No horizontal document overflow at the checked desktop and mobile sizes.
- Color: stronger blue/cyan/lilac source textures, translucent icon discs, restrained shadows. This intentionally follows the user's request for more Rescale color than the pale original mockup.
- Image quality: optimized local WebP artwork; source composition and transparency preserved. Both image elements loaded successfully and their animated bounds remained inside the desktop viewport.
- Content: latest title, paragraphs, success label, and left-pointing CTA preserved.
- Focused inspection: sculpture edges and bubble labels checked in desktop and mobile screenshots; source alpha-edge check separately verifies no baked-in crop.

## Verification

- `npm run typecheck`: passed.
- `git diff --check`: passed.
- Start CTA opens the academic-data step; back button restores the intro.
- Console: existing PostHog missing-token warning remains. A transient CSS-module error during the multi-file edit cleared after the file was added and the page reloaded.
- Formatter unavailable: the local Prettier package is not installed.
- Compound Engineering skills were not available in the installed skill locations; Product Design image-to-code and browser QA were used.

final result: passed

# Site-Wide UI Rollout

Date: 2026-09-16. Scope: extend the approved introduction design to every route
and workflow without changing catalogue, scoring, authentication, or persistence.

## Implementation

- `WayPageShell` now owns the shared page background, transparent artwork, and
  navigation. Public, auth, detail, developer, internal, and workflow screens use
  it, including loading, empty, and not-found states.
- Legacy page backgrounds, duplicate large logos, and old clipped artwork
  references were removed. Forms, primary/secondary actions, calculator progress,
  and result filters now use the shared palette.
- `PublicNavBar` provides the same sections at every breakpoint. Its mobile menu
  closes after navigation and restores focus to its toggle on Escape.
- Future-page conventions are recorded in `docs/ui-style-guide.md`.

## Visual Comparison

- Approved baseline: `C:/Users/Yonatan/AppData/Local/Temp/way-intro-desktop.png`.
- Final intro: `C:/Users/Yonatan/AppData/Local/Temp/way-site-intro-desktop-final.png`.
- Both were opened together at 1487 x 1058 to compare the same intro state.
  The approved layout, Hebrew copy, bubble textures, complete artwork, and
  left-pointing CTA are retained. The scrollbar accounts for the small difference
  in available content width; this is not a claim of pixel-identical rendering.
- Final landing: `C:/Users/Yonatan/AppData/Local/Temp/way-site-landing-desktop-final.png`.
- Mobile evidence: `way-site-about-mobile.png`, `way-site-institutions-mobile.png`,
  `way-site-login-mobile.png`, `way-site-intro-mobile-final.png`, and
  `way-site-results-320.png`, all in `C:/Users/Yonatan/AppData/Local/Temp/`.
- Desktop evidence includes `way-site-assessment-question-desktop.png`,
  `way-site-calculator-results-desktop.png`, and `way-site-intro-1920.png` in the
  same directory. Captures taken mid-entrance-animation were replaced by settled
  screenshots before comparison.

## Findings Resolved

- P2: mobile artwork overlapped the About heading. Narrow layouts now reserve an
  artwork band beneath the navbar; both complete images remain unobscured.
- P2: the start button exceeded the navbar at 320px despite no document overflow.
  Reduced mobile padding and toggle width; all visible header controls now stay
  within the viewport. Account controls remain accessible through the menu.
- P2: full-height questionnaire and old neon controls did not match the approved
  design. Added the shared framed tool surface and consistent selected/actions.
- P2: the mobile intro initially placed the entire bubble path before the text.
  The explanation is now first on narrow screens, retaining the desktop order.
- P2: duplicate back controls appeared on saved programs and calculator results.
  These screens now retain their existing contextual back action only.

## Verification

- `npm test`: 126 test files passed, 722 tests passed; one database integration
  test remains skipped. Tests include auth, catalogue, calculations, shared
  navigation, internal dashboards, and detail pages.
- `npm run typecheck`: passed after the final code changes.
- Desktop/mobile DOM checks confirmed one backdrop, loaded artwork, and no
  horizontal document overflow on About, institutions, institution/program detail,
  login/signup, profile, calculator, recommendations, saved programs, degree picker,
  assessment, quick filters, and study-location screens.
- Widths checked: 320, 390, 768, 1366, 1487, and 1920 CSS pixels. Image and visible
  navbar bounds were checked separately from document overflow.
- Interactions checked: mobile menu to institutions, landing CTA to introduction,
  assessment next/selected answer state, and quick calculator submission with
  synthetic scores 650/105 through its rendered results.
- The local environment has no configured sign-in; no authenticated session or
  admin authorization was bypassed. Protected data-health returns the styled 404;
  internal rendered components are covered by tests, not authenticated browser QA.
- The existing PostHog missing-token console error remains. No new rendering error
  was observed during the final UI checks. No deployment or backend change made.
- Prettier/ESLint packages are not installed locally, so those checks were not run.

final result: passed

# Scroll-Linked Artwork

Date: 2026-09-17. Scope: add more of the approved abstract objects to every shared
page background, with movement responding to upward and downward scrolling.

## Implementation

- Extracted `WayBackdrop` from `WayPageShell`. Six complete local Rescale objects
  now use varied sizes, rotation, and depth instead of two continuously floating
  images. Existing content, navigation, colors, and assets are unchanged.
- One Framer Motion document-scroll subscription and spring drive bounded
  translation/rotation. Motion values update styles without React scroll renders.
- Wide screens retain artwork in outer gutters. Below 1440px, reserved top and
  bottom bands keep complete silhouettes away from text and form controls, with
  35% of desktop translation. No artwork intercepts pointer events.
- Live reduced-motion preferences switch to static images without mounting the
  scroll subscription. Server rendering and unavailable media APIs are also static.
- Resolved a visual finding where the wide intro panel obscured parts of two
  objects: artwork stays above blank panel edges but beneath the navigation.

## Verification

- `npm test`: 127 test files passed, 726 tests passed, one database integration
  test skipped. Four new tests cover decorative images, scroll reversal, live
  preference changes/listener cleanup, and the no-media-API fallback.
- `npm run typecheck` and `git diff --check`: passed. Formatting/lint packages
  remain unavailable locally; no formatter or ESLint result is claimed.
- Browser checks: landing, About, institutions, login, questionnaire intro, and
  academic profile. One backdrop, six loaded images, and no horizontal overflow.
- Viewports checked: 320 x 800, 390 x 844, 768 x 1024, 1366 x 900,
  1487 x 1058, and 1920 x 1080. Screenshots inspected at top, middle, and bottom
  as appropriate. Mobile footer objects remain wholly inside the page bounds.
- Scrolling the landing page changed all six computed transforms. On About,
  scrolling down and back to zero restored every original transform exactly.
- Landing-to-intro-to-profile CTAs and the mobile navigation menu remain usable.
- Reduced-motion behavior is unit-tested; OS preference changes were not made
  through the browser. Existing local auth configuration limitations are unchanged.

## Evidence

Screenshots are in `C:/Users/Yonatan/AppData/Local/Temp/`:

- `way-parallax-top-desktop.png`, `way-parallax-scroll-desktop.png`
- `way-parallax-intro-desktop.png`, `way-parallax-intro-1366.png`,
  `way-parallax-intro-1920.png`
- `way-parallax-intro-320-top.png`, `way-parallax-intro-390-bottom.png`
- `way-parallax-catalogue-desktop.png`, `way-parallax-login-tablet.png`,
  `way-parallax-profile-320.png`

final result: passed
