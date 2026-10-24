import { expect, test } from '@playwright/test';

// Never send synthetic contacts to Monday, Supabase or a notification channel.
for (const width of [1440, 390]) {
  test(`journey carries the evaluated inputs into the unchanged enquiry at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let submitted: Record<string, unknown> | undefined;
    await page.route('**/api/enquiries', async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { data: { received: true } } });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'עזרו לי לבחור מה ללמוד' }).click();
    await page.getByRole('button', { name: 'כן', exact: true }).click();
    await page.getByRole('button', { name: 'מדעי המחשב', exact: true }).click();
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
    await page.getByRole('button', { name: 'יש לי ממוצע בגרות' }).click();
    await page.getByLabel('ממוצע בגרות', { exact: true }).fill('105.5');
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
    await page.getByRole('button', { name: 'כן, יש לי ציון', exact: true }).click();
    await page.getByLabel('ציון כללי', { exact: true }).fill('680');
    await page.getByRole('button', { name: 'המשך', exact: true }).click();
    await page.getByRole('button', { name: 'לגלות את האפשרויות שלי' }).click();
    await expect(page.getByText('בודקים את ההתאמה לציונים שלך…', { exact: true })).toBeHidden();
    const evaluatedPsychometric = width === 390 ? 750 : 680;
    if (width === 390) {
      await page.getByRole('button', { name: 'מה אם אשפר ציון?' }).click();
      await page.getByRole('spinbutton', { name: 'ציון יעד' }).fill('750');
      await page.getByRole('button', { name: 'לבדוק את האפשרויות' }).click();
      await expect(page.getByText('בודקים את ההתאמה לציונים שלך…', { exact: true })).toBeHidden();
    }
    await page.getByRole('button', { name: 'יצירת קשר', exact: true }).first().click();
    await expect(page).toHaveURL(/#inquiry$/);
    await expect(page.locator('form input:not([type="checkbox"])')).toHaveCount(2);
    await page.getByLabel('שם מלא', { exact: true }).fill('בדיקת MyWay');
    await page.getByLabel('מספר טלפון', { exact: true }).fill('0501234567');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'שליחת בקשה', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('הפנייה התקבלה');
    expect(submitted).toMatchObject({
      consent: true,
      evaluationInput: { bagrut: 105.5, psychometric: evaluatedPsychometric },
    });
    expect(submitted?.evaluationInput).toMatchObject({ degreeId: submitted?.programId });
    expect(submitted).not.toHaveProperty('resultStatus');
  });

  test(`program contact CTA opens the existing standalone form at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/programs/colmgmt_cs');
    await expect(
      page.getByRole('link', { name: 'בדיקת סיכויי קבלה', exact: true }),
    ).toHaveAttribute('href', '/app/calculator');
    await expect(page.getByRole('link', { name: 'לאתר המוסד', exact: true })).toHaveAttribute(
      'href',
      /utm_source=myway&utm_medium=referral/,
    );
    await expect(page.getByRole('link', { name: 'למחשבון המכללה', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'יצירת קשר', exact: true }).click();
    await expect(page).toHaveURL(/\/enquiry\?program=colmgmt_cs&institution=colman/);
    await expect(page.getByRole('heading', { name: 'רוצה לשמוע עוד?' })).toBeVisible();
    await expect(page.locator('form input:not([type="checkbox"])')).toHaveCount(2);
    await expect(page.getByLabel('שם מלא', { exact: true })).toBeVisible();
    await expect(page.getByLabel('מספר טלפון', { exact: true })).toBeVisible();
  });
}
