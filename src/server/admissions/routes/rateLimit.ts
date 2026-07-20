import 'server-only';

interface RateLimitEntry {
  count: number;
  inFlight: number;
  expiresAt: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 6;
const MAX_CONCURRENT_REQUESTS = 2;
const store = new Map<string, RateLimitEntry>();

export function acquireAdmissionsRouteRequest(key: string, now = Date.now()) {
  prune(now);
  const current = store.get(key) ?? { count: 0, inFlight: 0, expiresAt: now + WINDOW_MS };
  if (current.count >= MAX_REQUESTS_PER_WINDOW || current.inFlight >= MAX_CONCURRENT_REQUESTS) {
    const error = new Error('ROUTE_RATE_LIMITED');
    error.cause = Math.max(1, Math.ceil((current.expiresAt - now) / 1000));
    throw error;
  }

  store.set(key, { ...current, count: current.count + 1, inFlight: current.inFlight + 1 });
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const latest = store.get(key);
    if (latest) store.set(key, { ...latest, inFlight: Math.max(0, latest.inFlight - 1) });
  };
}

function prune(now: number) {
  for (const [key, entry] of store) if (entry.expiresAt <= now) store.delete(key);
}

export function resetAdmissionsRouteRateLimitForTests() {
  store.clear();
}
