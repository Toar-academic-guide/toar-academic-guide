import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export const ENDPOINT = 'https://api.indexnow.org/indexnow';
export const HOST = 'findmyway.co.il';
export const MAX_BATCH = 10_000;
export const MAX_URLS_PER_RUN = 2_000;
export const MIN_INTERVAL_MS = 10 * 60_000;

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
type Wait = (ms: number) => Promise<void>;
type Snapshot = { submittedAt: string; urls: Record<string, string> };
type Result = {
  status: 'ok' | 'retry' | 'fatal' | 'skipped';
  candidates: number;
  dropped: number;
  sent: number;
};

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function parseSitemap(xml: string): Map<string, string> {
  if (!/<urlset\b/i.test(xml) || !/<\/urlset>/i.test(xml)) {
    throw new Error('Invalid sitemap');
  }
  const result = new Map<string, string>();
  const rows = [...xml.matchAll(/<url(?:\s[^>]*)?>([\s\S]*?)<\/url>/gi)];
  if (rows.length === 0) throw new Error('Empty sitemap');
  for (const [, row] of rows) {
    const loc = row.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1];
    const lastmod = row.match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1]?.trim();
    if (
      !loc ||
      !lastmod ||
      !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(lastmod)
    ) {
      throw new Error('Incomplete sitemap entry');
    }
    const date = new Date(lastmod);
    if (Number.isNaN(date.getTime())) throw new Error('Invalid lastmod');
    const url = decodeXml(loc.trim());
    if (result.has(url)) throw new Error('Duplicate sitemap URL');
    result.set(url, date.toISOString());
  }
  return result;
}

export function changedUrls(prev: Map<string, string>, next: Map<string, string>): string[] {
  return [...next.entries()]
    .filter(([url, lastmod]) => prev.get(url) !== lastmod)
    .map(([url]) => url)
    .sort();
}

function isApexUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.origin === 'https://' + HOST && !parsed.username && !parsed.password && !parsed.hash
    );
  } catch {
    return false;
  }
}

function metaAttribute(tag: string, name: string): string {
  const match = tag.match(
    new RegExp('\\b' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'),
  );
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? '';
}

export function isSubmittable(
  url: string,
  res: { status: number; headers: Headers; body: string },
): boolean {
  if (
    !isApexUrl(url) ||
    res.status !== 200 ||
    /noindex/i.test(res.headers.get('x-robots-tag') ?? '')
  ) {
    return false;
  }
  return ![...res.body.matchAll(/<meta\b[^>]*>/gi)].some(
    ([tag]) =>
      metaAttribute(tag, 'name').toLowerCase() === 'robots' &&
      /noindex/i.test(metaAttribute(tag, 'content')),
  );
}

export function batches<T>(xs: T[], size = MAX_BATCH): T[][] {
  if (!Number.isInteger(size) || size < 1 || size > MAX_BATCH)
    throw new Error('Invalid batch size');
  const result: T[][] = [];
  for (let start = 0; start < xs.length; start += size) result.push(xs.slice(start, start + size));
  return result;
}

function retryDelay(response: Response | undefined, fallback: number, now: number): number {
  const header = response?.headers.get('retry-after');
  if (!header) return fallback;
  const seconds = Number(header);
  const suggested = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - now;
  return Number.isFinite(suggested) ? Math.max(fallback, suggested) : fallback;
}

export async function submit(
  urls: string[],
  key: string,
  fetchImpl: Fetch = fetch,
  waitImpl: Wait = (ms) => delay(ms),
): Promise<'ok' | 'retry' | 'fatal'> {
  const body = JSON.stringify({
    host: HOST,
    key,
    keyLocation: 'https://' + HOST + '/' + key + '.txt',
    urlList: urls,
  });
  const backoff = [2_000, 8_000, 32_000];
  for (let attempt = 0; attempt <= backoff.length; attempt++) {
    let response: Response | undefined;
    try {
      response = await fetchImpl(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // A network failure is retried like a 5xx response.
    }
    if (response?.status === 200 || response?.status === 202) return 'ok';
    if (response && response.status !== 429 && response.status < 500) return 'fatal';
    if (attempt === backoff.length) return 'retry';
    await waitImpl(retryDelay(response, backoff[attempt], Date.now()));
  }
  return 'retry';
}

async function readSnapshot(path: string): Promise<Snapshot | undefined> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
  const parsed: unknown = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('submittedAt' in parsed) ||
    typeof parsed.submittedAt !== 'string' ||
    Number.isNaN(Date.parse(parsed.submittedAt)) ||
    !('urls' in parsed) ||
    !parsed.urls ||
    typeof parsed.urls !== 'object' ||
    Array.isArray(parsed.urls) ||
    !Object.values(parsed.urls).every((value) => typeof value === 'string')
  ) {
    throw new Error('Invalid snapshot');
  }
  return parsed as Snapshot;
}

async function writeSnapshot(path: string, snapshot: Snapshot): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = path + '.' + process.pid + '.tmp';
  await writeFile(tempPath, JSON.stringify(snapshot), 'utf8');
  await rename(tempPath, path);
}

export async function runIndexNow(
  options: {
    key?: string;
    fetchImpl?: Fetch;
    waitImpl?: Wait;
    snapshotPath?: string;
    now?: number;
    batchSize?: number;
  } = {},
): Promise<Result> {
  const {
    key,
    fetchImpl = fetch,
    waitImpl,
    snapshotPath = '.indexnow/sitemap.json',
    now = Date.now(),
    batchSize = MAX_BATCH,
  } = options;
  const result = (status: Result['status'], candidates = 0, dropped = 0, sent = 0): Result => ({
    status,
    candidates,
    dropped,
    sent,
  });
  if (!key) return result('skipped');
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) return result('fatal');

  const previous = await readSnapshot(snapshotPath);
  if (previous && now - Date.parse(previous.submittedAt) < MIN_INTERVAL_MS)
    return result('skipped');

  let sitemapResponse: Response;
  try {
    sitemapResponse = await fetchImpl('https://' + HOST + '/sitemap.xml', {
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return result('retry');
  }
  if (sitemapResponse.status !== 200)
    return result(
      sitemapResponse.status >= 500 || sitemapResponse.status === 429 ? 'retry' : 'fatal',
    );
  let next: Map<string, string>;
  try {
    next = parseSitemap(await sitemapResponse.text());
  } catch {
    return result('fatal');
  }
  const previousUrls = new Map(Object.entries(previous?.urls ?? {}));
  const allCandidates = changedUrls(previousUrls, next);
  if (allCandidates.length === 0) return result('skipped');
  const candidates = allCandidates.slice(0, MAX_URLS_PER_RUN);

  try {
    const keyResponse = await fetchImpl('https://' + HOST + '/' + key + '.txt', {
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
    if (keyResponse.status !== 200 || (await keyResponse.text()) !== key) {
      return result('fatal', allCandidates.length);
    }
  } catch {
    return result('fatal', allCandidates.length);
  }

  const accepted: string[] = [];
  let dropped = 0;
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, candidates.length) }, async () => {
      while (cursor < candidates.length) {
        const url = candidates[cursor++];
        if (!isApexUrl(url)) {
          dropped++;
          continue;
        }
        try {
          const response = await fetchImpl(url, {
            redirect: 'manual',
            signal: AbortSignal.timeout(10_000),
          });
          if (
            isSubmittable(url, {
              status: response.status,
              headers: response.headers,
              body: await response.text(),
            })
          )
            accepted.push(url);
          else dropped++;
        } catch {
          dropped++;
        }
      }
    }),
  );
  accepted.sort();
  if (accepted.length === 0) return result('skipped', allCandidates.length, dropped);

  for (const batch of batches(accepted, batchSize)) {
    const status = await submit(batch, key, fetchImpl, waitImpl);
    if (status !== 'ok') return result(status, allCandidates.length, dropped, accepted.length);
  }

  // Unsent, capped or temporarily unavailable URLs remain eligible next run.
  const savedUrls = Object.fromEntries([...previousUrls].filter(([url]) => next.has(url)));
  for (const url of accepted) savedUrls[url] = next.get(url)!;
  await writeSnapshot(snapshotPath, { submittedAt: new Date(now).toISOString(), urls: savedUrls });
  return result('ok', allCandidates.length, dropped, accepted.length);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { status, candidates, dropped, sent } = await runIndexNow({
      key: process.env.INDEXNOW_KEY,
    });
    console.log(
      'IndexNow candidates=' +
        candidates +
        ' dropped=' +
        dropped +
        ' sent=' +
        sent +
        ' status=' +
        status,
    );
    if (status === 'retry') console.warn('::warning::IndexNow will retry on the next run');
    if (status === 'fatal') process.exitCode = 1;
  } catch {
    console.error('IndexNow failed before updating its snapshot');
    process.exitCode = 1;
  }
}
