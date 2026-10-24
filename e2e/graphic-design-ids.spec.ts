import { expect, test } from '@playwright/test';

test.describe('permanent catalogue redirects', () => {
  test.use({
    extraHTTPHeaders: async ({ extraHTTPHeaders }, use) => {
      // Vercel's cookie-setting header adds a 307 before the application redirect.
      // Keep bypass authentication while checking the application's first response.
      await use(
        Object.fromEntries(
          Object.entries(extraHTTPHeaders ?? {}).filter(
            ([name]) => name.toLowerCase() !== 'x-vercel-set-bypass-cookie',
          ),
        ),
      );
    },
  });

  for (const [oldId, destination] of [
    ['jerusalem_academy_graphic_design', '/programs/jerusalem_academy_dance'],
    ['rubin_graphic_design', '/programs/rubin_classical'],
    ['spieldocs_graphic_design', '/institutions/spieldocs'],
    ['samspiegel_documentary', '/institutions/spieldocs'],
    ['documentary', '/programs/cinema'],
  ]) {
    test(`${oldId} returns 308`, async ({ request }) => {
      for (const query of ['', '?ref=saved']) {
        for (const method of ['get', 'head'] as const) {
          const response = await request[method](`/programs/${oldId}${query}`, {
            maxRedirects: 0,
          });
          expect(response.status()).toBe(308);
          const location = new URL(response.headers().location, response.url());
          expect(location.pathname).toBe(destination);
          expect(location.search).toBe(query);
        }
      }
    });
  }
});

test('sitemap omits retired programme and hub URLs and cinema still has a programme', async ({
  request,
  page,
}) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  for (const id of [
    'jerusalem_academy_graphic_design',
    'rubin_graphic_design',
    'spieldocs_graphic_design',
    'samspiegel_documentary',
    'documentary',
  ]) {
    expect(xml).not.toContain(`<loc>https://findmyway.co.il/programs/${id}</loc>`);
  }
  expect(xml).toContain('<loc>https://findmyway.co.il/programs/cinema</loc>');
  const cinema = await page.goto('/programs/cinema');
  expect(cinema?.status()).toBe(200);
  await expect(page.locator('main[data-page-kind="subject"]')).toBeVisible();
  await expect(page.locator('main a[href="/programs/samspiegel_cinema"]')).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`correct programme content and sources at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [id, name] of [
      ['jerusalem_academy_dance', 'תואר ראשון במחול'],
      ['rubin_classical', 'תואר ראשון במוזיקה'],
      ['jerusalem_academy_classical', 'מוזיקה קלאסית – ביצוע'],
      ['jerusalem_academy_jazz', 'ג׳אז ומוזיקה עכשווית'],
    ]) {
      await page.goto(`/programs/${id}`);
      await expect(page.locator('h1')).toHaveText(name);
      if (id === 'jerusalem_academy_dance' || id === 'rubin_classical') {
        await expect(page.getByText('עודכן לאחרונה: 24.10.2026', { exact: false })).toBeVisible();
      }
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

for (const width of [390, 1440]) {
  test(`homepage retains eight university links in collapsed browse at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const browse = page.locator('details').filter({ has: page.locator('a[href="/programs"]') });
    await expect(browse).not.toHaveAttribute('open');
    const links = browse.locator('a[href^="/institutions/"]');
    await expect(links).toHaveCount(8);
    await expect(browse.locator('a[href="/institutions/spieldocs"]')).toHaveCount(0);
    await browse.locator('summary').click();
    await expect(links.first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}
