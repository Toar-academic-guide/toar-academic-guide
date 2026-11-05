import {
  createSourceResponseFetcher,
  OFFICIAL_SOURCE_TIMEOUT_MS,
} from '@/server/cache/sourceResponseCache';
import { withBoundedOfficialResponse } from '@/server/ingestion/boundedOfficialFetch';

export interface EvaluationSourceContext {
  fetcher: typeof fetch;
  sourcesDurationMs: () => number;
  forFetcher: (fetcher: typeof fetch) => typeof fetch;
}

// Request-local host queues/activity; cache identity remains the original fetcher.
export function createEvaluationSourceContext(
  fetcher: typeof fetch = fetch,
): EvaluationSourceContext {
  const hosts = new Map<string, { active: number; queue: Array<() => void> }>();
  let active = 0;
  let startedAt = 0;
  let elapsed = 0;
  const forFetcher = (baseFetcher: typeof fetch): typeof fetch => {
    const bounded = withBoundedOfficialResponse(baseFetcher, {
      timeoutMs: OFFICIAL_SOURCE_TIMEOUT_MS,
    });
    const limited: typeof fetch = async (input, init) => {
      const host = new URL(input instanceof Request ? input.url : String(input)).host;
      let slots = hosts.get(host);
      if (!slots) {
        slots = { active: 0, queue: [] };
        hosts.set(host, slots);
      }
      if (slots.active >= 8) await new Promise<void>((resolve) => slots.queue.push(resolve));
      else slots.active++;
      try {
        init?.signal?.throwIfAborted();
        // Hold the slot through the bounded body read, not just the headers.
        return await bounded(input, init);
      } finally {
        const next = slots.queue.shift();
        if (next) next();
        else slots.active--;
      }
    };
    const cached = createSourceResponseFetcher(baseFetcher, { loadFetcher: limited });
    return async (input, init) => {
      if (active++ === 0) startedAt = performance.now();
      try {
        return await cached(input, init);
      } finally {
        if (--active === 0) elapsed += performance.now() - startedAt;
      }
    };
  };
  return {
    fetcher: forFetcher(fetcher),
    forFetcher,
    sourcesDurationMs: () => elapsed + (active ? performance.now() - startedAt : 0),
  };
}
