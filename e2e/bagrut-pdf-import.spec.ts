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
    await expect(page.getByRole('status')).toHaveText('זוהו 4 מקצועות · 1 לא זוהה, נא לבדוק');
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
    await page.screenshot({
      path: testInfo.outputPath(`synthetic-import-${width}.png`),
      fullPage: true,
    });
    // Correct the unmatched synthetic name before continuing the real journey.
    await page.getByLabel('מקצוע 5', { exact: true }).fill('ספרות');
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
