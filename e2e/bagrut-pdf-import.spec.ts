import { expect, test } from './fixtures';

for (const width of [1280, 390]) {
  test(`imports synthetic final grades and preserves entered subjects (${width})`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const pdfChunks: string[] = [];
    page.on('request', (request) => {
      if (/\/_next\/static\/chunks\//.test(request.url())) pdfChunks.push(request.url());
    });
    await page.goto('/');
    await page.getByRole('link', { name: 'כניסה', exact: true }).waitFor();
    await page.evaluate(() => {
      window.location.hash = 'intent';
    });
    await page.getByRole('button', { name: 'כן', exact: true }).click();
    await page.getByRole('button', { name: 'מדעי המחשב', exact: true }).click();
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
    await page.getByRole('button', { name: 'יש לי ציונים לפי מקצוע' }).click();
    await page.getByLabel('סוג תעודה').selectOption('internal');
    // A manually entered subject absent from the PDF must survive the import.
    await page.getByRole('button', { name: /הוספת מקצוע/ }).click();
    const added = await page.locator('input[aria-label^="מקצוע "]').count();
    await page.getByLabel(`מקצוע ${added}`, { exact: true }).fill('ביולוגיה');
    await page.getByLabel(`יחידות ${added}`, { exact: true }).fill('5');
    await page.getByLabel(`ציון ${added}`, { exact: true }).fill('94');
    const chunksBeforeUpload = [...pdfChunks];
    await page
      .locator('input[type="file"]')
      .setInputFiles('src/lib/__fixtures__/bagrut-pdf/synthetic-corrupt.pdf');
    await expect(page.getByRole('status')).toHaveText('זוהו 3 מקצועות · 1 לא זוהה, נא לבדוק');
    const actual = await page.locator('.journey-grade-table tbody tr').evaluateAll((rows) =>
      rows.map((row) => {
        const inputs = Array.from(row.querySelectorAll('input'));
        return inputs.map((input) => input.value);
      }),
    );
    expect(actual).toEqual([
      ['ביולוגיה', '5', '94'],
      ['מתמטיקה', '5', '45'],
      ['אנגלית', '4', '54'],
      ['תנ״ך', '2', '84'],
      ['מקצוע בדיקה עם ף', '5', '55'],
    ]);
    for (const field of await page.locator('.journey-grade-table input').all()) {
      await expect(field).toHaveCSS('text-align', 'right');
    }
    await expect(page.getByRole('status')).toHaveCSS('text-align', 'right');
    const review = page.getByLabel(/בדקתי את הציונים שזוהו/);
    await expect(review).not.toBeChecked();
    await expect(page.getByLabel('מקצוע 5', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page.getByText('נא לבדוק את שם המקצוע', { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`synthetic-import-${width}.png`),
      fullPage: true,
    });
    // Correct the unmatched synthetic name before continuing the real journey.
    await page.getByLabel('מקצוע 5', { exact: true }).fill('ספרות');
    await expect(page.getByText('נא לבדוק את שם המקצוע', { exact: true })).toHaveCount(0);
    await review.check();
    await page.getByRole('button', { name: /הוספת מקצוע/ }).click();
    const manualPhysics = await page.locator('input[aria-label^="מקצוע "]').count();
    await page.getByLabel(`מקצוע ${manualPhysics}`, { exact: true }).fill('פיזיקה');
    await page.getByLabel(`יחידות ${manualPhysics}`, { exact: true }).fill('4');
    await page.getByLabel(`ציון ${manualPhysics}`, { exact: true }).fill('84');
    await page
      .locator('input[type="file"]')
      .setInputFiles('src/lib/__fixtures__/bagrut-pdf/synthetic-nine-starred.pdf');
    await expect(page.getByRole('status')).toHaveText('זוהו 9 מקצועות');
    await expect(review).not.toBeChecked();
    const names = await page
      .locator('input[aria-label^="מקצוע "]')
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));
    expect(names).toHaveLength(10);
    expect(names.filter((name) => name === 'פיזיקה' || name === 'פיסיקה')).toHaveLength(1);
    const physics = names.indexOf('פיסיקה') + 1;
    expect(physics).toBeGreaterThan(0);
    await expect(page.getByLabel(`יחידות ${physics}`, { exact: true })).toHaveValue('5');
    await expect(page.getByLabel(`ציון ${physics}`, { exact: true })).toHaveValue('90');
    await expect(page.getByText('נא לבדוק את שם המקצוע', { exact: true })).toHaveCount(0);
    await review.check();
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
    await expect(page).toHaveURL(/#psy-mode$/);
    expect(errors).toEqual([]);
    await testInfo.attach('lazy-chunk-requests', {
      body: JSON.stringify(
        {
          chunksBeforeUpload,
          chunksAfterUpload: pdfChunks.filter((chunk) => !chunksBeforeUpload.includes(chunk)),
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  });
}
