import { expect, test, type Page } from './fixtures';

async function enterJourney(page: Page, field: string, bagrut?: number, psychometric?: number) {
  await page.goto('/app/calculator');
  await page.getByLabel('חיפוש תחום לימודים').fill(field);
  await page.getByRole('button', { name: field, exact: true }).click();
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  await expect(page.getByRole('button', { name: 'כל הארץ', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'המשך', exact: true }).click();
  if (bagrut === undefined) {
    await page.getByRole('button', { name: /אין לי כרגע ציוני בגרות/ }).click();
  } else {
    await page.getByRole('button', { name: /יש לי ממוצע בגרות/ }).click();
    await page.getByLabel('ממוצע בגרות', { exact: true }).fill(String(bagrut));
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
  }
  if (psychometric === undefined) {
    await page.getByRole('button', { name: 'בלי פסיכומטרי כרגע' }).click();
  } else {
    await page.getByRole('button', { name: 'כן, יש לי ציון' }).click();
    await page.getByLabel('ציון כללי', { exact: true }).fill(String(psychometric));
    await expect(page.getByLabel('כמותי', { exact: true })).toBeVisible();
    await expect(page.getByLabel('מילולי', { exact: true })).toBeVisible();
    await expect(page.getByLabel('אנגלית', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
  }
}

function evaluationFor(page: Page, degreeId: string) {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/admissions/evaluate') &&
      response.request().method() === 'POST' &&
      response.request().postDataJSON().degreeIds?.includes(degreeId),
  );
}

test('Industrial Engineering keeps an omitted psychometric score omitted', async ({ page }) => {
  await enterJourney(page, 'הנדסת תעשייה וניהול', 109);
  const pending = evaluationFor(page, 'bgu_industrial');
  await page.getByRole('button', { name: 'לגלות את האפשרויות שלי' }).click();
  const response = await pending;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toMatchObject({
    degreeIds: expect.arrayContaining(['bgu_industrial']),
    bagrut: 109,
  });
  expect(response.request().postDataJSON().psychometric).toBeUndefined();
  expect((await response.json()).data.reports.bgu_industrial.input).toMatchObject({
    degreeId: 'bgu_industrial',
    bagrut: 109,
  });
  await expect(page.getByRole('heading', { name: 'האפשרויות שלך' })).toBeVisible();
});

test('grouped results retain visible contact and save actions and selected context after reload', async ({
  page,
  request,
}) => {
  await enterJourney(page, 'פיזיותרפיה', 110, 700);
  const pending = evaluationFor(page, 'physiotherapy');
  await page.getByRole('button', { name: 'לגלות את האפשרויות שלי' }).click();
  expect((await pending).status()).toBe(200);
  await expect(page).toHaveURL(/\/app\/calculator#results$/);
  await expect(page.getByRole('button', { name: 'יצירת קשר', exact: true }).first()).toBeVisible();
  const saved = page.getByRole('button', { name: 'שמירת פיזיותרפיה — אוניברסיטת תל אביב' });
  await saved.click();
  await expect(saved).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'יצירת קשר', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'רוצה לשמוע עוד?' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('שם מלא', { exact: true })).toBeVisible();
  await expect(page.getByLabel('מספר טלפון', { exact: true })).toBeVisible();

  for (const degreeId of ['tau_datascience', 'bgu_cs', 'haifa_cs', 'technion_medicine']) {
    const response = await request.post('/api/admissions/evaluate', {
      data: { degreeId, bagrut: 110, psychometric: 700 },
    });
    expect(response.status()).toBe(200);
    const report = (await response.json()).data;
    expect(report.input).toMatchObject({ degreeId, bagrut: 110, psychometric: 700 });
    expect(report.results.length).toBeGreaterThan(0);
    expect(
      report.results.every((result: { decision: string }) => result.decision !== 'accepted'),
    ).toBe(true);
  }
});

test('Psychology alternate routes accept omitted generic scores in the journey and API', async ({
  page,
  request,
}) => {
  await enterJourney(page, 'פסיכולוגיה');
  const pending = evaluationFor(page, 'bgu_psychology');
  await page.getByRole('button', { name: 'לגלות את האפשרויות שלי' }).click();
  const evaluation = await pending;
  expect(evaluation.status()).toBe(200);
  expect(evaluation.request().postDataJSON().bagrut).toBeUndefined();
  expect(evaluation.request().postDataJSON().psychometric).toBeUndefined();
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
  await enterJourney(page, 'הנדסת חשמל', undefined, 700);
  const pending = evaluationFor(page, 'bgu_ee');
  await page.getByRole('button', { name: 'לגלות את האפשרויות שלי' }).click();
  expect((await pending).status()).toBe(200);
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
