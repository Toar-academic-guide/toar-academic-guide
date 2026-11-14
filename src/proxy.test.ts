import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock('@/lib/supabase/env', () => ({
  SUPABASE_AUTH_COOKIE_NAME: 'sb-kfxcdbjeidczltkrjazk-auth-token',
  isSupabaseConfigured: true,
  getSupabaseEnv: () => ({
    supabaseUrl: 'https://example.supabase.co',
    supabasePublishableKey: 'test-publishable-key',
  }),
}));

import { proxy } from './proxy';

const RETAKE_DESTINATION =
  'https://findmyway.co.il/app/calculator?utm_source=x&utm_medium=reply&utm_campaign=higher_ed&utm_content=before_retake_20261107';

describe('calculator request middleware', () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('forwards public calculator requests even when session verification never completes', async () => {
    mocks.getUser.mockImplementation(() => new Promise(() => {}));
    const request = new NextRequest('https://example.com/api/admissions/evaluate', {
      method: 'POST',
      headers: { cookie: 'sb-test-auth-token=test-session' },
      body: JSON.stringify({ degreeId: 'tau_cs', psychometric: 730, bagrut: 115 }),
    });
    let forwarded = false;
    const response = proxy(request).then((result) => {
      forwarded = result.headers.get('x-middleware-next') === '1';
      return result;
    });

    await vi.advanceTimersByTimeAsync(100);
    expect(forwarded).toBe(true);
    await response;
    expect(await request.json()).toEqual({
      degreeId: 'tau_cs',
      psychometric: 730,
      bagrut: 115,
    });
  });

  it('continues checking the session for account endpoints', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await proxy(new NextRequest('https://example.com/api/profile'));
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('production Vercel alias', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('redirects the production alias permanently, preserving the path and exact query', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    const response = await proxy(
      new NextRequest('https://toar-academic-guide.vercel.app/programs/cs?x=a%20b&x=2'),
    );
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(
      'https://findmyway.co.il/programs/cs?x=a%20b&x=2',
    );
  });

  it.each([
    ['production', 'findmyway.co.il'],
    ['preview', 'toar-academic-guide-git-feature.vercel.app'],
    ['production', 'vercel.app.example.com'],
  ])('passes through %s on %s', async (environment, host) => {
    vi.stubEnv('VERCEL_ENV', environment);
    const response = await proxy(new NextRequest(`https://${host}/programs/cs`));
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('social short-link redirects', () => {
  it.each([
    ['fbg-calc', '/app/calculator?utm_source=facebook&utm_medium=group&utm_campaign=higher_ed'],
    ['fbp-inst', '/institutions?utm_source=facebook&utm_medium=page&utm_campaign=higher_ed'],
    ['x-sekhem', '/sekhem-calculator?utm_source=x&utm_medium=reply&utm_campaign=higher_ed'],
    [
      'tt-twodomain',
      '/psychometric-two-domain?utm_source=tiktok&utm_medium=social&utm_campaign=higher_ed',
    ],
    [
      'ig-nopsy',
      '/without-psychometric?utm_source=instagram&utm_medium=social&utm_campaign=higher_ed',
    ],
    ['fbg-home', '/?utm_source=facebook&utm_medium=group&utm_campaign=higher_ed'],
  ])('redirects reviewed %s with fixed UTM despite incoming query', async (slug, destination) => {
    const response = await proxy(
      new NextRequest(
        `https://evil.example/go/${slug}?url=https://evil.example&email=secret@example.com&utm_source=override`,
      ),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`https://findmyway.co.il${destination}`);
  });

  it('redirects the configured retake slug temporarily without caching or using request host/query', async () => {
    mocks.getUser.mockClear();
    const response = await proxy(
      new NextRequest(
        'https://attacker.example/go/retake-x?url=https%3A%2F%2Fevil.example&utm_source=override&utm_content=changed',
        { headers: { host: 'attacker.example', 'x-forwarded-host': 'evil.example' } },
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(RETAKE_DESTINATION);
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(response.headers.get('vercel-cdn-cache-control')).toBe('no-store');
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it.each([
    '/go',
    '/go/',
    '/go/missing',
    '/go/fbg-calc-psychstate',
    '/go/retake-x/extra',
    '/go/%252e%252e/retake-x',
    '/go/%2f%2fevil.example',
  ])('returns a non-cacheable 404 for unsupported path %s', async (path) => {
    const response = await proxy(new NextRequest(`https://findmyway.co.il${path}`));

    expect(response.status).toBe(404);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
  });

  it('does not redirect a traversal path normalized by the request URL parser', async () => {
    const response = await proxy(new NextRequest('https://findmyway.co.il/go/%2e%2e/retake-x'));

    expect(response.headers.get('location')).toBeNull();
  });

  it.each([
    ['/tt/', 'tiktok'],
    ['/ig/', 'instagram'],
    ['/fb/', 'facebook'],
    ['/wa/', 'whatsapp'],
  ])(
    'redirects trailing-slash %s with 307 and discards incoming parameters',
    async (path, source) => {
      for (const query of ['', '?utm_source=other&email=private%40example.com']) {
        mocks.getUser.mockClear();
        const response = await proxy(new NextRequest(`https://findmyway.co.il${path}${query}`));
        expect(response.status).toBe(307);
        expect(response.headers.get('location')).toBe(
          `https://findmyway.co.il/?utm_source=${source}`,
        );
        expect(mocks.getUser).not.toHaveBeenCalled();
      }
    },
  );

  it.each([
    ['/tt', 'tiktok'],
    ['/ig', 'instagram'],
    ['/fb', 'facebook'],
    ['/wa', 'whatsapp'],
  ])('redirects %s before auth, with only the channel source', async (path, source) => {
    mocks.getUser.mockClear();
    const response = await proxy(
      new NextRequest(
        `https://findmyway.co.il${path}?utm_source=other&email=private%40example.com`,
      ),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`https://findmyway.co.il/?utm_source=${source}`);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it('leaves longer paths alone', async () => {
    const response = await proxy(new NextRequest('https://findmyway.co.il/tt/more'));
    expect(response.headers.get('location')).toBeNull();
  });
});
