import { SITE_URL } from '@/lib/site';

export const SOCIAL_SHORT_LINKS = {
  'retake-x':
    'https://findmyway.co.il/app/calculator?utm_source=x&utm_medium=reply&utm_campaign=higher_ed&utm_content=before_retake_20261107',
} as const satisfies Record<string, string>;

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
  if (!isValidSocialShortLinkSlug(slug) || !Object.hasOwn(SOCIAL_SHORT_LINKS, slug)) return null;

  return SOCIAL_SHORT_LINKS[slug as keyof typeof SOCIAL_SHORT_LINKS];
}
