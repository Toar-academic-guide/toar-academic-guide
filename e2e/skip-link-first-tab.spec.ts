import { expect, test } from './fixtures';

for (const path of ['/', '/app/calculator']) {
  for (const width of [1280, 390]) {
    test(`skip link gets the first Tab on ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'דלג לתוכן הראשי' })).toBeFocused();
    });
  }
}
