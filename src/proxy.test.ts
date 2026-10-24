import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock('@/lib/supabase/env', () => ({
  isSupabaseConfigured: true,
  getSupabaseEnv: () => ({
    supabaseUrl: 'https://example.supabase.co',
    supabasePublishableKey: 'test-publishable-key',
  }),
}));

import { proxy } from './proxy';

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
