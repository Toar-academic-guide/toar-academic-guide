import { SITE_URL } from '@/lib/site';

const destinations = {
  calc: '/app/calculator',
  inst: '/institutions',
  sekhem: '/sekhem-calculator',
  twodomain: '/psychometric-two-domain',
  nopsy: '/without-psychometric',
  home: '/',
} as const;

const channels = {
  fbg: { source: 'facebook', medium: 'group' },
  fbp: { source: 'facebook', medium: 'page' },
  x: { source: 'x', medium: 'reply' },
  tt: { source: 'tiktok', medium: 'social' },
  ig: { source: 'instagram', medium: 'social' },
} as const;

function reviewedDestination(
  destination: keyof typeof destinations,
  channel: keyof typeof channels,
): string {
  const url = new URL(destinations[destination], SITE_URL);
  url.searchParams.set('utm_source', channels[channel].source);
  url.searchParams.set('utm_medium', channels[channel].medium);
  url.searchParams.set('utm_campaign', 'higher_ed');
  return url.toString();
}

export const SOCIAL_SHORT_LINKS = {
  'retake-x':
    'https://findmyway.co.il/app/calculator?utm_source=x&utm_medium=reply&utm_campaign=higher_ed&utm_content=before_retake_20261107',
  'fbg-calc': reviewedDestination('calc', 'fbg'),
  'fbg-inst': reviewedDestination('inst', 'fbg'),
  'fbg-sekhem': reviewedDestination('sekhem', 'fbg'),
  'fbg-twodomain': reviewedDestination('twodomain', 'fbg'),
  'fbg-nopsy': reviewedDestination('nopsy', 'fbg'),
  'fbg-home': reviewedDestination('home', 'fbg'),
  'fbp-calc': reviewedDestination('calc', 'fbp'),
  'fbp-inst': reviewedDestination('inst', 'fbp'),
  'fbp-sekhem': reviewedDestination('sekhem', 'fbp'),
  'fbp-twodomain': reviewedDestination('twodomain', 'fbp'),
  'fbp-nopsy': reviewedDestination('nopsy', 'fbp'),
  'fbp-home': reviewedDestination('home', 'fbp'),
  'x-calc': reviewedDestination('calc', 'x'),
  'x-inst': reviewedDestination('inst', 'x'),
  'x-sekhem': reviewedDestination('sekhem', 'x'),
  'x-twodomain': reviewedDestination('twodomain', 'x'),
  'x-nopsy': reviewedDestination('nopsy', 'x'),
  'x-home': reviewedDestination('home', 'x'),
  'tt-calc': reviewedDestination('calc', 'tt'),
  'tt-inst': reviewedDestination('inst', 'tt'),
  'tt-sekhem': reviewedDestination('sekhem', 'tt'),
  'tt-twodomain': reviewedDestination('twodomain', 'tt'),
  'tt-nopsy': reviewedDestination('nopsy', 'tt'),
  'tt-home': reviewedDestination('home', 'tt'),
  'ig-calc': reviewedDestination('calc', 'ig'),
  'ig-inst': reviewedDestination('inst', 'ig'),
  'ig-sekhem': reviewedDestination('sekhem', 'ig'),
  'ig-twodomain': reviewedDestination('twodomain', 'ig'),
  'ig-nopsy': reviewedDestination('nopsy', 'ig'),
  'ig-home': reviewedDestination('home', 'ig'),
} as const satisfies Record<string, string>;

// Add a key here only after the group and its campaign name have been reviewed.
const REVIEWED_FACEBOOK_GROUPS: ReadonlySet<string> = new Set();

const SOCIAL_SHORT_LINK_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CANONICAL_ORIGIN = new URL(SITE_URL).origin;

export function isValidSocialShortLinkSlug(slug: string): boolean {
  return SOCIAL_SHORT_LINK_SLUG.test(slug);
}

export function isValidSocialShortLinkTarget(target: string): boolean {
  if (
    !target ||
    target.trim() !== target ||
    target.includes('\\') ||
    [...target].some((character) => character.charCodeAt(0) <= 0x20)
  ) {
    return false;
  }

  try {
    const destination = new URL(target);
    const authorityStart = target.indexOf('://') + 3;
    const pathStart = target.indexOf('/', authorityStart);
    const authority = target.slice(authorityStart, pathStart === -1 ? target.length : pathStart);
    const rawPath = (pathStart === -1 ? '/' : target.slice(pathStart)).split(/[?#]/, 1)[0];

    return (
      destination.protocol === 'https:' &&
      destination.origin === CANONICAL_ORIGIN &&
      !authority.includes('@') &&
      !destination.hash &&
      !/%/i.test(rawPath) &&
      !/(?:^|\/)\.{1,2}(?:\/|$)/.test(rawPath) &&
      !/^\/go(?:\/|$)/i.test(destination.pathname)
    );
  } catch {
    return false;
  }
}

for (const [slug, destination] of Object.entries(SOCIAL_SHORT_LINKS)) {
  if (!isValidSocialShortLinkSlug(slug) || !isValidSocialShortLinkTarget(destination)) {
    throw new Error(`Invalid social short-link mapping: ${slug}`);
  }
}

export function getSocialShortLinkDestination(slug: string): string | null {
  if (!isValidSocialShortLinkSlug(slug)) return null;
  if (Object.hasOwn(SOCIAL_SHORT_LINKS, slug)) {
    return SOCIAL_SHORT_LINKS[slug as keyof typeof SOCIAL_SHORT_LINKS];
  }

  return getReviewedFacebookGroupDestination(slug, REVIEWED_FACEBOOK_GROUPS);
}

export function getReviewedFacebookGroupDestination(
  slug: string,
  reviewedGroups: ReadonlySet<string>,
): string | null {
  const match = /^fbg-(calc|inst|sekhem|twodomain|nopsy|home)-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(
    slug,
  );
  if (!match || !reviewedGroups.has(match[2])) return null;

  const base = SOCIAL_SHORT_LINKS[`fbg-${match[1]}` as keyof typeof SOCIAL_SHORT_LINKS];
  if (!base) return null;
  const url = new URL(base);
  url.searchParams.set('utm_campaign', match[2]);
  return url.toString();
}
