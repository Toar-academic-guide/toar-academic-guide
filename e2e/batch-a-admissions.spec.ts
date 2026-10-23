import { expect, test } from '@playwright/test';

const targets = [
  ['telhai_cs', 'telhai'],
  ['telhai_biology', 'telhai'],
  ['ono_cs', 'ono'],
  ['ono_business', 'ono'],
  ['ruppin_cs', 'ruppin'],
  ['reichman_business', 'reichman'],
  ['reichman_economics', 'reichman'],
  ['colmgmt_accounting', 'colman'],
  ['colmgmt_infosystems', 'colman'],
] as const;

for (const width of [390, 1440]) {
  for (const [degreeId, institutionId] of targets) {
    test(`${degreeId} keeps Contact, Save and pending score visible at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setExtraHTTPHeaders({
        'x-forwarded-for': `198.51.100.${100 + targets.findIndex(([id]) => id === degreeId) + (width === 390 ? 0 : 20)}`,
      });
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        ({ degreeId, institutionId }) => {
          sessionStorage.setItem(
            'myway_study_journey_v2',
            JSON.stringify({
              fields: [],
              locations: ['all'],
              types: ['all'],
              selectedRowId: `${degreeId}:${institutionId}`,
              scores: {
                bagrut: {
                  weightedAverage: 110,
                  subjectRecord: {
                    schemaVersion: 1,
                    sector: 'jewish',
                    subjects: [
                      { subjectId: 'mathematics', units: 5, grade: 100 },
                      { subjectId: 'english', units: 5, grade: 95 },
                      { subjectId: 'physics', units: 5, grade: 85 },
                    ],
                  },
                },
                psychometric: { overall: 740, quantitative: 130 },
              },
            }),
          );
        },
        { degreeId, institutionId },
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
      expect(result).toMatchObject({ decision: 'pending', scoreAssessment: 'meets_threshold' });
      expect(result.requiredInputs).toBeUndefined();
      await expect(page.locator('.journey-result-explanation')).toHaveText(result.explanation);
      const main = page.getByRole('main');
      await expect(main.getByRole('button', { name: 'יצירת קשר', exact: true })).toBeVisible();
      await expect(main.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
      await expect(main.getByRole('textbox', { name: /מתואם|סכם|מצרף|ציון קבלה/ })).toHaveCount(0);
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
