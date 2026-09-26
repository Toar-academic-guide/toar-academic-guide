import { expect, test, type Page } from '@playwright/test';

const isStaticCatalogue = process.env.CATALOGUE_SOURCE_MODE === 'static';

async function expectSafeResult(
  page: Page,
  institution: string,
  liveStatus: RegExp,
  liveSourceLabel: RegExp,
) {
  await expect(page.getByText(institution, { exact: true })).toBeVisible();

  if (isStaticCatalogue) {
    await expect(page.getByLabel(`${institution}: האימות טרם הושלם`)).toBeVisible();
    await expect(page.getByText('האימות הרשמי טרם הושלם', { exact: true }).first()).toBeVisible();
    return;
  }

  await expect(
    page.getByLabel(new RegExp(`^${institution}: (?:${liveStatus.source}|אימות לא זמין)$`)),
  ).toBeVisible();
  await expect(
    page.getByText(new RegExp(`^(?:${liveSourceLabel.source}|אימות רשמי לא זמין)$`)).first(),
  ).toBeVisible();
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
    await expectSafeResult(page, 'אוניברסיטת תל אביב', /נדרשים נתונים/, /נדרשים נתונים נוספים/);

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('760');
    await page.locator('#bagrut').fill('115');
    await page.locator('#degree').selectOption('bgu_cs');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expectSafeResult(page, 'אוניברסיטת בן-גוריון בנגב', /מתקבל\/ת/, /אימות רשמי/);

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('700');
    await page.locator('#bagrut').fill('110');
    await page.locator('#degree').selectOption('haifa_cs');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expectSafeResult(page, 'אוניברסיטת חיפה', /נדרשים נתונים/, /נדרשים נתונים נוספים/);

    await page.getByRole('button', { name: 'חזרה', exact: true }).click();

    await page.locator('#psychometric').fill('760');
    await page.locator('#bagrut').fill('115');
    await page.locator('#degree').selectOption('technion_medicine');
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();

    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expectSafeResult(
      page,
      'הטכניון – מכון טכנולוגי לישראל',
      /נדרשים נתונים/,
      /נדרשים נתונים נוספים/,
    );
  });
});
