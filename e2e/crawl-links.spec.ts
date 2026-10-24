import { expect, test } from '@playwright/test';

function anchors(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
}

// PM trim spec: 12 subjects + 8 institutions on the homepage, collapsed by default.
test('homepage browse links are in raw HTML inside a collapsed details', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('עזרו לי לבחור מה ללמוד');
  const browse = html.split('aria-labelledby="browse-title"')[1] ?? '';
  const details = browse.slice(browse.indexOf('<details'), browse.indexOf('</details>'));
  expect(details.startsWith('<details>')).toBe(true);
  const hrefs = anchors(details);
  expect(hrefs.filter((href) => /^\/programs\/[^/]+$/.test(href))).toHaveLength(12);
  expect(hrefs.filter((href) => /^\/institutions\/[^/]+$/.test(href))).toHaveLength(8);
  expect(hrefs).toContain('/programs');
  expect(hrefs).toContain('/institutions');
  const footer = anchors(html.split('<footer')[1] ?? '');
  expect(footer).toEqual(['/programs', '/institutions', '/about']);
});

test('subject index is indexable, self-canonical and lists every hub', async ({ request }) => {
  const response = await request.get('/programs');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<link rel="canonical" href="https://findmyway.co.il/programs"/>');
  expect(html).not.toMatch(/<meta[^>]+name="robots"[^>]+noindex/);
  expect(response.headers()['x-robots-tag'] ?? '').not.toContain('noindex');
  const main = html.split('<main')[1]?.split('</main>')[0] ?? '';
  const hubs = anchors(main);
  expect(hubs.length).toBeGreaterThanOrEqual(23);
  for (const href of ['/programs/cs', '/programs/engineering', '/programs/occupational_therapy'])
    expect(hubs).toContain(href);
});

test('sitemap lists the subject index with a real lastmod', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  const entry = xml.match(
    /<url>\s*<loc>https:\/\/findmyway\.co\.il\/programs<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/,
  );
  expect(entry).not.toBeNull();
  expect(Number.isFinite(Date.parse(entry![1]))).toBe(true);
});

for (const [id, hub, minimum] of [
  ['tau_cs', 'cs', 3],
  ['haifa_engineering', 'engineering', 3],
  ['huji_occupational_therapy', 'occupational_therapy', 1],
] as const) {
  test(`${id} has its hub and siblings in raw HTML`, async ({ request }) => {
    const response = await request.get(`/programs/${id}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    const section = html.split('aria-labelledby="related-title"')[1]?.split('</section>')[0] ?? '';
    const hrefs = anchors(section);
    expect(hrefs).toContain(`/programs/${hub}`);
    expect(hrefs).not.toContain(`/programs/${id}`);
    const siblings = hrefs.filter((href) => href !== `/programs/${hub}`);
    expect(siblings.length).toBeGreaterThanOrEqual(minimum);
    expect(siblings.length).toBeLessThanOrEqual(8);
  });
}

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`browse links stay collapsed, readable and right-aligned at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'עזרו לי לבחור מה ללמוד' })).toBeVisible();
    const browse = page.locator('section[aria-labelledby="browse-title"]');
    await expect(browse).toBeVisible();
    await expect(browse).toHaveCSS('text-align', 'right');
    await expect(page.getByRole('navigation')).toHaveCount(1);
    const subjects = browse.locator('a[href^="/programs/"]');
    await expect(subjects.first()).toBeHidden();
    await browse.locator('summary').click();
    await expect(subjects).toHaveCount(12);
    await expect(subjects.first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    await footer.getByRole('link', { name: 'תחומי לימוד', exact: true }).click();
    await expect(page).toHaveURL(/\/programs$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('תחומי לימוד');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('link', { name: 'מדעי המחשב', exact: true }).click();
    await expect(page).toHaveURL(/\/programs\/cs$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('מדעי המחשב');
  });
}

test('collapsed browse links and the subject index work without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const page = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 900 },
  });
  try {
    await page.goto(`${baseURL}/`);
    const browse = page.locator('section[aria-labelledby="browse-title"]');
    await browse.locator('summary').click();
    await expect(browse.locator('a[href^="/institutions/"]').first()).toBeVisible();
    await page.getByRole('contentinfo').getByRole('link', { name: 'תחומי לימוד' }).click();
    await expect(page).toHaveURL(/\/programs$/);
    await page.getByRole('link', { name: 'מדעי המחשב', exact: true }).click();
    await expect(page).toHaveURL(/\/programs\/cs$/);
  } finally {
    await page.close();
  }
});
