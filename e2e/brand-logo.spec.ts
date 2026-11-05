import { expect, test } from './fixtures';

for (const width of [390, 1280]) {
  test(`header wordmark at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const header = page.locator('header');
    const logo = header.getByRole('img', { name: 'MyWay', exact: true });
    await expect(logo).toHaveAttribute('src', '/brand/myway-wordmark.svg');
    await expect(header.getByRole('link', { name: 'MyWay', exact: true })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(logo).toBeVisible();
    await expect
      .poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
    const box = (await logo.boundingBox())!;
    if (width === 390) {
      expect(box.height).toBeGreaterThanOrEqual(30);
      expect(box.height).toBeLessThanOrEqual(34);
      await expect(header.getByRole('button', { name: 'תפריט ניווט' })).toBeVisible();
      await expect(header.getByRole('link', { name: 'מה הסיכויים שלי?' })).toBeHidden();
    } else {
      expect(box.height).toBeCloseTo(39.9, 1);
      const columns = await header.evaluate((element) =>
        getComputedStyle(element).gridTemplateColumns.split(' ').map(parseFloat),
      );
      expect(columns).toHaveLength(3);
      expect(columns[0]).toBeCloseTo(columns[2], 1);
      const group = (await header
        .getByRole('link', { name: 'מה הסיכויים שלי?' })
        .locator('..')
        .boundingBox())!;
      expect(Math.abs(group.x + group.width / 2 - width / 2)).toBeLessThanOrEqual(4);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await testInfo.attach(`header-${width}`, {
      body: await header.screenshot(),
      contentType: 'image/png',
    });
  });
}

test('manifest, app icons and Organization logo resolve in the browser', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/site.webmanifest');
  const response = await request.get('/site.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.theme_color).toBe('#698AED');
  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }
  const icons = page.locator('link[rel="icon"], link[rel="apple-touch-icon"]');
  await expect(icons).toHaveCount(3);
  for (const href of await icons.evaluateAll((elements) =>
    elements.map((el) => el.getAttribute('href')!),
  )) {
    expect((await request.get(href)).ok()).toBe(true);
  }
  const organization = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts
        .flatMap((script) => JSON.parse(script.textContent!)['@graph'] ?? [])
        .find((node) => node['@type'] === 'Organization'),
    );
  expect(organization.logo).toBe('https://findmyway.co.il/brand/myway-wordmark-1200.png');
  expect((await request.get('/brand/myway-wordmark-1200.png')).ok()).toBe(true);
});
