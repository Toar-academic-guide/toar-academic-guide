import { expect, test } from './fixtures';

const targets = [
  ['bezalel_industrial_design', 'bezalel', 'eligible_to_apply'],
  ['shenkar_fashion', 'shenkar', 'eligible_to_apply'],
  ['samspiegel_cinema', 'spieldocs', 'eligible_to_apply'],
  ['jerusalem_academy_dance', 'jerusalem_academy', 'eligible_to_apply'],
  ['jerusalem_academy_classical', 'jerusalem_academy', 'eligible_to_apply'],
  ['jerusalem_academy_jazz', 'jerusalem_academy', 'eligible_to_apply'],
  ['telhai_nursing', 'telhai', 'eligible_to_apply'],
  ['ono_nursing', 'ono', 'accepted'],
] as const;

for (const width of [390, 1440]) {
  for (const [degreeId, institutionId, decision] of targets) {
    test(`${degreeId} shows honest manual path at ${width}px`, async ({ page }, testInfo) => {
      test.setTimeout(120_000);
      await page.setExtraHTTPHeaders({
        'x-forwarded-for': `198.51.100.${140 + targets.findIndex(([id]) => id === degreeId) + (width === 390 ? 0 : 20)}`,
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
                    ],
                  },
                },
                psychometric: { overall: 740, quantitative: 130, english: 100 },
              },
            }),
          );
        },
        { degreeId, institutionId },
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
        capability: 'manual_gate',
        kind: 'manual_gate',
        decision,
      });
      if (degreeId === 'ono_nursing') {
        expect(result.scoreAssessment).toBe('meets_threshold');
        expect(result.additionalConditions).toContainEqual(
          expect.objectContaining({ id: 'admissions_committee', status: 'unconfirmed' }),
        );
        await expect(page.locator('.journey-status')).toHaveText('מתקבלים');
        // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 11)
        const footnote = page.getByText('השלב הבא: ריאיון קבלה.', {
          exact: true,
        });
        await expect(footnote).toBeVisible();
        await expect(footnote).toHaveClass(/text-slate-400/);
        await expect(footnote).toHaveCSS('font-size', '12px');
        await expect(footnote).toHaveCSS('text-align', 'right');
        await expect(page.getByRole('heading', { name: 'תנאים נוספים לבדיקה' })).toHaveCount(0);
      } else {
        expect(result.scoreAssessment).toBeUndefined();
        await expect(page.locator('.journey-status')).toHaveText('אפשר להגיש מועמדות');
      }
      if (degreeId === 'jerusalem_academy_classical') {
        await expect(page.getByText(/במחלקות כלי מקלדת.*160 נקודות זכות/)).toBeVisible();
      }
      if (degreeId === 'jerusalem_academy_jazz' || degreeId === 'jerusalem_academy_dance') {
        await expect(page.getByText(/(?:160|0) נקודות זכות/)).toHaveCount(0);
      }
      expect(result.requiredInputs).toBeUndefined();
      await expect(page.locator('.journey-result-explanation')).toHaveText(result.explanation);
      const main = page.getByRole('main');
      // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 16)
      await expect(
        main.getByRole('button', { name: 'קבלו שיחה מהמוסד', exact: true }),
      ).toBeVisible();
      await expect(main.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
      await expect(main.getByRole('textbox', { name: /מתואם|סכם|מצרף|ציון קבלה/ })).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${degreeId}-${width}px.png`),
        fullPage: true,
      });
    });
  }
}
