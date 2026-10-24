import 'server-only';

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const rateLimitStore = new Map<string, RateLimitEntry>();

function maxRequestsPerWindow(): number {
  if (
    process.env.CI !== 'true' ||
    process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.CATALOGUE_SOURCE_MODE !== 'static' ||
    process.env.VERCEL ||
    process.env.VERCEL_ENV
  ) {
    return MAX_REQUESTS_PER_WINDOW;
  }

  // The isolated PR smoke server shares one localhost client key across the suite.
  const limit = Number(process.env.ADMISSIONS_EVALUATION_CI_MAX_REQUESTS_PER_WINDOW);
  return Number.isSafeInteger(limit) && limit >= MAX_REQUESTS_PER_WINDOW && limit <= 1000
    ? limit
    : MAX_REQUESTS_PER_WINDOW;
}

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

  if (existing.count >= maxRequestsPerWindow()) {
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
