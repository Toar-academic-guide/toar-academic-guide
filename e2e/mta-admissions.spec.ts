import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
      const evaluated = page.waitForResponse(
        (r) =>
          r.url().endsWith('/api/admissions/evaluate') &&
          r.request().postDataJSON()?.degreeIds?.includes(c.program),
      );
      await page.goto(width === 1440 ? '/#detail' : '/app/calculator#detail');
      const response = await evaluated;
      expect(response.status()).toBe(200);
      const result = (await response.json()).data.reports[c.program].results.find(
        (r: { linkedInstitutionId: string }) => r.linkedInstitutionId === 'mta',
      );
      expect(result).toMatchObject({ decision: c.decision, kind: c.kind });
      await expect(page.locator('.journey-result-explanation')).toHaveText(result.explanation);
      const main = page.getByRole('main');
      await expect(main.getByRole('button', { name: 'יצירת קשר', exact: true })).toBeVisible();
      await expect(main.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
      await expect(main).not.toContainText(
        /מינימלי: 72|מינימלי: 440|מינימלי: 70|מינימלי: 450|עם ביולוגיה|מתואם|requirements_only/,
      );
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

  test(`both program pages show the sourced conditions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const program of ['tlvyaffo_nursing', 'tlvyaffo_business']) {
      await page.goto(`/programs/${program}`);
      await expect(page.getByRole('heading', { name: 'תנאי קבלה', exact: true })).toBeVisible();
      const main = page.getByRole('main');
      await expect(main).not.toContainText(
        /מינימלי: 72|מינימלי: 440|מינימלי: 70|מינימלי: 450|עם ביולוגיה|מתואם/,
      );
      await expect(main).toContainText(
        program === 'tlvyaffo_nursing' ? 'פסיכומטרי 520' : 'בגרות 96',
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
}
