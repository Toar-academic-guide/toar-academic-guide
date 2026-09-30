# Way UI

The approved assessment introduction is the visual baseline for every Way route.
It uses the Rescale-inspired white/blue background, complete transparent artwork,
translucent white surfaces, soft borders, Hebrew typography, and blue/lilac actions.

## Page Structure

- Wrap each page or active workflow screen in exactly one `WayPageShell`.
- The shell owns `PublicNavBar`, page background, and abstract artwork. Do not add
  another navbar, page gradient, large standalone Way logo, or decorative layer.
- Workflow pages can pass a navigation element to retain their existing callbacks.
- The default content offset is `pt-28`. A custom `contentClassName` must retain
  enough clearance for the fixed navbar. Narrow screens also reserve an artwork
  band inside the shell; do not cancel that space with negative margins.
- Keep domain data, validation, calculations, and authentication separate from
  presentation. Do not use mock data to hide an unavailable backend.

```tsx
import WayPageShell from '@/components/WayPageShell';

export default function ExamplePage() {
  return (
    <WayPageShell>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Page content */}
      </main>
    </WayPageShell>
  );
}
```

## Shared Styles

- Use the `--way-*`, `--text-*`, and `--border` tokens in `src/app/globals.css`.
- Use `way-surface` for genuinely framed forms/tools, not every page section.
- Use `way-button-primary` and `way-button-secondary` for commands, with explicit
  padding and disabled states. Do not combine them with conflicting text colors.
- Preserve semantic success, warning, and error colors. Selected choices must be
  visibly distinct and expose their state with native inputs or ARIA.
- Keep RTL text direction, zero letter spacing, Lucide icons, visible keyboard
  focus, and readable mobile line wrapping.

## Artwork

- Use `/rescale-sculpture.webp` and `/rescale-crystal.webp` through the shell.
- `WayBackdrop` repeats those assets in six sizes/rotations. It owns one scroll
  subscription and spring; bounded transforms follow scroll position instead of
  running a continuous idle animation. Do not add page-specific scroll handlers.
- Desktop artwork stays in the outer gutters. Below 1440px, it lives in reserved
  top/bottom bands with gentler travel, keeping narrow forms and text unobscured.
- Keep intrinsic aspect ratios and `object-fit: contain`. Never clip, stretch,
  cover-crop, or place content over the objects. Allow room for animated bounds.
- Do not reintroduce the old clipped `way-abstract-glass-blob.png` artwork.
- Approved assessment bubbles use the local blue/lilac Rescale surface textures.
- Asset provenance is recorded in `public/rescale-assets.md`.
- Respect reduced-motion preferences; decoration must not intercept interaction
  or appear as meaningful content to a screen reader.
- Reduced motion responds to live preference changes and unmounts scroll-driven
  artwork. Keep this static fallback for server rendering and missing media APIs.

## Verification

- Check 320px, 390px, tablet, narrow desktop, and wide desktop layouts.
- Inspect actual screenshots, not just document overflow: fixed controls can be
  clipped even when the document reports no horizontal overflow.
- Confirm one navbar/backdrop, loaded and complete artwork, legible content,
  accessible mobile navigation, and working primary/selected/disabled states.
- Run `npm run typecheck` and relevant tests. For changes to the shared shell,
  inspect public, authentication, detail, and workflow pages and run `npm test`.
- Keep evidence and any verification limitations in `design-qa.md`.
