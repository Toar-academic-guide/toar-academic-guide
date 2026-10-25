import { expect, test, type Page } from './fixtures';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const searchFields = ['subjects', 'results-institutions', 'bagrut-electives'] as const;

async function openSearch(page: Page, field: (typeof searchFields)[number]) {
  if (field === 'bagrut-electives') {
    await page.goto('/app/profile');
    await page.getByRole('button', { name: 'המשך למקצועות חובה' }).click();
    await page.getByRole('button', { name: 'המשך למקצועות בחירה' }).click();
    return page.getByPlaceholder('חפשו מקצוע... (לדוגמה: פיזיקה, ביולוגיה)');
  }

  await page.goto(field === 'subjects' ? '/app/calculator' : '/#results');
  await expect(page.getByText('טוענים מסלולים…', { exact: true })).toBeHidden();
  await expect(page.locator('.study-journey [role="alert"]')).toHaveCount(0);
  if (field === 'results-institutions') {
    await page.getByRole('button', { name: 'לפי מוסד', exact: true }).click();
    await page.getByRole('button', { name: 'סינון', exact: true }).click();
  }
  return page.getByLabel(field === 'subjects' ? 'חיפוש תחום לימודים' : 'חיפוש אפשרויות');
}

for (const width of [1280, 390]) {
  for (const field of searchFields) {
    test(`${field} has one frame and a visible wrapper focus ring at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const input = await openSearch(page, field);
      const wrapper = input.locator('..');
      await input.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      await expect(input).toHaveValue('');
      await expect(input).not.toBeFocused();

      async function screenshot(state: string) {
        const directory = process.env.SEARCH_INPUT_SHOTS_DIR;
        if (!directory) return;
        await mkdir(directory, { recursive: true });
        const name = `${process.env.SEARCH_INPUT_SHOT_PREFIX ?? 'after'}-${field}-${width}-${state}.png`;
        const path = join(directory, name);
        await page.screenshot({ path, animations: 'disabled' });
        await testInfo.attach(name, { path, contentType: 'image/png' });
      }

      await screenshot('empty');
      await expect(wrapper).toHaveCSS('outline-style', 'none');
      // Reach the field with the keyboard, including the real :focus-visible cascade.
      await input.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(input).toBeFocused();
      await screenshot('focused');

      for (const value of ['', 'פיזיקה']) {
        await input.fill(value);
        for (const side of ['top', 'right', 'bottom', 'left']) {
          await expect(input).toHaveCSS(`border-${side}-width`, '0px');
        }
        await expect(input).toHaveCSS('outline-style', 'none');
        await expect(input).toHaveCSS('box-shadow', 'none');
        await expect(input).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await expect(input).toHaveCSS('appearance', 'none');
        await expect(input).toHaveCSS('text-align', 'right');
        await expect(wrapper).toHaveCSS('outline-style', 'solid');
        await expect(wrapper).toHaveCSS('outline-width', '2px');
        await expect(wrapper).toHaveCSS('outline-color', 'rgb(101, 84, 184)');
        await expect(wrapper).toHaveCSS('outline-offset', '2px');
        const inputBox = await input.boundingBox();
        const wrapperBox = await wrapper.boundingBox();
        expect(inputBox!.x).toBeGreaterThanOrEqual(wrapperBox!.x);
        expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(
          wrapperBox!.x + wrapperBox!.width,
        );
      }

      await input.evaluate((element) => element.blur());
      await expect(wrapper).toHaveCSS('outline-style', 'none');
    });
  }
}
