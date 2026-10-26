import { expect, test } from './fixtures';
import type { ApiEnvelope, CatalogueProgram } from '../src/types/catalogue';

for (const width of [375, 390, 1280]) {
  for (const withMaths of [false, true]) {
    test(`TAU architecture required cell at ${width}px (maths entered: ${withMaths})`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width, height: 1000 });
      await page.route('**/api/enquiries', (route) =>
        route.request().method() === 'POST' ? route.abort() : route.continue(),
      );
      await page.addInitScript((withMaths) => {
        sessionStorage.setItem(
          'myway_study_journey_v2',
          JSON.stringify({
            fields: [],
            locations: ['all'],
            types: ['all'],
            selectedRowId: 'architecture:tau',
            scores: {
              bagrut: {
                weightedAverage: 110,
                ...(withMaths && {
                  subjectRecord: {
                    schemaVersion: 1,
                    sector: 'jewish',
                    subjects: [{ subjectId: 'mathematics', units: 5, grade: 70 }],
                  },
                }),
              },
              psychometric: { overall: 680, english: 110 },
            },
          }),
        );
      }, withMaths);
      const catalogueResponse = page.waitForResponse(
        (response) => new URL(response.url()).pathname === '/api/catalog/programs',
      );
      await page.goto('/app/calculator#detail');
      const response = await catalogueResponse;
      expect(response.status()).toBe(200);
      const catalogue: ApiEnvelope<CatalogueProgram[]> = await response.json();
      expect(Array.isArray(catalogue.data)).toBe(true);
      const architecture = catalogue.data!.find((program) => program.id === 'architecture');
      test.skip(
        !architecture?.linkedInstitutionIds.includes('tau'),
        'The served catalogue has no architecture:tau row (the static catalogue links architecture only to Technion).',
      );

      const table = page.getByRole('table', { name: 'בדיקת תנאי הסף לפי הציונים שלך' });
      await expect(table).toBeVisible({ timeout: 30_000 });
      await page.evaluate(() => document.fonts.ready);
      const section = table.locator('xpath=ancestor::section[1]');
      await expect(
        section.getByRole('heading', { level: 2, name: 'תנאי קבלה', exact: true }),
      ).toHaveCount(1);
      expect((await section.textContent())?.match(/תנאי קבלה/g)).toHaveLength(1);
      await expect(table.locator('th[scope="rowgroup"]')).toHaveText('דרישות סף');
      await expect(table.locator('td[colspan]')).toHaveCount(0);
      const mathsRow = table
        .getByRole('row')
        .filter({ has: page.getByRole('rowheader', { name: 'מתמטיקה', exact: true }) });
      const required = mathsRow.getByRole('cell').nth(0);
      const lines = required.locator(':scope > span');
      await expect(lines).toHaveText(['5 יח״ל: 70', '4 יח״ל: 80', '3 יח״ל: 90']);
      for (const line of await lines.all()) {
        await expect(line).toHaveCSS('display', 'block');
        await expect(line).toHaveCSS('white-space', 'nowrap');
        const lineTops = await line.evaluate((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return [...new Set([...range.getClientRects()].map((rect) => rect.top))];
        });
        expect(lineTops).toHaveLength(1);
        const fitsCell = await line.evaluate((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          const text = range.getBoundingClientRect();
          const cell = node.closest('td')!.getBoundingClientRect();
          return text.left >= cell.left && text.right <= cell.right;
        });
        expect(fitsCell).toBe(true);
      }
      const metrics = await table.evaluate((node) => {
        const container = node.parentElement!;
        return {
          table: { scrollWidth: node.scrollWidth, clientWidth: node.clientWidth },
          container: { scrollWidth: container.scrollWidth, clientWidth: container.clientWidth },
          page: {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
          },
        };
      });
      for (const measurement of Object.values(metrics)) {
        expect(measurement.scrollWidth).toBeLessThanOrEqual(measurement.clientWidth);
      }
      await testInfo.attach('overflow-metrics', {
        body: JSON.stringify({ width, withMaths, ...metrics }),
        contentType: 'application/json',
      });
      await page.screenshot({
        path: testInfo.outputPath(`tau-architecture-${width}-${withMaths}.png`),
        fullPage: true,
      });
    });
  }
}
