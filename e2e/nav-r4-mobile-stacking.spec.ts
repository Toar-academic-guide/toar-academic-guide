import { expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/enquiries**', (route) => route.abort());
});

for (const viewport of [
  { width: 375, height: 812 },
  { width: 390, height: 844 },
]) {
  test(`mobile menu rows and calculator chevron stack above decoration at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const header = page.locator('header');
    const hamburger = header.getByRole('button', { name: 'תפריט ניווט' });
    await hamburger.click();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    const linksId = (await hamburger.getAttribute('aria-controls'))!.split(' ')[0];
    const links = page.locator(`[id="${linksId}"]`);
    await expect(links).toBeVisible();

    const samples = await links.evaluate((menu) => {
      const rows = Array.from(menu.querySelectorAll('a, button')).filter(
        (row) => row.getBoundingClientRect().height > 0,
      );
      const chevron = menu.querySelector('button svg')!;
      return [...rows, chevron].map((element) => {
        const rect = element.getBoundingClientRect();
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;
        const hit = document.elementFromPoint(x, y);
        return {
          sample: element.textContent?.trim() || 'calculator chevron',
          x,
          y,
          insideMenu: hit !== null && menu.contains(hit),
        };
      });
    });
    expect(samples.length).toBeGreaterThanOrEqual(6);
    for (const sample of samples) {
      expect(sample.insideMenu, JSON.stringify(sample)).toBe(true);
    }
    // Artwork ignores pointer events, so hit testing alone cannot prove paint order.
    const stacking = await header.evaluate((nav) => {
      const backdrop = document.querySelector('[data-way-backdrop]')!;
      return {
        sameContext: nav.parentElement?.parentElement === backdrop.parentElement,
        header: Number(getComputedStyle(nav).zIndex),
        decoration: Number(getComputedStyle(backdrop).zIndex),
        navAncestor: Number(getComputedStyle(nav.parentElement!).zIndex),
      };
    });
    expect(stacking.sameContext).toBe(true);
    expect(stacking.header).toBeGreaterThan(stacking.decoration);
    expect(stacking.navAncestor).toBeGreaterThan(stacking.decoration);
  });
}

for (const width of [375, 1280]) {
  test(`outside click restores the menu trigger focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/');
    const header = page.locator('header');
    const trigger = header.getByRole('button', {
      name: width === 375 ? 'תפריט ניווט' : 'מחשבונים',
    });
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // A real click on non-focusable hero copy lets the browser clear focus first.
    await page.locator('main h1').click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });
}
