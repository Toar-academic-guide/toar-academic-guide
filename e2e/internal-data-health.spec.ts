import { expect, test } from '@playwright/test';

const runInternalSmoke = process.env.INTERNAL_DATA_HEALTH_SMOKE === '1';
const internalToken = process.env.INTERNAL_ADMIN_E2E_TOKEN;

test.describe('internal data health smoke', () => {
  test.skip(!runInternalSmoke, 'Internal data-health smoke only runs in the dedicated CI job.');

  test('keeps /internal/data-health hidden without the CI admin header', async ({ request }) => {
    const response = await request.get('/internal/data-health');

    expect(response.status()).toBe(404);
  });

  test('loads /internal/data-health for the CI internal admin browser smoke', async ({ page }) => {
    expect(internalToken, 'INTERNAL_ADMIN_E2E_TOKEN must be configured').toBeTruthy();

    await page.setExtraHTTPHeaders({
      'x-internal-admin-e2e-token': internalToken!,
    });
    await page.goto('/internal/data-health');

    await expect(page.getByRole('heading', { name: /data health/i })).toBeVisible();
    if (await page.getByRole('heading', { name: /data health unavailable/i }).isVisible()) {
      await expect(
        page.getByText(/configure the read-only operational database connection/i),
      ).toBeVisible();
      return;
    }

    await expect(page.getByRole('heading', { name: /catalogue readiness/i })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /admissions decision readiness/i }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /source coverage/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /source freshness/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /ingestion pipeline/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /review queue/i })).toBeVisible();
  });
});
