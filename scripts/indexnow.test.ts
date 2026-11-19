import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ENDPOINT,
  HOST,
  MAX_BATCH,
  MAX_URLS_PER_RUN,
  MIN_INTERVAL_MS,
  batches,
  changedUrls,
  isSubmittable,
  parseSitemap,
  runIndexNow,
  submit,
} from './indexnow';

const KEY = 'abcd1234-ef';
const apex = 'https://' + HOST;
const urlA = apex + '/about';
const urlB = apex + '/programs/engineering';
const dateA = '2026-10-25';
const dateB = '2026-10-24T02:43:11+03:00';
const xml = (entries: [string, string][]) =>
  '<urlset>' +
  entries
    .map(([url, lastmod]) => '<url><loc>' + url + '</loc><lastmod>' + lastmod + '</lastmod></url>')
    .join('') +
  '</urlset>';
const response = (body: string, status = 200, headers: HeadersInit = {}) =>
  new Response(body, { status, headers });

describe('sitemap change selection', () => {
  it('parses date-only and timezone lastmod into comparable ISO timestamps', () => {
    expect([
      ...parseSitemap(
        xml([
          [urlA, dateA],
          [urlB, dateB],
        ]),
      ),
    ]).toEqual([
      [urlA, '2026-10-25T00:00:00.000Z'],
      [urlB, '2026-10-23T23:43:11.000Z'],
    ]);
    expect(() => parseSitemap('<html>not a sitemap</html>')).toThrow();
  });

  it('sends only new or lastmod-changed sitemap URLs, sorted', () => {
    const old = new Map([
      [urlA, '2026-10-25T00:00:00.000Z'],
      [apex + '/removed', dateA],
    ]);
    const same = new Map([[urlA, '2026-10-25T00:00:00.000Z']]);
    expect(changedUrls(old, same)).toEqual([]);
    const next = new Map([
      [urlB, dateB],
      [urlA, '2026-11-14T00:00:00.000Z'],
    ]);
    expect(changedUrls(old, next)).toEqual([urlA, urlB]);
    expect(changedUrls(new Map(), next)).toEqual([urlA, urlB]);
  });
});

describe('live URL guard', () => {
  it.each([404, 410, 301, 308])('drops HTTP %i', (status) => {
    expect(isSubmittable(urlA, { status, headers: new Headers(), body: '<html></html>' })).toBe(
      false,
    );
  });

  it('drops off-host and noindex pages, and keeps an apex 200 page', () => {
    const page = { status: 200, headers: new Headers(), body: '<html><head></head></html>' };
    expect(isSubmittable(urlA, page)).toBe(true);
    expect(isSubmittable('https://www.findmyway.co.il/about', page)).toBe(false);
    expect(isSubmittable('https://findmyway.co.il.evil.test/about', page)).toBe(false);
    expect(
      isSubmittable(urlA, { ...page, headers: new Headers({ 'x-robots-tag': 'noindex, follow' }) }),
    ).toBe(false);
    expect(
      isSubmittable(urlA, { ...page, body: '<meta name="robots" content="noindex, follow">' }),
    ).toBe(false);
    expect(
      isSubmittable(urlA, { ...page, body: '<meta content="follow, noindex" name="robots">' }),
    ).toBe(false);
  });
});

describe('IndexNow POST', () => {
  it('splits the protocol maximum into bounded batches', () => {
    const parts = batches(Array.from({ length: MAX_BATCH + 1 }, (_, index) => index));
    expect(parts.map((part) => part.length)).toEqual([MAX_BATCH, 1]);
  });

  it.each([200, 202])(
    'accepts HTTP %i and sends the exact payload to the shared endpoint',
    async (status) => {
      const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => response('', status));
      expect(await submit([urlA, urlB], KEY, fetchMock)).toBe('ok');
      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0];
      if (!init) throw new Error('Missing POST options');
      expect(url).toBe(ENDPOINT);
      expect(init.method).toBe('POST');
      expect(init.redirect).toBe('manual');
      expect(init.headers).toEqual({ 'content-type': 'application/json; charset=utf-8' });
      expect(JSON.parse(String(init.body))).toEqual({
        host: HOST,
        key: KEY,
        keyLocation: apex + '/' + KEY + '.txt',
        urlList: [urlA, urlB],
      });
    },
  );

  it('honours Retry-After and retries 429 once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response('', 429, { 'retry-after': '5' }))
      .mockResolvedValueOnce(response('', 200));
    const waits: number[] = [];
    expect(
      await submit([urlA], KEY, fetchMock, async (ms) => {
        waits.push(ms);
      }),
    ).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(waits).toEqual([5_000]);
  });

  it('returns retry after three 5xx retries or network failures', async () => {
    const waits: number[] = [];
    const fetchMock = vi.fn(async () => response('', 503));
    expect(
      await submit([urlA], KEY, fetchMock, async (ms) => {
        waits.push(ms);
      }),
    ).toBe('retry');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(waits).toEqual([2_000, 8_000, 32_000]);
    const network = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await submit([urlA], KEY, network, async () => {})).toBe('retry');
    expect(network).toHaveBeenCalledTimes(4);
  });

  it.each([400, 403, 422])('treats HTTP %i as fatal without retry', async (status) => {
    const fetchMock = vi.fn(async () => response('', status));
    expect(await submit([urlA], KEY, fetchMock)).toBe('fatal');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe('run and successful snapshot', () => {
  let dir: string;
  let snapshotPath: string;
  const now = Date.parse('2026-11-14T10:00:00Z');
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'indexnow-test-'));
    snapshotPath = join(dir, '.indexnow', 'sitemap.json');
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('does no network or disk work without a key', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('must not fetch');
    });
    expect(await runIndexNow({ fetchImpl: fetchMock, snapshotPath, now })).toEqual({
      status: 'skipped',
      candidates: 0,
      dropped: 0,
      sent: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(readFile(snapshotPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('writes only successfully sent sitemap URLs, then skips inside the interval', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url === apex + '/sitemap.xml')
        return response(
          xml([
            [urlA, dateA],
            [urlB, dateB],
          ]),
        );
      if (url === apex + '/' + KEY + '.txt') return response(KEY);
      if (url === urlA) return response('<html><meta name="robots" content="noindex"></html>');
      if (url === urlB) return response('<html></html>');
      if (url === ENDPOINT) return response('', 202);
      throw new Error('Unexpected URL');
    });
    expect(await runIndexNow({ key: KEY, fetchImpl: fetchMock, snapshotPath, now })).toEqual({
      status: 'ok',
      candidates: 2,
      dropped: 1,
      sent: 1,
    });
    const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
    expect(snapshot).toEqual({
      submittedAt: '2026-11-14T10:00:00.000Z',
      urls: { [urlB]: '2026-10-23T23:43:11.000Z' },
    });
    for (const [url, init] of fetchMock.mock.calls) {
      if (url !== ENDPOINT) expect(init?.redirect).toBe('manual');
    }
    const calls = fetchMock.mock.calls.length;
    expect(
      await runIndexNow({
        key: KEY,
        fetchImpl: fetchMock,
        snapshotPath,
        now: now + MIN_INTERVAL_MS - 1,
      }),
    ).toMatchObject({ status: 'skipped' });
    expect(fetchMock).toHaveBeenCalledTimes(calls);
    // The dropped URL is still pending after the interval; it was never marked submitted.
    expect(
      await runIndexNow({
        key: KEY,
        fetchImpl: fetchMock,
        snapshotPath,
        now: now + MIN_INTERVAL_MS,
      }),
    ).toMatchObject({ candidates: 1, dropped: 1, sent: 0 });
  });

  it('does not submit or snapshot when key verification fails', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === apex + '/sitemap.xml' ? response(xml([[urlA, dateA]])) : response('wrong key'),
    );
    expect(await runIndexNow({ key: KEY, fetchImpl: fetchMock, snapshotPath, now })).toMatchObject({
      status: 'fatal',
      sent: 0,
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      apex + '/sitemap.xml',
      apex + '/' + KEY + '.txt',
    ]);
    await expect(readFile(snapshotPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not follow a redirected production sitemap', async () => {
    const fetchMock = vi.fn(async (_url: string) => response('', 308));
    expect(await runIndexNow({ key: KEY, fetchImpl: fetchMock, snapshotPath, now })).toMatchObject({
      status: 'fatal',
      sent: 0,
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(apex + '/sitemap.xml');
    await expect(readFile(snapshotPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('caps a large first sitemap at 2000 live-checked URLs per run', async () => {
    const entries: [string, string][] = Array.from({ length: MAX_URLS_PER_RUN + 1 }, (_, index) => [
      apex + '/page-' + String(index).padStart(4, '0'),
      dateA,
    ]);
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url === apex + '/sitemap.xml') return response(xml(entries));
      if (url === apex + '/' + KEY + '.txt') return response(KEY);
      if (url === ENDPOINT) return response('', 200);
      return response('<html></html>');
    });
    expect(await runIndexNow({ key: KEY, fetchImpl: fetchMock, snapshotPath, now })).toMatchObject({
      status: 'ok',
      candidates: MAX_URLS_PER_RUN + 1,
      sent: MAX_URLS_PER_RUN,
    });
    const post = fetchMock.mock.calls.find(([url]) => url === ENDPOINT);
    expect(post).toBeDefined();
    expect(JSON.parse(String(post?.[1]?.body)).urlList).toHaveLength(MAX_URLS_PER_RUN);
    expect(Object.keys(JSON.parse(await readFile(snapshotPath, 'utf8')).urls)).toHaveLength(
      MAX_URLS_PER_RUN,
    );
  });

  it.each([
    [403, 'fatal'],
    [503, 'retry'],
  ] as const)('does not snapshot if a later batch returns %i', async (failure, expected) => {
    let posts = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url === apex + '/sitemap.xml')
        return response(
          xml([
            [urlA, dateA],
            [urlB, dateB],
          ]),
        );
      if (url === apex + '/' + KEY + '.txt') return response(KEY);
      if (url === ENDPOINT) return response('', ++posts === 1 ? 200 : failure);
      return response('<html></html>');
    });
    expect(
      await runIndexNow({
        key: KEY,
        fetchImpl: fetchMock,
        snapshotPath,
        now,
        batchSize: 1,
        waitImpl: async () => {},
      }),
    ).toMatchObject({ status: expected, candidates: 2, sent: 2 });
    await expect(readFile(snapshotPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

it('keeps key values and root key files out of tracked files', () => {
  const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n');
  expect(
    files.filter(
      (file) =>
        /^public\/[^/]+\.txt$/.test(file) &&
        /^[A-Za-z0-9-]{8,128}\.txt$/.test(file.slice('public/'.length)),
    ),
  ).toEqual([]);
  const pattern = 'INDEXNOW_' + 'KEY=[A-Za-z0-9-]{8,128}';
  const grep = spawnSync('git', ['grep', '--cached', '-I', '-E', pattern], { encoding: 'utf8' });
  expect(grep.status).toBe(1);
});
