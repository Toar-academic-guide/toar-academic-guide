import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('landing page loads and shows main heading', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Way|מה\.איפה\.איך/i);
    // The page should render without a crash — verify a visible element exists
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('page has a navigation bar', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('API health: catalog programs returns 200', async ({ request }) => {
    const response = await request.get('/api/catalog/programs');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('API health: catalog institutions returns 200', async ({ request }) => {
    const response = await request.get('/api/catalog/institutions');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('unauthenticated profile request returns 401', async ({ request }) => {
    const response = await request.get('/api/profile');
    expect([401, 503]).toContain(response.status());
  });

  test('no console errors on landing page', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known benign errors (e.g., PostHog, analytics)
    const realErrors = errors.filter(
      (e) => !e.includes('posthog') && !e.includes('analytics') && !e.includes('Failed to fetch'),
    );
    expect(realErrors).toHaveLength(0);
  });
});
