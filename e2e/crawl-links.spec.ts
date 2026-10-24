import { expect, test } from '@playwright/test';

function anchors(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
}

test('homepage crawl links are present in raw HTML', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('עזרו לי לבחור מה ללמוד');
  const hrefs = anchors(html);
  expect(
    hrefs.filter((href) => /^\/(institutions|programs)\//.test(href)).length,
  ).toBeGreaterThanOrEqual(20);
  for (const href of [
    '/institutions',
    '/about',
    '/programs/cs',
    '/programs/economics',
    '/programs/business',
  ])
    expect(hrefs).toContain(href);
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
  test(`crawl links remain readable and right-aligned at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'עזרו לי לבחור מה ללמוד' })).toBeVisible();
    const browse = page.locator('[aria-labelledby="browse-title"]');
    await expect(browse).toBeVisible();
    await expect(browse).toHaveCSS('text-align', 'right');
    await expect(page.getByRole('navigation')).toHaveCount(1);
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await footer.locator('summary').click();
    await expect(footer.getByRole('link', { name: 'מדעי המחשב', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'מדעי המחשב', exact: true }).first().click();
    await expect(page).toHaveURL(/\/programs\/cs$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('מדעי המחשב');
  });
}

test('expanded subject menus work without JavaScript', async ({ browser, baseURL }) => {
  const page = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 900 },
  });
  try {
    await page.goto(`${baseURL}/`);
    await page.getByText('תחומים נוספים', { exact: true }).click();
    await expect(
      page.getByRole('link', { name: 'מקצועות היופי', exact: true }).first(),
    ).toBeVisible();
    const footer = page.getByRole('contentinfo');
    await footer.locator('summary').click();
    await footer.getByRole('link', { name: 'מדעי המחשב', exact: true }).click();
    await expect(page).toHaveURL(/\/programs\/cs$/);
  } finally {
    await page.close();
  }
});
