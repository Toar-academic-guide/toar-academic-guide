// @vitest-environment jsdom

import type { CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JsonTestResults } from 'vitest/reporters';

const COOKIE_NAME = 'sb-kfxcdbjeidczltkrjazk-auth-token';
const DERIVED_CUSTOM_NAME = 'sb-auth-auth-token';
const EXPIRES_AT = 4102444800;
const cookieStore = vi.hoisted(() => ({
  values: new Map<string, string>(),
  writes: [] as { name: string; value: string; options: CookieOptions }[],
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => Array.from(cookieStore.values, ([name, value]) => ({ name, value })),
    set: (name: string, value: string, options: CookieOptions) => {
      cookieStore.writes.push({ name, value, options });
      if (options.maxAge === 0) cookieStore.values.delete(name);
      else cookieStore.values.set(name, value);
    },
  }),
}));

function makeSession(chunked: boolean, refreshed = false) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return {
    access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp: EXPIRES_AT, refreshed })}.fake-signature`,
    refresh_token: refreshed ? 'fake-rotated-refresh-token' : 'fake-refresh-token',
    token_type: 'bearer',
    expires_in: EXPIRES_AT - Math.floor(Date.now() / 1000),
    expires_at: EXPIRES_AT,
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      app_metadata: {},
      user_metadata: { padding: chunked ? 'x'.repeat(2800) : '' },
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

function sessionCookies(session: ReturnType<typeof makeSession>) {
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
  if (value.length <= 3180) return [{ name: COOKIE_NAME, value }];
  return [
    { name: `${COOKIE_NAME}.0`, value: value.slice(0, 3180) },
    { name: `${COOKIE_NAME}.1`, value: value.slice(3180) },
  ];
}

function expectedNames(chunked: boolean) {
  return chunked ? [`${COOKIE_NAME}.0`, `${COOKIE_NAME}.1`] : [COOKIE_NAME];
}

function expectNames(names: string[], chunked: boolean) {
  expect(names.sort()).toEqual(expectedNames(chunked));
  expect(names.some((name) => name.startsWith(DERIVED_CUSTOM_NAME))).toBe(false);
}

function expectOptions(options: CookieOptions, clearing = false) {
  expect(options).toEqual({
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: clearing ? 0 : 34560000,
  });
}

let client: SupabaseClient | null;

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');
  vi.stubGlobal('BroadcastChannel', undefined);
  cookieStore.values.clear();
  cookieStore.writes.length = 0;
  window.localStorage.clear();
  for (const cookie of document.cookie.split(';')) {
    document.cookie = `${cookie.split('=')[0].trim()}=; Max-Age=0; Path=/`;
  }
  client = null;
});

afterEach(async () => {
  await client?.auth.stopAutoRefresh();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe.each(['https://auth.findmyway.co.il', 'https://kfxcdbjeidczltkrjazk.supabase.co'])(
  'Supabase auth cookie on %s',
  (supabaseUrl) => {
    describe.each([false, true])('chunked=%s', (chunked) => {
      function stubAuth() {
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', supabaseUrl);
        const original = makeSession(chunked);
        const refreshed = makeSession(chunked, true);
        let rejectUser = false;
        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = new URL(String(input));
          expect(url.origin).toBe(supabaseUrl);
          if (url.pathname === '/auth/v1/user') {
            return Response.json(
              rejectUser
                ? { code: 'session_not_found', message: 'Fake session ended' }
                : original.user,
              {
                status: rejectUser ? 403 : 200,
                headers: { 'x-supabase-api-version': '2024-01-01' },
              },
            );
          }
          if (url.pathname === '/auth/v1/token') {
            expect(url.searchParams.get('grant_type')).toBe('refresh_token');
            expect(JSON.parse(String(init?.body))).toEqual({
              refresh_token: original.refresh_token,
            });
            return Response.json(refreshed);
          }
          if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
          throw new Error(`Unexpected auth request: ${url.pathname}`);
        });
        vi.stubGlobal('fetch', fetchMock);
        return {
          original,
          refreshed,
          fetchMock,
          rejectUser: () => {
            rejectUser = true;
          },
        };
      }

      it('browser reads, refreshes and clears the pinned cookie with unchanged options', async () => {
        // SSR's CommonJS singleton survives vi.resetModules(). Give each browser
        // case a fresh process while keeping the real package and production factory.
        if (process.env.MYWAY_AUTH_COOKIE_BROWSER_CASE !== '1') {
          const pattern = `${supabaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*chunked=${chunked}.*browser`;
          const tempDir = await mkdtemp(resolve(tmpdir(), 'auth-cookie-name-'));
          try {
            const reportPath = resolve(tempDir, 'report.json');
            await promisify(execFile)(
              process.execPath,
              [
                resolve('node_modules/vitest/vitest.mjs'),
                'run',
                'src/lib/supabase/authCookieName.test.ts',
                '--testNamePattern',
                pattern,
                '--coverage.enabled=false',
                '--reporter=json',
                `--outputFile=${reportPath}`,
              ],
              {
                env: {
                  ...process.env,
                  MYWAY_AUTH_COOKIE_BROWSER_CASE: '1',
                  NO_COLOR: '1',
                  FORCE_COLOR: '0',
                },
                timeout: 20000,
              },
            );
            const report: JsonTestResults = JSON.parse(await readFile(reportPath, 'utf8'));
            expect(report.success).toBe(true);
            expect(report.numPassedTests).toBe(1);
            expect(report.numFailedTests).toBe(0);
            const passedAssertions = report.testResults
              .flatMap((result) => result.assertionResults)
              .filter((assertion) => assertion.status === 'passed');
            expect(passedAssertions.map((assertion) => assertion.fullName)).toEqual([
              `Supabase auth cookie on ${supabaseUrl} chunked=${chunked} browser reads, refreshes and clears the pinned cookie with unchanged options`,
            ]);
          } finally {
            await rm(tempDir, { recursive: true, force: true });
          }
          return;
        }
        const { original, refreshed } = stubAuth();
        const initial = sessionCookies(original);
        expectNames(
          initial.map(({ name }) => name),
          chunked,
        );
        for (const { name, value } of initial) document.cookie = `${name}=${value}; Path=/`;
        const writes = vi.spyOn(document, 'cookie', 'set');
        const { createSupabaseBrowserClient } = await import('./client');
        client = createSupabaseBrowserClient();
        expect(client).not.toBeNull();
        const read = await client!.auth.getSession();
        expect(read.error).toBeNull();
        expect(read.data.session?.access_token).toBe(original.access_token);

        writes.mockClear();
        const refresh = await client!.auth.refreshSession();
        expect(refresh.error).toBeNull();
        expect(refresh.data.session?.access_token).toBe(refreshed.access_token);
        expectNames(
          writes.mock.calls.map(([value]) => value.split('=')[0]),
          chunked,
        );
        for (const [value] of writes.mock.calls) {
          expect(value.slice(value.indexOf(';'))).toBe('; Max-Age=34560000; Path=/; SameSite=Lax');
        }
        expect(document.cookie).toBe(
          sessionCookies(refreshed)
            .map(({ name, value }) => `${name}=${value}`)
            .join('; '),
        );

        writes.mockClear();
        expect((await client!.auth.signOut()).error).toBeNull();
        expectNames(
          writes.mock.calls.map(([value]) => value.split('=')[0]),
          chunked,
        );
        for (const [value] of writes.mock.calls) {
          expect(value.slice(value.indexOf('='))).toBe('=; Max-Age=0; Path=/; SameSite=Lax');
        }
        expect(document.cookie).toBe('');
      }, 30000);

      it('server reads, refreshes and clears the pinned cookie with unchanged options', async () => {
        const { original, refreshed } = stubAuth();
        for (const { name, value } of sessionCookies(original)) cookieStore.values.set(name, value);
        const { createSupabaseServerClient } = await import('./server');
        client = await createSupabaseServerClient();
        expect(client).not.toBeNull();
        const read = await client!.auth.getSession();
        expect(read.error).toBeNull();
        expect(read.data.session?.access_token).toBe(original.access_token);

        cookieStore.writes.length = 0;
        const refresh = await client!.auth.refreshSession();
        expect(refresh.error).toBeNull();
        expect(refresh.data.session?.access_token).toBe(refreshed.access_token);
        expectNames(
          cookieStore.writes.map(({ name }) => name),
          chunked,
        );
        for (const { options } of cookieStore.writes) expectOptions(options);
        expect(Array.from(cookieStore.values, ([name, value]) => ({ name, value }))).toEqual(
          sessionCookies(refreshed),
        );

        cookieStore.writes.length = 0;
        expect((await client!.auth.signOut()).error).toBeNull();
        expectNames(
          cookieStore.writes.map(({ name }) => name),
          chunked,
        );
        for (const { value, options } of cookieStore.writes) {
          expect(value).toBe('');
          expectOptions(options, true);
        }
        expect(cookieStore.values.size).toBe(0);
      });

      it('proxy reads, refreshes and clears the pinned request/response cookies', async () => {
        const { original, refreshed, fetchMock, rejectUser } = stubAuth();
        const { proxy } = await import('@/proxy');
        const requestFor = (session: typeof original) =>
          new NextRequest('https://findmyway.co.il/api/profile', {
            headers: {
              cookie: sessionCookies(session)
                .map(({ name, value }) => `${name}=${value}`)
                .join('; '),
            },
          });
        const read = await proxy(requestFor(original));
        expect(read.headers.get('x-middleware-next')).toBe('1');
        expect(read.cookies.getAll()).toEqual([]);
        expect(fetchMock).toHaveBeenCalledWith(
          `${supabaseUrl}/auth/v1/user`,
          expect.objectContaining({
            headers: expect.objectContaining({ Authorization: `Bearer ${original.access_token}` }),
          }),
        );

        const request = requestFor({ ...original, expires_at: 1 });
        const refresh = await proxy(request);
        expectNames(
          refresh.cookies.getAll().map(({ name }) => name),
          chunked,
        );
        expect(request.cookies.getAll()).toEqual(sessionCookies(refreshed));
        for (const { name, value, expires, ...options } of refresh.cookies.getAll()) {
          expect(value).toBe(
            sessionCookies(refreshed).find((cookie) => cookie.name === name)?.value,
          );
          expect(expires).toBeInstanceOf(Date);
          expectOptions(options);
        }
        expect(fetchMock).toHaveBeenCalledWith(
          `${supabaseUrl}/auth/v1/user`,
          expect.objectContaining({
            headers: expect.objectContaining({ Authorization: `Bearer ${refreshed.access_token}` }),
          }),
        );

        rejectUser();
        const clear = await proxy(requestFor(refreshed));
        expectNames(
          clear.cookies.getAll().map(({ name }) => name),
          chunked,
        );
        for (const { value, maxAge, path, sameSite } of clear.cookies.getAll()) {
          expect({ value, maxAge, path, sameSite }).toEqual({
            value: '',
            maxAge: 0,
            path: '/',
            sameSite: 'lax',
          });
        }
      });
    });
  },
);
