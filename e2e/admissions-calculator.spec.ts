import { expect, test, type Page } from '@playwright/test';

async function expectConservativeStaticResult(page: Page, institution: string) {
  await expect(page.getByText(institution, { exact: true })).toBeVisible();
  await expect(page.getByText('האימות הרשמי טרם הושלם', { exact: true }).first()).toBeVisible();
}

test.describe('app admissions calculator', () => {
  test('shows safe catalogue-backed results without leaving /app/calculator', async ({ page }) => {
    await page.goto('/app/calculator');
    await expect(page).toHaveURL(/\/app\/calculator$/);

    await page.locator('#psychometric').fill('700');
    await page.locator('#bagrut').fill('110');
    await page.locator('#degree').selectOption('tau_datascience');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expectConservativeStaticResult(page, 'אוניברסיטת תל אביב');

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('760');
    await page.locator('#bagrut').fill('115');
    await page.locator('#degree').selectOption('bgu_cs');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expectConservativeStaticResult(page, 'אוניברסיטת בן-גוריון בנגב');

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('700');
    await page.locator('#bagrut').fill('110');
    await page.locator('#degree').selectOption('haifa_cs');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expectConservativeStaticResult(page, 'אוניברסיטת חיפה');

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('760');
    await page.locator('#bagrut').fill('115');
    await page.locator('#degree').selectOption('technion_medicine');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expectConservativeStaticResult(page, 'הטכניון – מכון טכנולוגי לישראל');
  });
});
