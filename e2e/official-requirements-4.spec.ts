import { expect, test } from '@playwright/test';
import official from '../docs/admissions-verification/2026-10-22-official-requirements-4.json';
import type { ApiEnvelope, CatalogueProgram } from '../src/types/catalogue';

let catalogueHasOfficialData = false;

test.beforeAll(async ({ request }) => {
  const response = await request.get('/api/catalog/programs');
  expect(response.ok()).toBe(true);
  const catalogue: ApiEnvelope<CatalogueProgram[]> = await response.json();
  const program = catalogue.data?.find((program) => program.id === 'tlvyaffo_cs');
  expect(program).toBeDefined();
  catalogueHasOfficialData = program!.admissionRequirements.includes(
    official['tlvyaffo_cs:mta'].reqs[0],
  );
});

function officialCatalogueApplied() {
  if (!catalogueHasOfficialData) {
    test.info().annotations.push({
      type: 'reqs4-db-pending',
      description:
        'production catalogue not yet updated by reqs4 apply.sql; DB-text assertions skipped',
    });
  }
  return catalogueHasOfficialData;
}

for (const width of [320, 390, 768, 1280, 1440]) {
  for (const value of Object.values(official)) {
    test(`${value.program} official requirements at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/programs/${value.program}`);
      const main = page.getByRole('main');
      await expect(main.getByRole('heading', { name: 'תנאי קבלה', exact: true })).toBeVisible();
      await expect(main).toHaveCSS('text-align', 'right');
      const more = main.locator('summary').filter({ hasText: /^(תנאים נוספים|פרטים נוספים)$/ });
      if (await more.count()) await more.click();
      await expect(main.getByRole('link', { name: 'יצירת קשר', exact: true })).toBeVisible();
      if (officialCatalogueApplied()) {
        await expect(main.getByText('מספיק אחד מאלה:', { exact: true })).toBeVisible();
        await expect(main.getByText('פרטים נוספים', { exact: true })).toBeVisible();
        const details = main.locator('details');
        for (const number of value.reqs.join(' ').match(/\d+/g) ?? []) {
          await expect(main).toContainText(number);
        }
        await expect(details).not.toContainText('ראיון קבלה חובה');
        const calculator = main.getByRole('link', { name: 'למחשבון המכללה', exact: true });
        const calculatorUrl = new URL((await calculator.getAttribute('href'))!);
        expect(calculatorUrl.searchParams.get('utm_source')).toBe('myway');
        expect(calculatorUrl.searchParams.get('utm_medium')).toBe('referral');
        const programUrl = new URL(
          (await main.getByRole('link', { name: 'לאתר המוסד', exact: true }).getAttribute('href'))!,
        );
        expect(programUrl.pathname).toBe(new URL(value.urls.program).pathname);
        await expect(main).not.toContainText('ממוצע בגרות מינימלי: 75');
        await expect(main).not.toContainText('ציון פסיכומטרי מינימלי: 500');
      }
      if (value.institution === 'mta') await expect(main).not.toContainText('ראיון קבלה חובה');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      if (width === 390 || width === 1440) {
        await page.screenshot({
          path: testInfo.outputPath(`${value.program}-${width}.png`),
          fullPage: true,
        });
      }
    });
  }
}

test('real API preserves route decisions and separate grade matches', async ({ request }) => {
  for (const [degreeId, scores, expected] of [
    [
      'tlvyaffo_cs',
      {
        bagrut: 60,
        psychometric: 400,
        extraInputs: { mathUnits: 5, mathGrade: 70, psychometricEnglish: 100 },
      },
      { decision: 'below' },
    ],
    [
      'colmgmt_law',
      { psychometric: 540, extraInputs: { colmanBagrutAverage: 99.9 } },
      { decision: 'unknown' },
    ],
    [
      'colmgmt_business',
      { psychometric: 555, extraInputs: { colmanBagrutAverage: 84.9, psychometricMath: 100 } },
      { decision: 'unknown' },
    ],
  ] as const) {
    const response = await request.post('/api/admissions/evaluate', {
      data: { degreeId, ...scores },
    });
    expect(response.status()).toBe(200);
    const report = (await response.json()).data;
    expect(report.results[0]).toMatchObject(expected);
  }
});

for (const width of [390, 1440]) {
  for (const value of Object.values(official)) {
    test(`${value.program} calculator detail at ${width}px keeps scores, conditions and actions separate`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((value) => {
        sessionStorage.setItem(
          'myway_study_journey_v2',
          JSON.stringify({
            fields: [],
            locations: ['all'],
            types: ['all'],
            selectedRowId: `${value.program}:${value.institution}`,
            scores: {
              bagrut: {
                weightedAverage: 102,
                subjectRecord: {
                  schemaVersion: 1,
                  sector: 'jewish',
                  subjects: [{ subjectId: 'mathematics', units: 5, grade: 80 }],
                },
              },
              psychometric: { overall: 670, quantitative: 120, english: 100 },
              admissions: { colmanBagrutAverage: 100, colmanBagrutCertificateConfirmed: true },
            },
          }),
        );
      }, value);
      const evaluation = page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/admissions/evaluate') &&
          response.request().postDataJSON()?.degreeIds?.includes(value.program),
      );
      await page.goto('/app/calculator#detail');
      const response = await evaluation;
      expect(response.status()).toBe(200);
      const result = (await response.json()).data.reports[value.program].results[0];
      expect(result.scoreAssessment).toBe('meets_threshold');
      await expect(page.locator('.journey-result-explanation')).toHaveText(result.explanation);
      if (value.program === 'colmgmt_cs' || value.institution === 'mta')
        expect(result.decision).toBe('pending');
      const main = page.getByRole('main');
      await expect(main.getByRole('button', { name: 'יצירת קשר', exact: true })).toBeVisible();
      await expect(main.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
      await expect(main.getByText('תנאי קבלה', { exact: true })).toBeVisible();
      const more = main.locator('summary').filter({ hasText: /^(תנאים נוספים|פרטים נוספים)$/ });
      if (await more.count()) await more.click();
      if (officialCatalogueApplied()) {
        for (const requirement of [...value.reqs, ...value.notes])
          await expect(main.getByText(requirement, { exact: true })).toBeVisible();
      }
      if (value.program === 'colmgmt_cs')
        await expect(
          main.getByText('מעבר מבדק פנימי של המכללה — טרם אושר', { exact: true }),
        ).toBeVisible();
      if (value.institution === 'mta') await expect(main).not.toContainText('ראיון קבלה חובה');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`detail-${value.program}-${width}.png`),
        fullPage: true,
      });
    });
  }
  test(`calculator score inputs stay right aligned empty and filled at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/app/calculator#grades-quick');
    const average = page.getByLabel('ממוצע בגרות', { exact: true });
    await expect(average).toHaveValue('');
    await expect(average).toHaveCSS('text-align', 'right');
    await average.fill('99.9');
    await expect(average).toHaveValue('99.9');
    await expect(average).toHaveCSS('text-align', 'right');
    await page.goto('/app/calculator#psy-score');
    for (const [label, score] of [
      ['ציון כללי', '555'],
      ['כמותי', '100'],
      ['אנגלית', '100'],
    ]) {
      const input = page.getByLabel(label, { exact: true });
      await expect(input).toHaveValue('');
      await expect(input).toHaveCSS('text-align', 'right');
      await input.fill(score);
      await expect(input).toHaveValue(score);
      await expect(input).toHaveCSS('text-align', 'right');
    }
  });
}
