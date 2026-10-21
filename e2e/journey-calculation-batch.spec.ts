import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`journey evaluates more than twelve programmes without exhausting its request quota at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: 'עזרו לי לבחור מה ללמוד' }).click();
    await page.getByRole('button', { name: 'כן', exact: true }).click();
    await page.getByRole('button', { name: 'מדעי המחשב', exact: true }).click();
    await page.getByRole('button', { name: 'פסיכולוגיה', exact: true }).click();
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
    await page.getByRole('button', { name: 'יש לי ממוצע בגרות' }).click();
    await page.getByLabel('ממוצע בגרות', { exact: true }).fill('110.5');
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
    await expect(page).toHaveURL(/#psy-mode$/);
    await page.getByRole('button', { name: 'כן, יש לי ציון', exact: true }).click();
    await page.getByLabel('ציון כללי', { exact: true }).fill('700');
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/admissions/evaluate') &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'לגלות את האפשרויות שלי' }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const input = response.request().postDataJSON();
    expect(input.degreeIds.length).toBeGreaterThan(12);
    expect(input.bagrut).toBe(110.5);
    const { data } = await response.json();
    expect(Object.keys(data.reports).sort()).toEqual([...input.degreeIds].sort());
    expect(data.failedDegreeIds).toEqual([]);
    await expect(page.getByText('בודקים את ההתאמה לציונים שלך…', { exact: true })).toBeHidden();
    await expect(page.getByText('חלק מהחישובים לא נטענו.', { exact: false })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'לפי מוסד', exact: true })).toBeVisible();
  });
}
