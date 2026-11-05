import { expect, test } from './fixtures';

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
        test.setTimeout(150_000);
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
        const waitForEvaluation = () =>
          page.waitForResponse(
            (response) =>
              response.url().endsWith('/api/admissions/evaluate') &&
              response.request().postDataJSON()?.degreeIds?.includes(degreeId),
          );
        const evaluation = waitForEvaluation();
        await page.goto('/app/calculator#detail');
        let response = await evaluation;
        if (response.status() === 429) {
          // Same allowance as Batch A/B: preview shares one client IP → 12 req/min.
          await new Promise((resolve) => setTimeout(resolve, 60_000));
          const retry = waitForEvaluation();
          await page.reload();
          response = await retry;
        }
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
        // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 16)
        await expect(
          main.getByRole('button', { name: 'קבלו שיחה מהמוסד', exact: true }),
        ).toBeVisible();
        await expect(main.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
        await expect(
          // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 15)
          main.getByRole('button', { name: 'השלימו וקבלו תשובה', exact: true }),
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
