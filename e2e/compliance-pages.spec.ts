import { expect, test } from './fixtures';
import { FOOTER_LEGAL_LINKS, FOOTER_NAV_LINKS } from '../src/lib/footerLinks';

const pages = [
  { path: '/privacy', title: 'מדיניות פרטיות – MyWay' },
  { path: '/terms', title: 'תנאי שימוש – MyWay' },
  { path: '/contact', title: 'יצירת קשר' },
  { path: '/accessibility', title: 'הצהרת נגישות' },
];

for (const { path, title } of pages) {
  test(`${path} serves its approved heading`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
    await expect(page.locator('main#main-content')).toHaveCount(1);
  });
}

// SiteFooter is deliberately unwired: verify its exported destinations directly.
for (const { href } of [...FOOTER_NAV_LINKS, ...FOOTER_LEGAL_LINKS]) {
  test(`footer destination ${href} returns 200`, async ({ request }) => {
    const response = await request.get(href);
    expect(response.status()).toBe(200);
  });
}

for (const width of [1280, 390]) {
  test(`skip link moves keyboard focus into main at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/privacy');
    const skipLink = page.getByRole('link', { name: 'דלג לתוכן הראשי' });
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
  });

  test(`legal pages are RTL without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const { path } of pages) {
      await page.goto(path);
      await expect(page.locator('main')).toHaveCSS('text-align', 'right');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
}
