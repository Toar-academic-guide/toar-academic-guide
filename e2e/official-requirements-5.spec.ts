import { expect, test } from './fixtures';
import official from '../docs/admissions-verification/2026-10-23-official-requirements-5.json';

const vercelAutomationBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
test.use({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use) => {
    await use({
      ...extraHTTPHeaders,
      'x-forwarded-for': '198.51.100.25',
      ...(vercelAutomationBypassSecret
        ? {
            'x-vercel-protection-bypass': vercelAutomationBypassSecret,
          }
        : {}),
    });
  },
});

test.beforeAll(async ({ request }) => {
  const response = await request.get('/api/catalog/programs');
  const unavailableReason = 'catalogue API unavailable on preview (non-JSON)';
  test.skip(
    !response.ok() || !/(?:\/|\+)json(?:\s*;|$)/i.test(response.headers()['content-type'] ?? ''),
    unavailableReason,
  );
  const catalogue = await response.json().catch(() => {
    test.skip(true, unavailableReason);
  });
  const economics = catalogue.data.find(
    (program: { id: string }) => program.id === 'colmgmt_economics',
  );
  test.skip(
    !economics?.institutionDetails?.some(
      (detail: { programUrl?: string }) =>
        detail.programUrl === official['colmgmt_economics:colman'].programUrl,
    ),
    'Batch2 catalogue copy has not been applied; run with explicit local static mode.',
  );
});

for (const width of [390, 1440]) {
  test(`economics asks for the Colman average at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'myway_study_journey_v2',
        JSON.stringify({
          fields: [],
          locations: ['all'],
          types: ['all'],
          selectedRowId: 'colmgmt_economics:colman',
          scores: { bagrut: { weightedAverage: 70 }, psychometric: { overall: 420 } },
        }),
      );
    });
    await page.goto('/app/calculator#detail');
    await expect(page.locator('.journey-result-explanation')).toContainText(
      'נדרש ממוצע משוקלל של המכללה למינהל',
    );
    await expect(
      page.getByRole('main').getByText('חסרים פרטים לחישוב', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'השלמת נתונים לחישוב', exact: true }).click();
    const average = page.getByLabel('ממוצע בגרות משוקלל של המכללה למינהל (50–130)', {
      exact: true,
    });
    await expect(average).toHaveValue('');
    await expect(average).toHaveCSS('text-align', 'right');
    await average.fill('86.25');
    await expect(average).toHaveValue('86.25');
    await expect(average).toHaveCSS('text-align', 'right');
  });
  test(`official economics copy and calculator flow at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'myway_study_journey_v2',
        JSON.stringify({
          fields: [],
          locations: ['all'],
          types: ['all'],
          selectedRowId: 'colmgmt_economics:colman',
          scores: {
            bagrut: { weightedAverage: 70 },
            psychometric: { overall: 560, quantitative: 115 },
            admissions: { colmanBagrutAverage: 80, colmanBagrutCertificateConfirmed: true },
          },
        }),
      );
    });
    test.setTimeout(150_000);
    const waitForEvaluation = () =>
      page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/admissions/evaluate') &&
          response.request().postDataJSON()?.degreeIds?.includes('colmgmt_economics'),
      );
    const evaluation = waitForEvaluation();
    await page.goto('/app/calculator#detail');
    let response = await evaluation;
    if (response.status() === 429) {
      await new Promise((resolve) => setTimeout(resolve, 60_000));
      const retry = waitForEvaluation();
      await page.reload();
      response = await retry;
    }
    expect(response.status()).toBe(200);
    const result = (await response.json()).data.reports.colmgmt_economics.results.find(
      (row: { linkedInstitutionId: string }) => row.linkedInstitutionId === 'colman',
    );
    expect(result).toMatchObject({
      decision: 'eligible_to_apply',
      scoreAssessment: 'meets_threshold',
    });
    await expect(page.locator('.journey-result-explanation')).toHaveText(result.explanation);
    const main = page.getByRole('main');
    await expect(main.getByRole('button', { name: 'יצירת קשר', exact: true })).toBeVisible();
    await expect(main.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
    await expect(main).not.toContainText('ההחלטה היא של המכללה');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath(`economics-calculator-${width}.png`),
      fullPage: true,
    });

    for (const value of Object.values(official)) {
      await page.goto(`/programs/${value.program}`);
      await expect(main).toHaveCSS('text-align', 'right');
      const more = main.getByText('תנאים נוספים', { exact: true });
      if (await more.count()) await more.click();
      const expectedCopy =
        value.program === 'colmgmt_economics'
          ? [...value.requirements, ...value.notes]
          : value.notes;
      for (const line of expectedCopy)
        await expect(main.getByText(line, { exact: true })).toBeVisible();
      await expect(main.getByRole('link', { name: 'יצירת קשר', exact: true })).toBeVisible();
      if (value.program === 'colmgmt_economics') {
        const calculator = new URL(
          (await main
            .getByRole('link', { name: 'למחשבון המכללה', exact: true })
            .getAttribute('href'))!,
        );
        expect(calculator.searchParams.get('prgname')).toBe('Reg_Calc_1');
        expect(calculator.searchParams.get('utm_source')).toBe('myway');
        expect(calculator.searchParams.get('utm_medium')).toBe('referral');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: testInfo.outputPath(`${value.program}-${width}.png`),
        fullPage: true,
      });
    }
  });
}
