import { expect, test, type Page } from '@playwright/test';

const isStaticCatalogue = process.env.CATALOGUE_SOURCE_MODE === 'static';

async function expectSafeResult(
  page: Page,
  institution: string,
  liveStatus: RegExp,
  liveSourceLabel: RegExp,
) {
  await expect(page.getByText(institution, { exact: true })).toBeVisible();
  await expect(page.getByLabel(`${institution}: מתקבל/ת`, { exact: true })).toHaveCount(0);

  if (isStaticCatalogue) {
    await expect(page.getByLabel(`${institution}: האימות טרם הושלם`)).toBeVisible();
    await expect(page.getByText('האימות הרשמי טרם הושלם', { exact: true }).first()).toBeVisible();
    return;
  }

  await expect(
    page.getByLabel(
      new RegExp(`^${institution}: (?:${liveStatus.source}|אימות לא זמין|האימות טרם הושלם)$`),
    ),
  ).toBeVisible();
  await expect(
    page
      .getByText(
        new RegExp(`^(?:${liveSourceLabel.source}|אימות רשמי לא זמין|האימות הרשמי טרם הושלם)$`),
      )
      .first(),
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
    await expectSafeResult(
      page,
      'אוניברסיטת בן-גוריון בנגב',
      /נדרשים נתונים/,
      /נדרשים נתונים נוספים/,
    );

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

test('Psychology alternate routes accept omitted generic scores in the deployed calculator and API', async ({
  page,
  request,
}) => {
  await page.goto('/app/calculator');
  await page.locator('#degree').selectOption('bgu_psychology');
  const evaluation = page.waitForResponse(
    (response) =>
      response.url().includes('/api/admissions/evaluate') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();
  expect((await evaluation).status()).toBe(200);
  await expectSafeResult(
    page,
    'אוניברסיטת בן-גוריון בנגב',
    /נדרשים נתונים/,
    /נדרשים נתונים נוספים/,
  );
  const input = {
    degreeId: 'bgu_psychology',
    extraInputs: {
      bguPsychologyRoute: 'bagrut',
      bguPreparatoryTrack: 'natural_life_sciences',
      bguPreparatoryAverage: 94.25,
      bguPreparatoryCompleted: true,
      bguPsychologyRequirementsConfirmed: true,
      bguLanguageRequirementsConfirmed: true,
    },
  };
  const response = await request.post('/api/admissions/evaluate', { data: input });
  expect(response.status()).toBe(200);
  expect((await response.json()).data.input).toEqual(input);
});
