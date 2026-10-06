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
    await expect(page.getByLabel(`${institution}: תנאי קבלה`)).toBeVisible();
    await expect(
      page.getByText('תנאי הקבלה האחרונים שאומתו', { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText(/סף הקבלה השמור למסלול הוא/).first()).toBeVisible();
    await expect(page.getByText(/נתוני הבסיס אומתו ב־/).first()).toBeVisible();
    return;
  }

  await expect(
    page.getByLabel(new RegExp(`^${institution}: (?:${liveStatus.source}|תנאי קבלה)$`)),
  ).toBeVisible();
  await expect(
    page
      .getByText(new RegExp(`^(?:${liveSourceLabel.source}|תנאי הקבלה האחרונים שאומתו)$`))
      .first(),
  ).toBeVisible();
}

test.describe('app admissions calculator', () => {
  test('submits Industrial Engineering without inventing a psychometric score', async ({
    page,
  }) => {
    await page.goto('/app/calculator');
    await page.locator('#bagrut').fill('109');
    await page.locator('#degree').selectOption('bgu_industrial');
    await expect(page.getByLabel('ציון פסיכומטרי (רשות לאפיק ללא פסיכומטרי)')).toBeVisible();
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/admissions/evaluate') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'חשב סיכויי קבלה ←' }).click();
    const response = await responsePromise;
    expect(response.request().postDataJSON()).toMatchObject({
      degreeId: 'bgu_industrial',
      bagrut: 109,
    });
    expect(response.request().postDataJSON().psychometric).toBeUndefined();
    expect(response.status()).toBe(200);
    await expect(page.getByText('אוניברסיטת בן-גוריון בנגב', { exact: true })).toBeVisible();
    await expect(
      page.getByLabel('אוניברסיטת בן-גוריון בנגב: מתקבל/ת', { exact: true }),
    ).toHaveCount(0);
  });

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

test('BGU engineering accepts prep-only requests without a generic Bagrut average', async ({
  page,
  request,
}) => {
  await page.goto('/app/calculator');
  await page.locator('#degree').selectOption('bgu_ee');
  await page.locator('#psychometric').fill('700');
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
    degreeId: 'bgu_ee',
    psychometric: 700,
    extraInputs: {
      psychometricMath: 140,
      bguLanguageRequirementsConfirmed: true,
      bguEngineering: {
        detailsConfirmed: true,
        preparatoryInstitution: 'bgu',
        preparatoryCompletionYear: 2026,
        preparatoryMathUnits: 5,
        preparatoryMathGrade: 90,
        preparatoryPhysicsUnits: 5,
        preparatoryPhysicsGrade: 90,
      },
    },
  };
  const response = await request.post('/api/admissions/evaluate', { data: input });
  expect(response.status()).toBe(200);
  expect((await response.json()).data.input).toEqual(input);
});
