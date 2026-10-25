import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  assertAdmissionsEvaluationRateLimit,
  admissionsEvaluationClientKey,
  resetAdmissionsEvaluationRateLimitForTests,
} from './rateLimit';

describe('admissions evaluation rate limit', () => {
  beforeEach(() => {
    resetAdmissionsEvaluationRateLimitForTests();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ADMISSIONS_EVALUATION_E2E_ISOLATION', undefined);
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
  it('isolates tests while enforcing the real 12/min quota in each bucket', () => {
    vi.stubEnv('ADMISSIONS_EVALUATION_E2E_ISOLATION', '1');
    // Isolation must retain 12 even if the legacy CI override is accidentally present.
    vi.stubEnv('ADMISSIONS_EVALUATION_CI_MAX_REQUESTS_PER_WINDOW', '1000');
    const first = admissionsEvaluationClientKey('localhost', 'test-one');
    const second = admissionsEvaluationClientKey('localhost', 'test-two');
    expect(first).not.toBe(second);
    for (const key of [first, second]) {
      for (let i = 0; i < 12; i++) assertAdmissionsEvaluationRateLimit(key, 0);
      expect(() => assertAdmissionsEvaluationRateLimit(key, 59_999)).toThrow('RATE_LIMITED');
      expect(() => assertAdmissionsEvaluationRateLimit(key, 60_000)).not.toThrow();
    }
  });

  it.each([
    ['CI', undefined],
    ['CI', 'false'],
    ['GITHUB_ACTIONS', undefined],
    ['GITHUB_ACTIONS', 'false'],
    ['CATALOGUE_SOURCE_MODE', 'database'],
    ['CATALOGUE_SOURCE_MODE', 'auto'],
    ['VERCEL', '1'],
    ['VERCEL_ENV', 'production'],
    ['VERCEL_ENV', 'preview'],
    ['ADMISSIONS_EVALUATION_E2E_ISOLATION', undefined],
    ['ADMISSIONS_EVALUATION_E2E_ISOLATION', 'true'],
  ])('ignores test bucket headers with %s=%s', (name, value) => {
    vi.stubEnv('ADMISSIONS_EVALUATION_E2E_ISOLATION', '1');
    vi.stubEnv(name, value);
    for (let i = 0; i < 12; i++) {
      const key = admissionsEvaluationClientKey('localhost', `different-test-${i}`);
      expect(key).toBe('localhost');
      assertAdmissionsEvaluationRateLimit(key, 0);
    }
    expect(() =>
      assertAdmissionsEvaluationRateLimit(
        admissionsEvaluationClientKey('localhost', 'another-test'),
        0,
      ),
    ).toThrow('RATE_LIMITED');
  });

  it.each([null, '', 'invalid bucket', 'x'.repeat(129)])(
    'ignores invalid test bucket %s',
    (bucket) => {
      vi.stubEnv('ADMISSIONS_EVALUATION_E2E_ISOLATION', '1');
      expect(admissionsEvaluationClientKey('localhost', bucket)).toBe('localhost');
    },
  );
});
