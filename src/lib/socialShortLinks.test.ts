import { describe, expect, it } from 'vitest';

import {
  getSocialShortLinkDestination,
  getReviewedFacebookGroupDestination,
  isValidSocialShortLinkSlug,
  isValidSocialShortLinkTarget,
  SOCIAL_SHORT_LINKS,
} from './socialShortLinks';

describe('social short-link mappings', () => {
  it('includes the complete approved retake destination', () => {
    expect(getSocialShortLinkDestination('retake-x')).toBe(
      'https://findmyway.co.il/app/calculator?utm_source=x&utm_medium=reply&utm_campaign=higher_ed&utm_content=before_retake_20261107',
    );
  });

  it('maps all 30 reviewed channel and destination slugs to fixed canonical URLs', () => {
    const paths = {
      calc: '/app/calculator',
      inst: '/institutions',
      sekhem: '/sekhem-calculator',
      twodomain: '/psychometric-two-domain',
      nopsy: '/without-psychometric',
      home: '/',
    };
    const channels = {
      fbg: ['facebook', 'group'],
      fbp: ['facebook', 'page'],
      x: ['x', 'reply'],
      tt: ['tiktok', 'social'],
      ig: ['instagram', 'social'],
    };
    expect(Object.keys(SOCIAL_SHORT_LINKS)).toHaveLength(31);
    for (const [prefix, [source, medium]] of Object.entries(channels)) {
      for (const [suffix, path] of Object.entries(paths)) {
        const url = new URL(getSocialShortLinkDestination(`${prefix}-${suffix}`)!);
        expect(url.origin + url.pathname).toBe(`https://findmyway.co.il${path}`);
        expect(Object.fromEntries(url.searchParams)).toEqual({
          utm_source: source,
          utm_medium: medium,
          utm_campaign: 'higher_ed',
        });
      }
    }
  });

  it('resolves a reviewed Facebook group suffix only through its explicit allow-list', () => {
    const reviewed = new Set(['reviewed-group']);
    expect(getSocialShortLinkDestination('fbg-calc-reviewed-group')).toBeNull();
    expect(getReviewedFacebookGroupDestination('fbg-calc-reviewed-group', reviewed)).toBe(
      'https://findmyway.co.il/app/calculator?utm_source=facebook&utm_medium=group&utm_campaign=reviewed-group',
    );
    for (const slug of [
      'fbg-calc-unreviewed',
      'fbp-calc-reviewed-group',
      'fbg-calc-reviewed-group-extra',
    ]) {
      expect(getReviewedFacebookGroupDestination(slug, reviewed)).toBeNull();
    }
  });

  it('accepts readable lowercase slugs and rejects path-shaped keys', () => {
    expect(isValidSocialShortLinkSlug('retake-x')).toBe(true);
    for (const slug of ['', '../retake-x', 'retake/x', '%2e%2e', 'Retake-X']) {
      expect(isValidSocialShortLinkSlug(slug)).toBe(false);
    }
    expect(getSocialShortLinkDestination('toString')).toBeNull();
    expect(getSocialShortLinkDestination('missing')).toBeNull();
  });

  it.each([
    'https://example.com/app/calculator',
    '//example.com/app/calculator',
    'https://findmyway.co.il.evil.example/app/calculator',
    'https://findmyway.co.il@evil.example/app/calculator',
    'https://@findmyway.co.il/app/calculator',
    'https://user@findmyway.co.il/app/calculator',
    'javascript:alert(1)',
    'http://findmyway.co.il/app/calculator',
    'https:\\\\evil.example/app/calculator',
    'https://findmyway.co.il/app\\\\calculator',
    'https://findmyway.co.il/app/%2f%2fevil.example',
    'https://findmyway.co.il/app/%2e%2e/go/retake-x',
    'https://findmyway.co.il/go/retake-x',
    'https://findmyway.co.il/go',
  ])('rejects unsafe destination %s', (target) => {
    expect(isValidSocialShortLinkTarget(target)).toBe(false);
  });

  it('validates every configured mapping', () => {
    for (const [slug, destination] of Object.entries(SOCIAL_SHORT_LINKS)) {
      expect(isValidSocialShortLinkSlug(slug)).toBe(true);
      expect(isValidSocialShortLinkTarget(destination)).toBe(true);
    }
  });
});
