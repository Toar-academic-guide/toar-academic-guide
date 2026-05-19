'use client';

import { INSTITUTION_BY_NAME, type InstitutionRecord } from '@/data/institutions';

/**
 * Renders a square institution logo tile.
 *
 * Logo resolution order:
 *   1. `record.logoUrl`  — explicit Wikimedia CDN SVG  (highest quality)
 *   2. `record.domain`   — Google favicon proxy at 64 px
 *   3. First-letter avatar — stable hue derived from institution name
 *
 * Two call patterns are supported:
 *   a) Caller pre-resolved the record via INSTITUTION_BY_NAME or INSTITUTION_BY_ID:
 *        <InstitutionLogo institution={p.institution} record={instRecord} />
 *      → fastest path: skips the internal dict lookup entirely.
 *
 *   b) Name-only (legacy / convenience):
 *        <InstitutionLogo institution={p.institution} />
 *      → performs INSTITUTION_BY_NAME[institution] internally.
 */

/** Derives a stable HSL hue (0–359) from an arbitrary string. */
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
  // Prefer the caller-supplied record; fall back to INSTITUTION_BY_NAME lookup.
  const record = recordProp ?? INSTITUTION_BY_NAME[institution];

  // Resolve the image src: logoUrl (SVG) > favicon proxy > null (avatar fallback)
  const src =
    record?.logoUrl ??
    (record?.domain
      ? `https://www.google.com/s2/favicons?domain=${record.domain}&sz=64`
      : null);

  const dim      = size === 'sm' ? 'h-8 w-8'   : 'h-10 w-10';
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-[13px]';

  // First letter of the display name — Hebrew institutions read right-to-left
  // but charAt(0) still returns the leftmost Unicode scalar, which is the first
  // character of the romanised / Hebrew string and works as a visual anchor.
  const displayName = record?.name ?? institution;
  const firstLetter = [...displayName][0] ?? '?';
  const hue         = nameToHue(displayName);
  const avatarStyle = {
    backgroundColor: `hsl(${hue} 55% 88%)`,
    color:           `hsl(${hue} 45% 32%)`,
  };

  return (
    <div
      className={`relative flex ${dim} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100`}
      style={avatarStyle}
    >
      {/* First-letter avatar — always rendered beneath the img layer */}
      <span className={`select-none font-semibold leading-none ${textSize}`}>
        {firstLetter}
      </span>

      {src && (
        <img
          src={src}
          alt={displayName}
          className="absolute inset-0 h-full w-full object-contain bg-white p-1.5"
          onError={(e) => {
            // Hide broken img; the letter avatar underneath becomes visible.
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}
