import { expect, test } from './fixtures';
import { psychometricDates } from '../src/data/psychometricDates';
import { getSittingStatuses } from '../src/lib/psychometricDates';

for (const width of [1280, 390]) {
  test(`official psychometric dates and registration status at ${width}px`, async ({
    page,
    baseURL,
  }) => {
    const origin = new URL(baseURL ?? 'http://localhost:3000').origin;
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
    await page.route('**/api/enquiries**', (route) => route.abort());
    await page.setViewportSize({ width, height: 900 });
    const before = new Date();
    await page.goto('/psychometric-dates');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('מועדי פסיכומטרי 2026–2027');
    // Accept either side if Jerusalem midnight crossed the request; the server clock stays real.
    const statuses = getSittingStatuses(psychometricDates, before);
    const afterStatuses = getSittingStatuses(psychometricDates, new Date());
    const rows = main.locator('tbody tr');
    const actualRows = await rows.allTextContents();
    const matches = (expected: typeof statuses) =>
      expected.length === actualRows.length &&
      expected.every(
        ({ sitting, registrationOpen, isNextOpen }, index) =>
          actualRows[index].includes(sitting.displayLabel) &&
          actualRows[index].includes('ההרשמה נסגרה') === !registrationOpen &&
          actualRows[index].includes('המועד הקרוב') === isNextOpen,
      );
    expect(matches(statuses) || matches(afterStatuses)).toBe(true);
    await expect(
      main.getByRole('link', { name: 'בדיקת סיכויי קבלה', exact: true }),
    ).toHaveAttribute('href', '/sekhem-calculator');
    await expect(page.locator('header nav a[href="/psychometric-dates"]')).toHaveCount(0);
    await expect(main).not.toContainText('סכם');
    await page.getByText('שפות הבחינה, מחיר ומידע נוסף', { exact: true }).click();
    await expect(main.getByRole('heading', { name: 'שפות לפי מועד' })).toBeVisible();
    for (const target of await main.locator('a:visible, summary:visible').all()) {
      const box = await target.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
