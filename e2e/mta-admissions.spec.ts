import { expect, test } from '@playwright/test';
import official from '../docs/admissions-verification/2026-10-23-mta-catalogue-nursing-business.json';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ApiEnvelope, CatalogueProgram } from '../src/types/catalogue';

let catalogueHasOfficialData = false;

test.beforeAll(async ({ request }) => {
  const response = await request.get('/api/catalog/programs');
  expect(response.ok()).toBe(true);
  const catalogue: ApiEnvelope<CatalogueProgram[]> = await response.json();
  const business = catalogue.data?.find((program) => program.id === 'tlvyaffo_business');
  const nursing = catalogue.data?.find((program) => program.id === 'tlvyaffo_nursing');
  expect(business).toBeDefined();
  expect(nursing).toBeDefined();
  catalogueHasOfficialData =
    business!.name === official['tlvyaffo_business:mta'].display_name &&
    nursing!.admissionRequirements.includes(official['tlvyaffo_nursing:mta'].reqs[0]);
});

function officialCatalogueApplied() {
  if (!catalogueHasOfficialData) {
    test.info().annotations.push({
      type: 'mta-catalogue-db-pending',
      description:
        'production catalogue not yet updated by mta nursing/business apply.sql; DB-text assertions skipped',
    });
  }
  return catalogueHasOfficialData;
}

const evidence = resolve('docs/ui-verification/2026-10-23-mta-nursing-business');
const cases = [
  {
    id: 'nursing-weak',
    program: 'tlvyaffo_nursing',
    bagrut: 70,
    psychometric: 420,
    math: false,
    decision: 'below',
    kind: 'manual_gate',
  },
  {
    id: 'business-weak',
    program: 'tlvyaffo_business',
    bagrut: 70,
    psychometric: 420,
    math: false,
    decision: 'below',
    kind: 'manual_gate',
  },
  {
    id: 'nursing-automatic',
    program: 'tlvyaffo_nursing',
    bagrut: 90,
    psychometric: 520,
    math: false,
    decision: 'pending',
    kind: 'manual_gate',
  },
  {
    id: 'nursing-committee',
    program: 'tlvyaffo_nursing',
    bagrut: 85,
    psychometric: 480,
    math: false,
    decision: 'pending',
    kind: 'manual_gate',
  },
  {
    id: 'business-match',
    program: 'tlvyaffo_business',
    bagrut: 94,
    psychometric: 550,
    math: true,
    decision: 'pending',
    kind: 'manual_gate',
  },
  {
    id: 'business-missing-math',
    program: 'tlvyaffo_business',
    bagrut: 94,
    psychometric: 550,
    math: false,
    decision: 'unknown',
    kind: 'needs_input',
  },
];

for (const width of [1440, 390]) {
  for (const c of cases) {
    test(`${c.id} at ${width}px uses the real API and shows student-facing results`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.setExtraHTTPHeaders({ 'x-forwarded-for': '198.51.100.43' });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript((c) => {
        sessionStorage.setItem(
          'myway_study_journey_v2',
          JSON.stringify({
            fields: [],
            locations: ['all'],
            types: ['all'],
            selectedRowId: `${c.program}:mta`,
            scores: {
              bagrut: {
                weightedAverage: c.bagrut,
                ...(c.math && {
                  subjectRecord: {
                    schemaVersion: 1,
                    sector: 'jewish',
                    subjects: [{ subjectId: 'mathematics', units: 4, grade: 80 }],
                  },
                }),
              },
              psychometric: { overall: c.psychometric, english: 85 },
            },
          }),
        );
      }, c);
      test.setTimeout(150_000);
      const waitForEvaluation = () =>
        page.waitForResponse(
          (r) =>
            r.url().endsWith('/api/admissions/evaluate') &&
            r.request().postDataJSON()?.degreeIds?.includes(c.program),
        );
      const evaluated = waitForEvaluation();
      await page.goto(width === 1440 ? '/#detail' : '/app/calculator#detail');
      let response = await evaluated;
      if (response.status() === 429) {
        // Preview shares one client IP → 12 evaluate req/min; mirror Batch A/B/BIU.
        await new Promise((resolve) => setTimeout(resolve, 60_000));
        const retry = waitForEvaluation();
        await page.reload();
        response = await retry;
      }
      expect(response.status()).toBe(200);
      const result = (await response.json()).data.reports[c.program].results.find(
        (r: { linkedInstitutionId: string }) => r.linkedInstitutionId === 'mta',
      );
      expect(result).toMatchObject({ decision: c.decision, kind: c.kind });
      await expect(page.locator('.journey-result-explanation')).toHaveText(result.explanation);
      const main = page.getByRole('main');
      await expect(main.getByRole('button', { name: 'יצירת קשר', exact: true })).toBeVisible();
      await expect(main.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
      if (officialCatalogueApplied()) {
        const value = Object.values(official).find((value) => value.program === c.program)!;
        await expect(main.getByRole('heading', { level: 1 })).toHaveText(value.display_name);
        await expect(main).not.toContainText(
          /מינימלי: 72|מינימלי: 440|מינימלי: 70|מינימלי: 450|עם ביולוגיה|מתואם|requirements_only/,
        );
      }
      expect(
        await page
          .locator('.journey-result-explanation')
          .evaluate((e) => getComputedStyle(e).textAlign),
      ).toBe('right');
      if (c.id === 'business-missing-math') {
        expect(result.requiredInputs).toEqual(['math_units', 'math_grade']);
        await expect(page.locator('.journey-result-explanation')).toContainText('מתמטיקה');
        await expect(page.locator('.journey-result-explanation')).not.toContainText('אנגלית');
      }
      if (c.id === 'nursing-committee') {
        expect(result.additionalConditions).toContainEqual(
          expect.objectContaining({ id: 'mta_nursing_interview', status: 'unconfirmed' }),
        );
        await expect(main).toContainText('ועדת קבלה וראיון אישי');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(errors).toEqual([]);
      mkdirSync(evidence, { recursive: true });
      writeFileSync(
        resolve(evidence, `${c.id}-${width}.json`),
        JSON.stringify(result, null, 2) + '\n',
      );
      await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
      await page.screenshot({ path: resolve(evidence, `${c.id}-${width}.png`), fullPage: true });
    });
  }

  test(`both program pages show the sourced conditions at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const catalogueApplied = officialCatalogueApplied();
    for (const value of Object.values(official)) {
      await page.goto(`/programs/${value.program}`);
      await expect(page.getByRole('heading', { name: 'תנאי קבלה', exact: true })).toBeVisible();
      const main = page.getByRole('main');
      await expect(main).toHaveCSS('text-align', 'right');
      await expect(main.getByRole('link', { name: 'יצירת קשר', exact: true })).toBeVisible();
      if (catalogueApplied) {
        await expect(main.getByRole('heading', { level: 1 })).toHaveText(value.display_name);
        await expect(main).not.toContainText(
          /מינימלי: 72|מינימלי: 440|מינימלי: 70|מינימלי: 450|עם ביולוגיה|מתואם/,
        );
        await main.locator('summary').filter({ hasText: 'תנאים נוספים' }).click();
        for (const requirement of [...value.reqs, ...value.notes]) {
          await expect(main.getByText(requirement, { exact: true })).toBeVisible();
        }
        for (const [label, expectedUrl] of [
          ['לאתר המוסד', value.urls.program],
          ['למחשבון המכללה', value.urls.calculator],
        ]) {
          const link = main.getByRole('link', { name: label, exact: true });
          await expect(link).toBeVisible();
          const url = new URL((await link.getAttribute('href'))!);
          expect(url.searchParams.get('utm_source')).toBe('myway');
          expect(url.searchParams.get('utm_medium')).toBe('referral');
          url.searchParams.delete('utm_source');
          url.searchParams.delete('utm_medium');
          expect(url.href).toBe(expectedUrl);
        }
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
