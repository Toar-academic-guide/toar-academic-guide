import { expect, test } from '@playwright/test';

test.describe('app admissions calculator', () => {
  test('shows an exact TAU result and a Haifa needs-input result without leaving /app/calculator', async ({
    page,
  }) => {
    await page.goto('/app/calculator');
    await expect(page).toHaveURL(/\/app\/calculator$/);

    await page.locator('#psychometric').fill('700');
    await page.locator('#bagrut').fill('110');
    await page.locator('#degree').selectOption('tau_datascience');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expect(page.getByLabel('אוניברסיטת תל אביב: מתקבל/ת')).toBeVisible();
    await expect(page.getByText('אימות רשמי')).toBeVisible();
    await expect(page.getByText(/ציון התאמה \d+ · סף \d+/)).toBeVisible();

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('700');
    await page.locator('#bagrut').fill('110');
    await page.locator('#degree').selectOption('haifa_cs');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expect(page.getByLabel('אוניברסיטת חיפה: נדרשים נתונים')).toBeVisible();
    await expect(page.getByText('נדרשים נתונים נוספים')).toBeVisible();
  });
});
