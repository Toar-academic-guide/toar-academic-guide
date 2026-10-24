// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enquiryAttributionSchema } from './leadAttribution';
import { getSessionAttribution } from './sessionAttribution';

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
    referrer: 'https://example.com/article',
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
  it('drops unsafe or oversized values before keeping the first touch', () => {
    window.history.replaceState(
      null,
      '',
      '/?utm_source=private%40example.com&utm_medium=0501234567&utm_campaign=' + 'x'.repeat(101),
    );
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(
      'https://example.com/private%40example.com?token=secret',
    );
    expect(getSessionAttribution()).toEqual({});
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
    sessionStorage.setItem(key, JSON.stringify({ utm_source: 'private@example.com' }));
    expect(getSessionAttribution()).toEqual({});
  });
});

describe('attribution trust boundary', () => {
  it('strips referrer query and fragment before accepting it', () => {
    expect(
      enquiryAttributionSchema.parse({
        referrer: 'https://example.com/article?phone=0501234567#token',
      }),
    ).toEqual({ referrer: 'https://example.com/article' });
  });
  it.each([
    { utm_source: 'x'.repeat(101) },
    { utm_medium: 'x'.repeat(101) },
    { utm_campaign: 'x'.repeat(101) },
    { referrer: 'https://example.com/' + 'x'.repeat(256) },
    { utm_source: 'private@example.com' },
    { utm_campaign: '050-123-4567' },
    { referrer: 'javascript:alert(1)' },
    { referrer: 'https://user:password@example.com/' },
    { referrer: 'https://example.com/private%40example.com' },
    { referrer: 'https://example.com/0501234567' },
    { referrer: 'https://127.0.0.1/private' },
    { email: 'private@example.com' },
  ])('rejects unsafe or oversized attribution: %j', (attribution) => {
    expect(enquiryAttributionSchema.safeParse(attribution).success).toBe(false);
  });
});
