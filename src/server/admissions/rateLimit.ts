import 'server-only';

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const rateLimitStore = new Map<string, RateLimitEntry>();

export function assertAdmissionsEvaluationRateLimit(clientKey: string, now = Date.now()) {
  pruneExpiredEntries(now);

  const existing = rateLimitStore.get(clientKey);
  if (!existing || existing.expiresAt <= now) {
    rateLimitStore.set(clientKey, {
      count: 1,
      expiresAt: now + WINDOW_MS,
    });
    return;
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    throw new Error('RATE_LIMITED');
  }

  rateLimitStore.set(clientKey, {
    ...existing,
    count: existing.count + 1,
  });
}

function pruneExpiredEntries(now: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.expiresAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function resetAdmissionsEvaluationRateLimitForTests() {
  rateLimitStore.clear();
}
