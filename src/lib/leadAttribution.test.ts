// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearEnquiryOrigin,
  enquiryAttributionSchema,
  getEnquiryOrigin,
  recordEnquiryOrigin,
} from './leadAttribution';
import { getSessionAttribution } from './sessionAttribution';

describe('enquiry origin', () => {
  const key = 'myway_enquiry_origin_v1';
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/psychometric-dates?private=value#private');
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('');
  });
  afterEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('stores only the validated bare current path when navigating to enquiry', () => {
    recordEnquiryOrigin('/enquiry?program=psychometric-preparation');
    expect(sessionStorage.getItem(key)).toBe('/psychometric-dates');
    expect(getEnquiryOrigin()).toBe('/psychometric-dates');
    expect(getEnquiryOrigin()).toBe('/psychometric-dates');
  });

  it.each(['/not-a-page', '/enquiry-fake'])('does not turn unknown origin %s into /', (path) => {
    window.history.replaceState(null, '', path);
    recordEnquiryOrigin('/enquiry');
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(getEnquiryOrigin()).toBeUndefined();
  });

  it.each([
    '',
    '/not-a-page',
    '/enquiry-fake',
    'garbage',
    'https://evil.example/x',
    '//evil.example/x',
    '/\\evil.example/x',
    '{invalid',
  ])('ignores invalid stored origin %s', (value) => {
    sessionStorage.setItem(key, value);
    expect(getEnquiryOrigin()).toBeUndefined();
  });

  it.each(['/programs/cs?private=value', '/programs/cs#private', '/programs/cs?x=1#y'])(
    'reduces stored origin %s to the bare path',
    (value) => {
      sessionStorage.setItem(key, value);
      expect(getEnquiryOrigin()).toBe('/programs/cs');
    },
  );

  it('falls back to an allowlisted same-origin referrer without query or hash', () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(
      `${window.location.origin}/programs/cs?x=1#y`,
    );
    expect(getEnquiryOrigin()).toBe('/programs/cs');
  });

  it.each([
    '',
    'https://evil.example/programs/cs',
    '//evil.example/programs/cs',
    '/programs/cs',
    'http://localhost.evil.example/programs/cs',
    'http://localhost/not-a-page',
    'http://user:password@localhost/programs/cs',
  ])('ignores invalid referrer %s', (value) => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(value);
    expect(getEnquiryOrigin()).toBeUndefined();
  });

  it.each([
    '/about',
    '/enquiry-fake',
    'https://evil.example/enquiry',
    '//evil.example/enquiry',
    'http://[',
  ])('clears pending origin on a transition to %s', (destination) => {
    recordEnquiryOrigin('/enquiry');
    recordEnquiryOrigin(destination);
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('clears origin for a fresh document', () => {
    recordEnquiryOrigin('/enquiry');
    clearEnquiryOrigin();
    expect(getEnquiryOrigin()).toBeUndefined();
  });

  it.each(['getItem', 'setItem', 'removeItem'] as const)(
    'tolerates blocked storage %s',
    (method) => {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new Error('denied');
      });
      expect(() => recordEnquiryOrigin('/enquiry')).not.toThrow();
      expect(() => clearEnquiryOrigin()).not.toThrow();
      expect(() => getEnquiryOrigin()).not.toThrow();
    },
  );
});

describe('session first-touch attribution', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(
      null,
      '',
      '/?utm_source=tiktok&utm_medium=social&utm_campaign=fall_2026',
    );
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(
      'https://example.com/article?email=private@example.com#private',
    );
  });
  afterEach(() => window.history.replaceState(null, '', '/'));
  const firstTouch = {
    utm_source: 'tiktok',
    utm_medium: 'social',
    utm_campaign: 'fall_2026',
    referrer: 'https://example.com',
  };
  it('retains the first URL/referrer across internal navigation and module reloads', async () => {
    expect(getSessionAttribution()).toEqual(firstTouch);
    window.history.replaceState(null, '', '/enquiry?utm_source=facebook');
    vi.resetModules();
    expect((await import('./sessionAttribution')).getSessionAttribution()).toEqual(firstTouch);
    expect(JSON.stringify(sessionStorage)).not.toContain('private@example.com');
  });
  it('preserves a direct first touch instead of attributing later internal UTMs', () => {
    window.history.replaceState(null, '', '/');
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('');
    expect(getSessionAttribution()).toEqual({});
    window.history.replaceState(null, '', '/?utm_source=tiktok');
    expect(getSessionAttribution()).toEqual({});
  });
  it('keeps bounded UTM strings verbatim and drops oversized values before first touch', () => {
    window.history.replaceState(
      null,
      '',
      '/?utm_source=private%40example.com&utm_medium=0501234567&utm_campaign=' + 'x'.repeat(101),
    );
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(
      'https://example.com/private%40example.com?token=secret',
    );
    expect(getSessionAttribution()).toEqual({
      referrer: 'https://example.com',
      utm_source: 'private@example.com',
      utm_medium: '0501234567',
    });
  });
  it('does not break contact or overwrite memory attribution when sessionStorage is blocked', async () => {
    vi.resetModules();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const { getSessionAttribution: get } = await import('./sessionAttribution');
    expect(get()).toEqual(firstTouch);
    window.history.replaceState(null, '', '/?utm_source=facebook');
    expect(get()).toEqual(firstTouch);
  });
  it('does not replace malformed stored first touch with later navigation', () => {
    getSessionAttribution();
    sessionStorage.setItem(sessionStorage.key(0)!, '{invalid');
    window.history.replaceState(null, '', '/?utm_source=facebook');
    expect(getSessionAttribution()).toEqual({});
  });
  it('does not trust tampered session storage', () => {
    getSessionAttribution();
    const key = sessionStorage.key(0)!;
    sessionStorage.setItem(key, JSON.stringify({ utm_source: 'x'.repeat(101) }));
    expect(getSessionAttribution()).toEqual({});
  });
});

describe('attribution trust boundary', () => {
  it.each([
    '105.5',
    '680',
    'psy750',
    'bagrut-112',
    'paid search',
    'סתיו / 2026',
    'private@example.com',
    '050-123-4567',
  ])('keeps bounded UTM values without content filtering: %s', (value) => {
    expect(
      enquiryAttributionSchema.parse({
        utm_source: value,
        utm_medium: value,
        utm_campaign: value,
        unsupported: 'ignored',
      }),
    ).toEqual({ utm_source: value, utm_medium: value, utm_campaign: value });
  });
  it('strips referrer query and fragment before accepting it', () => {
    expect(
      enquiryAttributionSchema.parse({
        referrer: 'https://example.com/article?phone=0501234567#token',
      }),
    ).toEqual({ referrer: 'https://example.com' });
  });
  it.each([
    { utm_source: 'x'.repeat(101) },
    { utm_medium: 'x'.repeat(101) },
    { utm_campaign: 'x'.repeat(101) },
    { referrer: 'https://example.com/' + 'x'.repeat(2048) },
    { referrer: 'javascript:alert(1)' },
    { referrer: 'https://user:password@example.com/' },
    { referrer: 'https://127.0.0.1/private' },
  ])('rejects unsafe or oversized attribution: %j', (attribution) => {
    expect(enquiryAttributionSchema.safeParse(attribution).success).toBe(false);
  });
});

describe('referrer path minimization', () => {
  it.each([
    ['https://example.com/680?bagrut=105.5#750', 'https://example.com'],
    ['https://example.com/private%40example.com', 'https://example.com'],
    ['https://example.com/0501234567', 'https://example.com'],
    ['https://example.com/programs/cs?private=secret', 'https://example.com'],
    ['https://findmyway.co.il/680?bagrut=105.5#750', 'https://findmyway.co.il/'],
    [
      'https://findmyway.co.il/programs/cs?private=secret#score',
      'https://findmyway.co.il/programs/cs',
    ],
    ['https://findmyway.co.il/programs/680', 'https://findmyway.co.il/programs/680'],
    ['https://findmyway.co.il/app/calculator#score', 'https://findmyway.co.il/app/calculator'],
    ['https://findmyway.co.il.evil.example/680', 'https://findmyway.co.il.evil.example'],
    ['http://localhost/680', 'http://localhost/'],
    ['http://localhost/institutions/tau?score=750', 'http://localhost/institutions/tau'],
  ])('normalizes %s to %s without changing UTM handling', (referrer, expected) => {
    expect(enquiryAttributionSchema.parse({ referrer })).toEqual({ referrer: expected });
  });
});

it('guards same-deployment referrers on the server using the existing deployment origin', () => {
  vi.stubEnv('VERCEL_URL', 'toar-academic-guide-test.vercel.app');
  try {
    expect(
      enquiryAttributionSchema.parse({
        referrer: 'https://toar-academic-guide-test.vercel.app/680',
      }),
    ).toEqual({ referrer: 'https://toar-academic-guide-test.vercel.app/' });
    expect(
      enquiryAttributionSchema.parse({
        referrer: 'https://toar-academic-guide-test.vercel.app/programs/cs#score',
      }),
    ).toEqual({ referrer: 'https://toar-academic-guide-test.vercel.app/programs/cs' });
  } finally {
    vi.unstubAllEnvs();
  }
});
