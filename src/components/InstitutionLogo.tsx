'use client';

import { useState } from 'react';
import { INSTITUTION_BY_NAME, type InstitutionRecord } from '@/data/institutions';

/**
 * Renders a square institution logo tile.
 *
 * Logo resolution order:
 *   1. `record.logoUrl`  — explicit Wikimedia CDN SVG  (highest quality)
 *   2. `record.domain`   — Google favicon proxy at 64 px
 *   3. First-letter avatar — stable HSL hue derived from institution name
 *
 * Rendering strategy:
 *   - The component is EITHER an <img> OR a letter avatar — never both stacked.
 *   - `imgFailed` state tracks load errors so React re-renders to the avatar
 *     cleanly without any DOM mutation tricks.
 *   - Explicit `width`/`height` HTML attributes are set on every <img> so that
 *     SVGs without intrinsic dimensions (viewBox-only) always render at the
 *     correct pixel size instead of collapsing to 0×0.
 */

/** Stable HSL hue (0–359) derived from an arbitrary string. */
function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export default function InstitutionLogo({
  institution,
  record: recordProp,
  size = 'md',
}: {
  /** Hebrew institution name — used for the fallback lookup and as alt text */
  institution: string;
  /** Pre-resolved InstitutionRecord; when provided the internal lookup is skipped */
  record?: InstitutionRecord;
  /** 'sm' = 32 px  |  'md' = 40 px (default) */
  size?: 'sm' | 'md';
}) {
  const [imgFailed, setImgFailed] = useState(false);

  // Prefer the caller-supplied record; fall back to INSTITUTION_BY_NAME lookup.
  const record = recordProp ?? INSTITUTION_BY_NAME[institution];

  // Resolve image source: logoUrl (SVG) → favicon proxy → null (avatar fallback)
  const src =
    record?.logoUrl ??
    (record?.domain
      ? `https://www.google.com/s2/favicons?domain=${record.domain}&sz=64`
      : null);

  // Explicit pixel dimensions — used on both the container and the <img> tag.
  const dimPx    = size === 'sm' ? 32 : 40;
  const imgPx    = dimPx - 8;            // 4 px inset on each side
  const dimClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-[13px]';

  const displayName = record?.name ?? institution;
  const firstLetter = [...displayName][0] ?? '?';
  const hue         = nameToHue(displayName);

  // Only show the <img> if we have a src and it hasn't errored.
  const showImg = !!src && !imgFailed;

  return (
    <div
      className={`flex ${dimClass} shrink-0 items-center justify-center rounded-lg border border-slate-100`}
      style={
        showImg
          ? { background: '#ffffff' }
          : {
              backgroundColor: `hsl(${hue} 55% 88%)`,
              color:           `hsl(${hue} 45% 32%)`,
            }
      }
    >
      {showImg ? (
        <img
          src={src}
          alt={displayName}
          /* Explicit HTML attributes force SVG viewBox-only files to render at
             the correct pixel size. Without these, SVGs with no intrinsic
             width/height collapse to 0×0. */
          width={imgPx}
          height={imgPx}
          style={{
            width:     imgPx,
            height:    imgPx,
            objectFit: 'contain',
            display:   'block',
          }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span className={`select-none font-semibold leading-none ${textSize}`}>
          {firstLetter}
        </span>
      )}
    </div>
  );
}
