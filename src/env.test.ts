import { afterEach, describe, expect, it } from 'vitest';

import { isProductionRuntime } from '@/env';

const ORIGINAL_ENV = { ...process.env };

describe('env runtime helpers', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('treats Vercel preview deployments as non-production runtime', () => {
    process.env.NODE_ENV = 'production';
    process.env.VERCEL_ENV = 'preview';

    expect(isProductionRuntime()).toBe(false);
  });

  it('treats Vercel production deployments as production runtime', () => {
    process.env.NODE_ENV = 'development';
    process.env.VERCEL_ENV = 'production';

    expect(isProductionRuntime()).toBe(true);
  });

  it('falls back to NODE_ENV when VERCEL_ENV is absent', () => {
    delete process.env.VERCEL_ENV;
    process.env.NODE_ENV = 'production';

    expect(isProductionRuntime()).toBe(true);
  });
});
