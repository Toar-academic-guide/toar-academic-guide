import { expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/enquiries**', (route) => route.abort());
});

for (const width of [390, 1280]) {
  test.describe(`sitewide calculator links at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });

    for (const path of [
      '/',
      '/programs',
      '/institutions',
      '/programs/psychology',
      '/institutions/tau',
      '/about',
    ]) {
      test(`links to the public calculator on ${path}`, async ({ page }) => {
        await page.goto(path);
        const nav = page.locator('header').getByRole('navigation', { name: 'ניווט ראשי' });
        if (width === 390) {
          await nav.getByRole('button', { name: 'תפריט ניווט' }).click();
        }
        await expect(nav.getByRole('link', { name: 'מה הסיכויים שלי?' })).toHaveAttribute(
          'href',
          '/sekhem-calculator',
        );
        await nav.getByRole('button', { name: 'מחשבונים' }).click();
        await expect(nav.getByRole('link', { name: 'בדיקת סיכויי קבלה' })).toHaveAttribute(
          'href',
          '/sekhem-calculator',
        );
        await expect(nav.locator('a[href="/app/calculator"]')).toHaveCount(0);
        if (path === '/') {
          await expect(page.locator('a.journey-hero-cta')).toHaveAttribute(
            'href',
            '/app/calculator',
          );
        }
      });
    }

    test('marks the top calculator link as current on /sekhem-calculator', async ({ page }) => {
      await page.goto('/sekhem-calculator');
      const nav = page.getByRole('navigation', { name: 'ניווט ראשי' });
      if (width === 390) {
        await nav.getByRole('button', { name: 'תפריט ניווט' }).click();
      }
      await expect(nav.getByRole('link', { name: 'מה הסיכויים שלי?' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });
  });
}
