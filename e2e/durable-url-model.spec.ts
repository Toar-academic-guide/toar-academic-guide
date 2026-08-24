import { expect, test } from '@playwright/test';

test.describe('durable URL model', () => {
  test('direct recommendations entry shows a prerequisite state', async ({ page }) => {
    await page.goto('/app/recommendations');

    await expect(page).toHaveURL(/\/app\/recommendations$/);
    await expect(page.getByText('כדי להציג המלצות צריך להשלים שאלון')).toBeVisible();
  });

  test('browser back moves through durable app URLs', async ({ page }) => {
    await page.goto('/app/recommendations');
    await page.goto('/app/calculator');
    await page.goto('/app/saved-programs');

    await page.goBack();
    await expect(page).toHaveURL(/\/app\/calculator$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/app\/recommendations$/);
  });

  test('public catalogue pages render without login', async ({ page }) => {
    await page.goto('/programs/cs');
    await expect(page.getByRole('heading', { name: 'מדעי המחשב' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'בדיקת סיכויי קבלה' })).toHaveAttribute(
      'href',
      '/app/calculator',
    );

    await page.goto('/institutions/tau');
    await expect(page.getByRole('heading', { name: 'אוניברסיטת תל אביב' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'שאלון התאמה' })).toHaveAttribute(
      'href',
      '/app/assessment',
    );
  });

  test('internal data health remains fail-closed for unauthenticated visitors', async ({
    page,
  }) => {
    const response = await page.goto('/internal/data-health');

    expect(response?.status()).toBe(404);
    await expect(page.getByText('Operational Data Health')).toHaveCount(0);
  });
});
