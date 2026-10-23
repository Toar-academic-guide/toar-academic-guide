import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
  for (const degreeId of ['reichman_cs', 'reichman_law', 'reichman_psychology']) {
    test(`${degreeId} shows calculated eligibility and remaining confirmations at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((degreeId) => {
        sessionStorage.setItem(
          'myway_study_journey_v2',
          JSON.stringify({
            fields: [],
            locations: ['all'],
            types: ['all'],
            selectedRowId: `${degreeId}:reichman`,
            scores: {
              bagrut: {
                weightedAverage: 110,
                subjectRecord: {
                  schemaVersion: 1,
                  sector: 'jewish',
                  subjects: [
                    { subjectId: 'mathematics', units: 5, grade: 90 },
                    { subjectId: 'english', units: 5, grade: 95 },
                  ],
                },
              },
              psychometric: { overall: 740 },
            },
          }),
        );
      }, degreeId);
      test.setTimeout(150_000);
      const waitForEvaluation = () =>
        page.waitForResponse(
          (response) =>
            response.url().endsWith('/api/admissions/evaluate') &&
            response.request().postDataJSON()?.degreeIds?.includes(degreeId),
        );
      const evaluated = waitForEvaluation();
      await page.goto('/app/calculator#detail');
      let response = await evaluated;
      if (response.status() === 429) {
        // Preview shares one client IP → 12 evaluate req/min; mirror Batch A/B/BIU.
        await new Promise((resolve) => setTimeout(resolve, 60_000));
        const retry = waitForEvaluation();
        await page.reload();
        response = await retry;
      }
      expect(response.status()).toBe(200);
      const result = (await response.json()).data.reports[degreeId].results.find(
        (entry: { linkedInstitutionId: string }) => entry.linkedInstitutionId === 'reichman',
      );
      expect(result).toMatchObject({
        kind: 'estimated',
        decision: 'pending',
        scoreAssessment: 'meets_threshold',
      });
      expect(result.requiredInputs).toBeUndefined();
      await expect(page.locator('.journey-result-explanation')).toHaveText(result.explanation);
      const main = page.getByRole('main');
      await expect(main.getByRole('button', { name: 'יצירת קשר', exact: true })).toBeVisible();
      await expect(main.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${degreeId}-${width}.png`),
        fullPage: true,
      });
    });
  }
}
