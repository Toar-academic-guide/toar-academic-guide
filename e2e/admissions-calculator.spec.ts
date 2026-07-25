import { expect, test } from '@playwright/test';

const usesStaticCatalogue = process.env.CATALOGUE_SOURCE_MODE === 'static';

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
    if (usesStaticCatalogue) {
      await expect(page.getByLabel('אוניברסיטת תל אביב: נדרשים נתונים')).toBeVisible();
      await expect(page.getByText('נדרשים נתונים נוספים')).toBeVisible();
      await expect(
        page.getByText('השלימו את יחידות וציון המקצועות החסרים כדי לקבל הערכה למסלול.'),
      ).toBeVisible();
    } else {
      await expect(page.getByLabel('אוניברסיטת תל אביב: מתקבל/ת')).toBeVisible();
      await expect(page.getByText('אימות רשמי')).toBeVisible();
    }

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('760');
    await page.locator('#bagrut').fill('115');
    await page.locator('#degree').selectOption('bgu_cs');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    if (usesStaticCatalogue) {
      await expect(page.getByLabel('אוניברסיטת בן-גוריון בנגב: נדרשים נתונים')).toBeVisible();
      await expect(page.getByText('נדרשים נתונים נוספים')).toBeVisible();
      await expect(page.getByText(/סכם .* · סף 720/)).toBeVisible();
    } else {
      await expect(page.getByLabel('אוניברסיטת בן-גוריון בנגב: מתקבל/ת')).toBeVisible();
      await expect(page.getByText('כלל קבלה ממופה ממקור חלקי')).toBeVisible();
      await expect(page.getByText(/סכם .* · סף 645/)).toBeVisible();
    }

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('700');
    await page.locator('#bagrut').fill('110');
    await page.locator('#degree').selectOption('haifa_cs');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expect(page.getByLabel('אוניברסיטת חיפה: נדרשים נתונים')).toBeVisible();
    await expect(page.getByText('נדרשים נתונים נוספים')).toBeVisible();

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('760');
    await page.locator('#bagrut').fill('115');
    await page.locator('#degree').selectOption('technion_medicine');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expect(page.getByLabel('הטכניון – מכון טכנולוגי לישראל: אפשר להגיש מועמדות')).toBeVisible();
    await expect(page.getByText('נדרש מיון נוסף')).toBeVisible();
    await expect(page.getByText(/סכם 96\.5 · סף 92/)).toBeVisible();
  });
});
