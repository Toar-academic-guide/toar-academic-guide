import { expect, test, type Page } from './fixtures';

async function openWizard(page: Page, step: 'mandatory' | 'elective') {
  await page.goto('/app/calculator#missing');
  await page.getByRole('button', { name: 'המשך למקצועות חובה ←', exact: true }).click();
  if (step === 'elective') {
    await page.getByRole('button', { name: 'המשך למקצועות בחירה ←', exact: true }).click();
    await page.getByRole('button', { name: 'הצג רשימה מלאה', exact: true }).click();
    await page.getByRole('button', { name: 'כימיה', exact: true }).click();
  }
}

for (const width of [1280, 390]) {
  for (const step of ['journey', 'mandatory', 'elective'] as const) {
    test(`${step} placeholder fits at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      if (step === 'journey') await page.goto('/app/calculator#grades-exact');
      else await openWizard(page, step);
      await page.evaluate(() => document.fonts.ready);
      const units = page.getByLabel(
        step === 'journey'
          ? 'יחידות 1'
          : step === 'mandatory'
            ? 'יחידות מתמטיקה'
            : 'יחידות כימיה 1',
        { exact: true },
      );
      await expect(units).toHaveValue('');
      const metrics = await units.evaluate((element) => {
        const select = element as HTMLSelectElement;
        const style = getComputedStyle(select);
        const context = document.createElement('canvas').getContext('2d')!;
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const text = select.selectedOptions[0].textContent!;
        // Reserve space for the browser's native dropdown arrow as well as CSS padding.
        const arrow = style.appearance === 'none' ? 0 : 20;
        return {
          text,
          textWidth: context.measureText(text).width,
          available:
            select.clientWidth -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight) -
            arrow,
        };
      });
      await units.scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath('placeholder.png') });
      expect(metrics.text).toBe('בחירה');
      expect(metrics.available, JSON.stringify(metrics)).toBeGreaterThanOrEqual(metrics.textWidth);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    });
  }

  for (const surface of ['journey', 'mandatory', 'elective'] as const) {
    test(`${surface} preserves typed invalid grades at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      if (surface === 'journey') {
        await page.goto('/app/calculator#grades-exact');
      } else {
        await openWizard(page, surface);
      }
      const label =
        surface === 'journey'
          ? 'ציון 1'
          : surface === 'mandatory'
            ? 'ציון מתמטיקה'
            : 'ציון כימיה 1';
      const grade = page.getByLabel(label, { exact: true });
      await expect(grade).toHaveAttribute('type', 'text');
      await expect(grade).toHaveAttribute('inputmode', 'numeric');
      for (const raw of ['8.5', '-3', '85a', ' 90']) {
        await grade.fill('');
        await grade.pressSequentially(raw);
        await expect(grade).toHaveValue(raw);
        await expect(grade).toHaveAttribute('aria-invalid', 'true');
        expect(
          await grade.evaluate((element) => (element as HTMLInputElement).validationMessage),
        ).toBe('ציון בין 0 ל-100');
        await expect(page.getByText('ציון בין 0 ל-100', { exact: true })).toBeVisible();
      }
      await grade.fill('90');
      await expect(grade).toHaveValue('90');
      expect(await grade.evaluate((element) => (element as HTMLInputElement).checkValidity())).toBe(
        true,
      );
      await expect(page.getByText('ציון בין 0 ל-100', { exact: true })).toHaveCount(0);
    });
  }
}
