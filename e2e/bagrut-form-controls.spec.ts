import { expect, test, type Page } from './fixtures';

test('Sekhem applies sector-specific compulsory unit options', async ({ page }) => {
  await page.goto('/sekhem-calculator');
  await page.getByText('פרטי תעודת הבגרות', { exact: true }).click();
  await page.getByRole('combobox', { name: 'מגזר', exact: true }).selectOption('ערבי');
  await page.getByLabel('מקצוע 1', { exact: true }).fill('עברית');
  await expect(page.getByLabel('יחידות 1', { exact: true }).locator('option')).toHaveText([
    'בחירה',
    '3',
    '4',
    '5',
  ]);
});

for (const width of [375, 390, 1280]) {
  test(`Sekhem units placeholder fits in one subject row at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/sekhem-calculator');
    await page.evaluate(() => document.fonts.ready);
    const units = page.getByLabel('יחידות 1', { exact: true });
    await units.selectOption('');
    await expect(units).toHaveValue('');
    const metrics = await units.evaluate((element) => {
      const select = element as HTMLSelectElement;
      const style = getComputedStyle(select);
      const context = document.createElement('canvas').getContext('2d')!;
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const text = select.selectedOptions[0].textContent!;
      return {
        text,
        textWidth: context.measureText(text).width,
        available:
          select.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 20,
      };
    });
    await page.screenshot({ path: testInfo.outputPath('sekhem-placeholder.png') });
    expect(metrics.text).toBe('בחירה');
    expect(metrics.available, JSON.stringify(metrics)).toBeGreaterThanOrEqual(metrics.textWidth);
    const boxes = await Promise.all(
      ['מקצוע 1', 'יחידות 1', 'ציון 1', 'הסרת מקצוע 1'].map((name) =>
        page.getByLabel(name, { exact: true }).boundingBox(),
      ),
    );
    expect(boxes.every((box) => box !== null)).toBe(true);
    const tops = boxes.map((box) => box!.y);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
  });
}

async function openWizard(page: Page, step: 'mandatory' | 'elective') {
  await page.goto('/app/calculator#missing');
  await page.getByRole('button', { name: 'המשיכו למקצועות חובה ←', exact: true }).click();
  if (step === 'elective') {
    await page.getByRole('button', { name: 'המשיכו למקצועות בחירה ←', exact: true }).click();
    await page.getByRole('button', { name: 'הציגו רשימה מלאה', exact: true }).click();
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
      // Approved test update, Jorje 2026-10-30
      await expect(units).toHaveValue(step === 'mandatory' ? '3' : '2');
      await units.selectOption('');
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

for (const width of [1280, 390]) {
  test(`journey-owned headings address students in plural at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [step, heading] of [
      ['review', 'מוכנים לגלות את האפשרויות שלכם?'],
      ['results', 'האפשרויות שלכם'],
      ['subjects', 'מה מעניין אתכם ללמוד?'],
      ['missing', 'הזינו את הנתונים האקדמיים שלכם'],
    ]) {
      await page.goto(`/app/calculator#${step}`);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    }
  });
}

for (const width of [1280, 390]) {
  test(`journey new-row defaults follow label and sector at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/enquiries', (route) => route.abort());
    await page.goto('/app/calculator#grades-exact');
    await expect(page.getByLabel('יחידות 4', { exact: true })).toHaveValue('3');
    await page.getByRole('button', { name: /הוספת מקצוע/ }).click();
    const units = page.getByLabel('יחידות 8', { exact: true });
    const label = page.getByLabel('מקצוע 8', { exact: true });
    await expect(units).toHaveValue('2');
    await label.fill('אנגלית');
    await expect(units).toHaveValue('3');
    await label.fill('עברית');
    await expect(units).toHaveValue('2');
    await page.getByRole('combobox', { name: 'מגזר', exact: true }).selectOption('ערבי');
    await expect(units).toHaveValue('3');
    await units.selectOption('4');
    await label.fill('כימיה');
    await expect(units).toHaveValue('4');
  });
}
