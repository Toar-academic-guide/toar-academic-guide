import { randomUUID } from 'node:crypto';
import { test as base } from '@playwright/test';

export { expect, type Page } from '@playwright/test';

export const test = base.extend({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use) => {
    await use({
      ...extraHTTPHeaders,
      ...(process.env.ADMISSIONS_EVALUATION_E2E_ISOLATION === '1'
        ? { 'x-myway-e2e-bucket': randomUUID() }
        : {}),
    });
  },
});
