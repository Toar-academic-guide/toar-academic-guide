import { expect, it, vi } from 'vitest';

it('starts and probes the same isolated local server selected by BASE_URL', async () => {
  vi.stubEnv('BASE_URL', 'http://localhost:3107');
  vi.stubEnv('CI', '');
  vi.resetModules();
  try {
    const { default: config } = await import('../../playwright.config');
    expect(config.use?.baseURL).toBe('http://localhost:3107');
    expect(config.webServer).toMatchObject({ url: 'http://localhost:3107' });
  } finally {
    vi.unstubAllEnvs();
  }
});
