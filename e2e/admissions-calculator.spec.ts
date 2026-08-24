import { expect, test } from '@playwright/test';

test.describe('app admissions calculator', () => {
  test('shows the expected catalogue-backed results without leaving /app/calculator', async ({
    page,
  }) => {
    await page.goto('/app/calculator');
    await expect(page).toHaveURL(/\/app\/calculator$/);

    await page.locator('#psychometric').fill('700');
    await page.locator('#bagrut').fill('110');
    await page.locator('#degree').selectOption('tau_datascience');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expect(page.getByLabel('אוניברסיטת תל אביב: האימות טרם הושלם')).toBeVisible();
    await expect(page.getByText('האימות הרשמי טרם הושלם', { exact: true })).toBeVisible();
    await expect(page.getByText('בדקו בינתיים ישירות במחשבון הרשמי של המוסד.')).toBeVisible();

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('760');
    await page.locator('#bagrut').fill('115');
    await page.locator('#degree').selectOption('bgu_cs');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expect(page.getByLabel('אוניברסיטת בן-גוריון בנגב: האימות טרם הושלם')).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('700');
    await page.locator('#bagrut').fill('110');
    await page.locator('#degree').selectOption('haifa_cs');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expect(page.getByLabel('אוניברסיטת חיפה: האימות טרם הושלם')).toBeVisible();

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('760');
    await page.locator('#bagrut').fill('115');
    await page.locator('#degree').selectOption('technion_medicine');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expect(page.getByLabel('הטכניון – מכון טכנולוגי לישראל: האימות טרם הושלם')).toBeVisible();
  });
});
