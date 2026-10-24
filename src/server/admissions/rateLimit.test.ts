import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  assertAdmissionsEvaluationRateLimit,
  resetAdmissionsEvaluationRateLimitForTests,
} from './rateLimit';

describe('admissions evaluation rate limit', () => {
  beforeEach(() => {
    resetAdmissionsEvaluationRateLimitForTests();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CI', 'true');
    vi.stubEnv('GITHUB_ACTIONS', 'true');
    vi.stubEnv('CATALOGUE_SOURCE_MODE', 'static');
    vi.stubEnv('VERCEL', undefined);
    vi.stubEnv('VERCEL_ENV', undefined);
    vi.stubEnv('ADMISSIONS_EVALUATION_CI_MAX_REQUESTS_PER_WINDOW', undefined);
  });

  afterEach(() => {
    resetAdmissionsEvaluationRateLimitForTests();
    vi.unstubAllEnvs();
  });

  function exhaustWindow(limit: number) {
    for (let request = 0; request < limit; request += 1) {
      expect(() => assertAdmissionsEvaluationRateLimit('localhost', 0)).not.toThrow();
    }
    expect(() => assertAdmissionsEvaluationRateLimit('localhost', 59_999)).toThrow('RATE_LIMITED');
    expect(() => assertAdmissionsEvaluationRateLimit('localhost', 60_000)).not.toThrow();
  }

  it('keeps the default at 12 requests per client per minute', () => {
    exhaustWindow(12);
  });

  it('uses a finite configured limit for the isolated static GitHub Actions smoke server', () => {
    vi.stubEnv('ADMISSIONS_EVALUATION_CI_MAX_REQUESTS_PER_WINDOW', '1000');
    exhaustWindow(1000);
  });

  it.each([
    ['CI', undefined],
    ['GITHUB_ACTIONS', undefined],
    ['CATALOGUE_SOURCE_MODE', 'database'],
    ['CATALOGUE_SOURCE_MODE', 'auto'],
    ['VERCEL', '1'],
    ['VERCEL_ENV', 'production'],
    ['VERCEL_ENV', 'preview'],
  ])('retains the production limit with %s=%s even if an override is set', (name, value) => {
    vi.stubEnv('ADMISSIONS_EVALUATION_CI_MAX_REQUESTS_PER_WINDOW', '1000');
    vi.stubEnv(name, value);
    exhaustWindow(12);
  });

  it.each(['', '0', '-1', '11', '1001', '12.5', 'Infinity', 'NaN', '1000requests'])(
    'rejects an invalid CI limit of %s and retains the default',
    (value) => {
      vi.stubEnv('ADMISSIONS_EVALUATION_CI_MAX_REQUESTS_PER_WINDOW', value);
      exhaustWindow(12);
    },
  );
});
