import { expect, test } from './fixtures';

const cases = [
  {
    id: 'ee-conflicting',
    program: 'biu_ee',
    bagrut: 100,
    psychometric: 650,
    quantitative: 132,
    mathGrade: 90,
    decision: 'unknown',
  },
  {
    id: 'ee-below',
    program: 'biu_ee',
    bagrut: 100,
    psychometric: 649,
    quantitative: 132,
    mathGrade: 90,
    decision: 'below',
  },
  {
    id: 'cs-alternative',
    program: 'biu_cs',
    bagrut: 100,
    psychometric: 650,
    quantitative: 132,
    mathGrade: 92,
    decision: 'unknown',
  },
  {
    id: 'comp-bio-no-psych',
    program: 'biu_computational_bio',
    bagrut: 100,
    psychometric: undefined,
    quantitative: undefined,
    mathGrade: 80,
    decision: 'below',
  },
];

for (const width of [1280, 390])
  for (const profile of cases) {
    test(`${profile.id} floors at ${width}px`, async ({ page }, testInfo) => {
      test.setTimeout(150_000);
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      const calculatorRequests: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('https://shoham.biu.ac.il/**', (route) => {
        calculatorRequests.push(route.request().url());
        return route.abort();
      });
      await page.addInitScript(
        (profile) =>
          sessionStorage.setItem(
            'myway_study_journey_v2',
            JSON.stringify({
              fields: [],
              locations: ['all'],
              types: ['all'],
              selectedRowId: `${profile.program}:biu`,
              scores: {
                bagrut: {
                  weightedAverage: profile.bagrut,
                  subjectRecord: {
                    schemaVersion: 1,
                    sector: 'jewish',
                    subjects: [
                      { subjectId: 'mathematics', units: 5, grade: profile.mathGrade },
                      { subjectId: 'physics', units: 5, grade: 85 },
                    ],
                  },
                },
                psychometric: {
                  overall: profile.psychometric,
                  quantitative: profile.quantitative,
                  english: 85,
                },
              },
            }),
          ),
        profile,
      );
      const waitForEvaluation = () =>
        page.waitForResponse(
          (response) =>
            response.url().endsWith('/api/admissions/evaluate') &&
            response.request().postDataJSON()?.degreeIds?.includes(profile.program),
        );
      const evaluated = waitForEvaluation();
      await page.goto(width === 1280 ? '/#detail' : '/app/calculator#detail');
      let response = await evaluated;
      if (response.status() === 429) {
        await new Promise((resolve) => setTimeout(resolve, 60_000));
        const retry = waitForEvaluation();
        await page.reload();
        response = await retry;
      }
      expect(response.status()).toBe(200);
      const result = (await response.json()).data.reports[profile.program].results.find(
        (r: { linkedInstitutionId: string }) => r.linkedInstitutionId === 'biu',
      );
      expect(result.decision).toBe(profile.decision);
      expect(result.floorChecks.length).toBeGreaterThan(0);
      const table = page.getByRole('table', { name: 'בדיקת תנאי הסף לפי הציונים שלך' });
      await expect(table).toBeVisible();
      await expect(table).toHaveCSS('text-align', 'right');
      const explanation = page.locator('.journey-result-explanation');
      await expect(explanation).toHaveText(result.explanation);
      await expect(explanation).toHaveCSS('text-align', 'right');
      if (profile.id === 'ee-conflicting') {
        await expect(table).toContainText('מקורות סותרים');
        await expect(table).toContainText('בדף הפקולטה באנגלית ובדף מועמדי חו"ל מופיע 650');
        await expect(explanation).not.toContainText('אלא אם');
      }
      if (profile.decision === 'below') {
        await expect(
          page.locator('.journey-status').filter({ hasText: 'לא עומד/ת בתנאי הסף' }),
        ).toBeVisible();
        await expect(explanation).toContainText('אלא אם את/ה זכאי/ת למסלול מילואימניקים');
      }
      const link = page.getByRole('link', { name: 'המחשבון הרשמי של בר-אילן', exact: true });
      await expect(link).toHaveAttribute(
        'href',
        'https://shoham.biu.ac.il/kabala/?utm_source=myway&utm_medium=referral',
      );
      await expect(
        page.getByRole('main').getByRole('button', { name: 'יצירת קשר', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('main').getByRole('button', { name: 'שמירה לרשימה', exact: true }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(errors).toEqual([]);
      expect(calculatorRequests).toEqual([]);
      await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
      await page.screenshot({
        path: testInfo.outputPath(`${profile.id}-${width}.png`),
        fullPage: true,
      });
    });
  }
