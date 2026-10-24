import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`Technion programme pages show the official verification notice at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    for (const id of ['ee', 'me']) {
      await page.goto(`/programs/technion_${id}`);
      const notice = page
        .locator('div')
        .filter({ has: page.locator('> p > time[datetime="2026-10-25"]') });
      await expect(notice).toBeVisible();
      await expect(notice).toHaveCSS('text-align', 'right');
      await expect(notice.getByRole('link', { name: 'הטכניון', exact: true })).toHaveAttribute(
        'href',
        /admissions\.technion\.ac\.il\/sechem-for-admission\//,
      );
      if (id === 'ee')
        await expect(notice).toContainText(
          'באביב תשפ"ז: 94 — על בסיס מקום פנוי, מספר המקומות מצומצם',
        );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (['ee', 'me'].includes(id))
        await page.screenshot({ path: testInfo.outputPath(`${id}-${width}.png`), fullPage: true });
    }
  });

  test(`EE verdict 92 keeps spring 94 in note text at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    // Evaluator boundaries are exercised with official HTML in the unit suite;
    // this response isolates rendering of its accepted result.
    await page.route('**/api/admissions/evaluate', async (route) => {
      const input = route.request().postDataJSON();
      const result = {
        linkedInstitutionId: 'technion',
        institution: { id: 'technion', name: 'הטכניון – מכון טכנולוגי לישראל' },
        kind: 'exact',
        capability: 'exact',
        decision: 'accepted',
        confidence: 'high',
        score: 92,
        threshold: 91.5,
        sourceLabel: 'תנאי קבלה',
        explanation: 'הציון עומד בסף הקבלה.',
        nextAction: 'בדקו את התנאים באתר הטכניון.',
      };
      const report = {
        input,
        program: { id: 'technion_ee', name: 'הנדסת חשמל' },
        results: [result],
        generatedAt: '2026-10-25T00:00:00Z',
        evaluatorVersion: 'test',
        inputDigest: 'test',
      };
      await route.fulfill({
        json: {
          data: input.degreeIds
            ? { reports: { technion_ee: report }, failedDegreeIds: [] }
            : report,
        },
      });
    });
    await page.addInitScript(() =>
      sessionStorage.setItem(
        'myway_study_journey_v2',
        JSON.stringify({
          fields: [],
          locations: ['all'],
          types: ['all'],
          selectedRowId: 'technion_ee:technion',
          scores: { bagrut: { weightedAverage: 110 }, psychometric: { overall: 750 } },
        }),
      ),
    );
    await page.goto('/app/calculator#detail');
    await expect(page.locator('.journey-result-explanation')).toHaveText('הציון עומד בסף הקבלה.');
    await expect(
      page.getByRole('main').getByText('עומד/ת בסף שחושב', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('באביב תשפ"ז: 94 — על בסיס מקום פנוי, מספר המקומות מצומצם'),
    ).toBeVisible();
    await expect(page.getByText(/סף: 91.5/)).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('button', { name: 'יצירת קשר', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'שמירה לרשימה', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`ee-verdict-${width}.png`), fullPage: true });
  });
}
