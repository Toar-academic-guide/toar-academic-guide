import { withBoundedOfficialResponse } from '@/server/ingestion/boundedOfficialFetch';

const SOURCE_TTL_MS = 5 * 60_000;
export const OFFICIAL_SOURCE_TIMEOUT_MS = 5000;

interface StoredResponse {
  bytes: ArrayBuffer;
  headers: Headers;
  status: number;
  statusText: string;
}
interface Entry {
  expiresAt: number;
  pending: Promise<StoredResponse>;
}

// Separate injected fetchers cannot populate one another's caches. Only public,
// applicant-independent endpoints may enter this process-local cache.
let caches = new WeakMap<typeof fetch, Map<string, Entry>>();
export function resetSourceResponseCache() {
  caches = new WeakMap();
}

function cacheKey(input: RequestInfo | URL, init?: RequestInit): string | undefined {
  const request = input instanceof Request ? input : undefined;
  const url = new URL(request?.url ?? String(input));
  const method = (init?.method ?? request?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers ?? request?.headers);
  if (
    method !== 'GET' ||
    init?.body ||
    request?.body ||
    url.username ||
    url.password ||
    headers.has('authorization') ||
    headers.has('cookie') ||
    (init?.credentials ?? request?.credentials) === 'include'
  )
    return;

  const huji = url.href === 'https://go.huji.ac.il/jjson/huji.json.gz';
  const ruleParameters = new Set([
    'p_lang',
    'p_year',
    'p_semester',
    'p_institution',
    'p_dep1',
    'p_pat1',
    'p_spe1',
    'p_degree_level',
  ]);
  const bgu =
    url.origin === 'https://bgu4u22.bgu.ac.il' &&
    url.pathname === '/apex/10g/candidate_site/GetRdpData/' &&
    !url.hash &&
    [...url.searchParams.keys()].every((key) => ruleParameters.has(key));
  // Unknown endpoints/parameters and every score submission bypass the cache.
  if (huji || bgu) return JSON.stringify([method, url.href, '']);
}

function responseFrom(stored: StoredResponse): Response {
  return new Response(
    stored.status === 204 || stored.status === 205 || stored.status === 304
      ? null
      : stored.bytes.slice(0),
    {
      status: stored.status,
      statusText: stored.statusText,
      headers: stored.headers,
    },
  );
}

export function createSourceResponseFetcher(
  fetcher: typeof fetch,
  options: { loadFetcher?: typeof fetch } = {},
): typeof fetch {
  const bounded = withBoundedOfficialResponse(options.loadFetcher ?? fetcher, {
    timeoutMs: OFFICIAL_SOURCE_TIMEOUT_MS,
  });
  return async (input, init) => {
    const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    signal?.throwIfAborted();
    const key = cacheKey(input, init);
    if (!key) return waitForCaller(bounded(input, init), signal);

    let cache = caches.get(fetcher);
    if (!cache) {
      cache = new Map();
      caches.set(fetcher, cache);
    }
    let entry = cache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      const targetCache = cache;
      const next: Entry = { expiresAt: Infinity, pending: undefined! };
      // The loader owns its deadline/signal. Never inherit a subscriber's abort.
      next.pending = (async () => {
        try {
          const sharedInput =
            input instanceof Request ? new Request(input, { signal: null }) : input;
          const response = await bounded(sharedInput, { ...init, signal: undefined });
          const stored = {
            bytes: await response.arrayBuffer(),
            headers: new Headers(response.headers),
            status: response.status,
            statusText: response.statusText,
          };
          if (response.ok) next.expiresAt = Date.now() + SOURCE_TTL_MS;
          else if (targetCache.get(key) === next) targetCache.delete(key);
          return stored;
        } catch (error) {
          if (targetCache.get(key) === next) targetCache.delete(key);
          throw error;
        }
      })();
      targetCache.set(key, next);
      // Keys contain only public rule parameters, with a bounded per-instance footprint.
      if (targetCache.size > 128) targetCache.delete(targetCache.keys().next().value!);
      entry = next;
    }
    return responseFrom(await waitForCaller(entry.pending, signal));
  };
}

async function waitForCaller<T>(pending: Promise<T>, signal?: AbortSignal | null): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let aborted: (() => void) | undefined;
  const cancelled = new Promise<never>((_resolve, reject) => {
    aborted = () => reject(signal?.reason ?? new Error('Official source request aborted'));
    timeout = setTimeout(
      () =>
        reject(
          new Error(`Official source request timed out after ${OFFICIAL_SOURCE_TIMEOUT_MS}ms`),
        ),
      OFFICIAL_SOURCE_TIMEOUT_MS,
    );
    signal?.addEventListener('abort', aborted, { once: true });
    if (signal?.aborted) aborted();
  });
  try {
    return await Promise.race([pending, cancelled]);
  } finally {
    clearTimeout(timeout);
    if (aborted) signal?.removeEventListener('abort', aborted);
  }
}
