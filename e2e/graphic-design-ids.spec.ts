import { expect, test } from '@playwright/test';

for (const [oldId, destination] of [
  ['jerusalem_academy_graphic_design', '/programs/jerusalem_academy_dance'],
  ['rubin_graphic_design', '/programs/rubin_classical'],
  ['spieldocs_graphic_design', '/institutions/spieldocs'],
]) {
  test(`${oldId} returns 308`, async ({ request }) => {
    const response = await request.get(`/programs/${oldId}`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(new URL(response.headers().location, response.url()).pathname).toBe(destination);
  });
}

for (const width of [390, 1440]) {
  test(`correct programme content and sources at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [id, name] of [
      ['jerusalem_academy_dance', 'תואר ראשון במחול'],
      ['rubin_classical', 'תואר ראשון במוזיקה'],
    ]) {
      await page.goto(`/programs/${id}`);
      await expect(page.locator('h1')).toHaveText(name);
      await expect(page.getByText('עודכן לאחרונה: 24.10.2026', { exact: false })).toBeVisible();
      const schema = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(schema.join('')).toContain('P48M');
      expect(schema.join('')).not.toContain('_graphic_design');
      expect(await page.locator('h1').evaluate((el) => getComputedStyle(el).textAlign)).toBe(
        'right',
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    }
    await page.goto('/institutions/spieldocs');
    expect(
      (await page.locator('script[type="application/ld+json"]').allTextContents()).join(''),
    ).toContain('https://www.jsfs.co.il/');
    await expect(page.locator('a[href*="spieldocs_graphic_design"]')).toHaveCount(0);
  });
}
