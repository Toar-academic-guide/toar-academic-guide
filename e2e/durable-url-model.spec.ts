import { expect, test } from '@playwright/test';

test.describe('durable URL model', () => {
  test('guest profile retains official decimal averages, false confirmations and zero after reload', async ({
    page,
  }) => {
    await page.goto('/app/profile');
    await page.getByLabel('ממוצע בגרות רשמי של אוניברסיטת תל אביב (50–130)').fill('112.5');
    await page.getByLabel('ממוצע בגרות רשמי של בן־גוריון (50–130)').fill('110.25');
    await page.getByLabel('אישור תנאי הגשה לתל אביב').selectOption('false');
    await page.getByLabel('אישור דרישות שפה בבן־גוריון').selectOption('false');
    await page.getByLabel('ציון סיווג במתמטיקה של אוניברסיטת תל אביב (0–100)').fill('0');
    await page.getByRole('button', { name: 'שמור והמשך לשאלון ←' }).click();
    await expect(page).toHaveURL(/\/app\/assessment$/);
    await page.goto('/app/profile');
    await page.reload();
    await expect(page.getByLabel('ממוצע בגרות רשמי של אוניברסיטת תל אביב (50–130)')).toHaveValue(
      '112.5',
    );
    await expect(page.getByLabel('ממוצע בגרות רשמי של בן־גוריון (50–130)')).toHaveValue('110.25');
    await expect(page.getByLabel('אישור תנאי הגשה לתל אביב')).toHaveValue('false');
    await expect(page.getByLabel('אישור דרישות שפה בבן־גוריון')).toHaveValue('false');
    await expect(page.getByLabel('ציון סיווג במתמטיקה של אוניברסיטת תל אביב (0–100)')).toHaveValue(
      '0',
    );
  });

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
