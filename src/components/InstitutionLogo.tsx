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
 *   - The avatar fallback is always present.
 *   - External images are hidden until loaded, so users never see a broken-img glyph.
 *   - If an explicit logo fails, the component tries the favicon source next.
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
  domain,
  institution,
  logoUrl,
  record: recordProp,
  size = 'md',
}: {
  /** Root domain used for favicon fallback when no explicit record is available */
  domain?: string | null;
  /** Hebrew institution name — used for the fallback lookup and as alt text */
  institution: string;
  /** Explicit logo URL; highest priority when provided by a directory/data caller */
  logoUrl?: string | null;
  /** Pre-resolved InstitutionRecord; when provided the internal lookup is skipped */
  record?: InstitutionRecord;
  /** 'sm' = 32 px  |  'md' = 40 px (default) */
  size?: 'sm' | 'md';
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSources, setFailedSources] = useState<string[]>([]);

  // Prefer the caller-supplied record; fall back to INSTITUTION_BY_NAME lookup.
  const record = recordProp ?? INSTITUTION_BY_NAME[institution];

  const resolvedDomain = domain ?? record?.domain ?? null;
  const faviconUrl = resolvedDomain
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(resolvedDomain)}&sz=64`
    : null;
  const srcCandidates = [logoUrl, record?.logoUrl, faviconUrl].filter(
    (value): value is string =>
      typeof value === 'string' && value.length > 0 && !failedSources.includes(value),
  );
  const src = srcCandidates[0] ?? null;

  // Explicit pixel dimensions — used on both the container and the <img> tag.
  const dimPx = size === 'sm' ? 32 : 40;
  const imgPx = dimPx - 8; // 4 px inset on each side
  const dimClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-[13px]';

  const displayName = record?.name ?? institution;
  const firstLetter = [...displayName][0] ?? '?';
  const hue = nameToHue(displayName);

  const showImg = !!src && loadedSrc === src;

  return (
    <div
      className={`relative flex ${dimClass} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100`}
      style={{
        backgroundColor: showImg ? '#ffffff' : `hsl(${hue} 55% 88%)`,
        color: `hsl(${hue} 45% 32%)`,
      }}
    >
      <span
        className={`select-none font-semibold leading-none transition-opacity ${textSize}`}
        style={{ opacity: showImg ? 0 : 1 }}
      >
        {firstLetter}
      </span>
      {src ? (
        <img
          key={src}
          src={src}
          alt={displayName}
          /* Explicit HTML attributes force SVG viewBox-only files to render at
             the correct pixel size. Without these, SVGs with no intrinsic
             width/height collapse to 0×0. */
          width={imgPx}
          height={imgPx}
          style={{
            width: imgPx,
            height: imgPx,
            objectFit: 'contain',
            display: 'block',
            opacity: showImg ? 1 : 0,
            position: 'absolute',
          }}
          onLoad={() => setLoadedSrc(src)}
          onError={() => {
            setLoadedSrc((current) => (current === src ? null : current));
            setFailedSources((current) => (current.includes(src) ? current : [...current, src]));
          }}
        />
      ) : null}
    </div>
  );
}
