import { expect, test } from '@playwright/test';

const targets = [
  ['ariel_cs', 'ariel'],
  ['ariel_me', 'ariel'],
  ['sports_science', 'wingate'],
  ['mon_12341143672_business', 'mon_12341143672'],
] as const;

for (const width of [390, 1440]) {
  for (const [degreeId, institutionId] of targets) {
    for (const withScores of degreeId === 'ariel_cs' ? [false, true] : [true]) {
      test(`${degreeId} shows honest unsupported result at ${width}px ${withScores ? 'with' : 'without'} scores`, async ({
        page,
      }, testInfo) => {
        test.setTimeout(90_000);
        await page.setExtraHTTPHeaders({
          'x-forwarded-for': `198.51.100.${180 + targets.findIndex(([id]) => id === degreeId) + (width === 390 ? 0 : 20) + (withScores ? 0 : 40)}`,
        });
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(
          ({ degreeId, institutionId, withScores }) => {
            sessionStorage.setItem(
              'myway_study_journey_v2',
              JSON.stringify({
                fields: [],
                locations: ['all'],
                types: ['all'],
                selectedRowId: `${degreeId}:${institutionId}`,
                scores: withScores
                  ? { bagrut: { weightedAverage: 120 }, psychometric: { overall: 800 } }
                  : {},
              }),
            );
          },
          { degreeId, institutionId, withScores },
        );
        const evaluation = page.waitForResponse(
          (response) =>
            response.url().endsWith('/api/admissions/evaluate') &&
            response.request().postDataJSON()?.degreeIds?.includes(degreeId),
        );
        await page.goto('/app/calculator#detail');
        const response = await evaluation;
        expect(response.status()).toBe(200);
        const result = (await response.json()).data.reports[degreeId].results.find(
          (entry: { linkedInstitutionId: string }) => entry.linkedInstitutionId === institutionId,
        );
        expect(result).toMatchObject({
          capability: 'unsupported',
          kind: 'unsupported',
          decision: 'unknown',
        });
        expect(result.scoreAssessment).toBeUndefined();
        expect(result.score).toBeUndefined();
        expect(result.requiredInputs).toBeUndefined();
        expect(result.explanation).not.toMatch(/מתואם|סכם|מצרף|[a-zA-Z]/);
        const explanation = page.locator('.journey-result-explanation');
        await expect(explanation).toHaveText(result.explanation);
        expect(
          await explanation.evaluate((element) => getComputedStyle(element).textAlign),
        ).toMatch(/right|start/);
        const main = page.getByRole('main');
        await expect(main.getByText(result.nextAction, { exact: true })).toBeVisible();
        await expect(main.getByRole('button', { name: 'יצירת קשר', exact: true })).toBeVisible();
        await expect(main.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
        await expect(
          main.getByRole('button', { name: 'השלמת נתונים לחישוב', exact: true }),
        ).toHaveCount(0);
        await expect(main.getByRole('textbox', { name: /מתואם|סכם|מצרף|ציון קבלה/ })).toHaveCount(
          0,
        );
        await expect(main).not.toContainText(
          /automation_or_alternate|Evidence points|Cloudflare|manual_gate|פרויקט אימות/,
        );
        const officialLink = main.getByRole('link', { name: 'לאתר המוסד', exact: true });
        await expect(officialLink).toBeVisible();
        const href = new URL((await officialLink.getAttribute('href'))!);
        expect(href.searchParams.get('utm_source')).toBe('myway');
        expect(href.searchParams.get('utm_medium')).toBe('referral');
        expect(href.hostname).not.toMatch(/yoram|walla|michlalot/);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`${degreeId}-${width}-${withScores ? 'filled' : 'empty'}.png`),
          fullPage: true,
        });
      });
    }
  }
}
