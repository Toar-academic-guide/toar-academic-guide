import { test, expect } from './fixtures';

for (const width of [1280, 390]) {
  test(`institution subject filtering at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/institutions');
    await expect(
      page.getByRole('heading', { name: 'מוסדות לימוד בישראל', exact: true }),
    ).toBeVisible();
    const fields = page.getByRole('group', { name: 'תחום לימודים', exact: true });
    const programmes = page.getByRole('group', { name: 'תכנית לימודים', exact: true });
    const count = page.getByRole('heading', { level: 2 }).filter({ hasText: /מוסד/ });
    const initialCount = await count.innerText();
    const sort = page.getByRole('combobox', { name: 'מיון' });
    const firstName = await page.locator('tbody th[scope=row] a').first().innerText();
    await sort.selectOption('desc');
    await expect(page.locator('tbody tr').last().locator('th a').first()).toHaveText(firstName);
    await expect(count).toHaveText(initialCount);
    await sort.selectOption('asc');

    await programmes.getByRole('searchbox').fill('הנדסת תוכנה');
    await expect(count).toHaveText(initialCount);
    const software = programmes.getByRole('button', { name: 'הנדסת תוכנה', exact: true });
    await software.focus();
    await software.press('Enter');
    await expect(software).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('link', { name: 'הנדסת תוכנה', exact: true }).first(),
    ).toBeVisible();
    await programmes.getByRole('searchbox').clear();
    await expect(software).toBeVisible();
    await programmes.getByRole('button', { name: 'הצגת הכל', exact: true }).click();
    await programmes.getByRole('button', { name: 'הצגת פחות', exact: true }).click();
    await expect(software).toBeVisible();
    await expect(software).toHaveAttribute('aria-pressed', 'true');

    await fields.getByRole('searchbox').fill('הנדסה');
    await fields.getByRole('button', { name: 'הנדסה', exact: true }).click();
    await expect(programmes.getByRole('button', { name: 'הכל', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await programmes.getByRole('searchbox').fill('הנדסת תוכנה');
    await software.click();
    await page
      .getByRole('searchbox', { name: 'חיפוש מוסד', exact: true })
      .fill('מוסד שאינו קיים 379');
    await expect(page.getByText('לא נמצאו מוסדות שמתאימים לסינון.')).toBeVisible();
    await page.getByRole('searchbox', { name: 'חיפוש מוסד', exact: true }).clear();
    await expect(
      page.getByRole('link', { name: 'הנדסת תוכנה', exact: true }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    for (const input of await page.getByRole('searchbox').all()) {
      await expect(input).toHaveCSS('text-align', 'right');
    }
    await fields.getByRole('searchbox').clear();
    await programmes.getByRole('searchbox').clear();
    await software.focus();
    await expect(software).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({ path: `test-results/institutions-${width}.png`, fullPage: true });
    const programmeLink = page
      .getByRole('row', { name: /מכללת אפקה/ })
      .getByRole('link', { name: 'הנדסת תוכנה', exact: true });
    const programmePath = await programmeLink.getAttribute('href');
    await programmeLink.click();
    await expect(page).toHaveURL(new RegExp(`${programmePath}$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText('הנדסת תוכנה');
  });
}
