import { ENQUIRY_COPY } from '../src/lib/enquiries';
import { expect, test } from './fixtures';

// Give this spec its own evaluation budget when the full suite shares one server.
test.use({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use) => {
    await use({ ...extraHTTPHeaders, 'x-forwarded-for': '198.51.100.26' });
  },
});

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
    await page.goto(width === 390 ? '/ig' : '/tt', {
      referer: 'https://example.com/social?private=secret',
    });
    await page.getByRole('link', { name: 'כניסה', exact: true }).waitFor();
    await page.evaluate(() => {
      window.location.hash = 'intent';
    });
    await page.getByRole('button', { name: 'כן', exact: true }).waitFor();
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
    await page.evaluate(() =>
      window.history.replaceState(null, '', '/?utm_source=facebook#results'),
    );
    await page.getByRole('button', { name: 'יצירת קשר', exact: true }).first().click();
    await expect(page).toHaveURL(/#inquiry$/);
    await expect(page.locator('form input:not([type="checkbox"])')).toHaveCount(2);
    await page.getByLabel('שם', { exact: true }).fill('בדיקת MyWay'); // Approved test update, Jorje 2026-10-26
    await page.getByLabel('טלפון נייד', { exact: true }).fill('0501234567'); // Approved test update, Jorje 2026-10-26
    // Approved test update, Jorje 2026-10-26: removed checkbox tick (institution consent = button press)
    await page.getByRole('button', { name: ENQUIRY_COPY.button, exact: true }).click(); // Approved test update, Jorje 2026-10-26
    await expect(page.getByRole('status')).toContainText(ENQUIRY_COPY.successTitle); // Approved test update, Jorje 2026-10-26
    expect(submitted).toMatchObject({
      consent: true,
      evaluationInput: { bagrut: 105.5, psychometric: evaluatedPsychometric },
      attribution: {
        utm_source: width === 390 ? 'instagram' : 'tiktok',
        referrer: 'https://example.com',
      },
    });
    expect(submitted?.evaluationInput).toMatchObject({ degreeId: submitted?.programId });
    expect(submitted).not.toHaveProperty('resultStatus');
  });

  test(`program contact CTA opens the existing standalone form at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/wa');
    await page.goto('/programs/colmgmt_cs?utm_source=facebook');
    await expect(
      page.getByRole('link', { name: 'בדיקת סיכויי קבלה', exact: true }),
    ).toHaveAttribute('href', '/app/calculator?program=colmgmt_cs');
    await expect(page.getByRole('link', { name: 'לאתר המוסד', exact: true })).toHaveAttribute(
      'href',
      /utm_source=myway&utm_medium=referral/,
    );
    await expect(page.getByRole('link', { name: 'למחשבון המכללה', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'יצירת קשר', exact: true }).click();
    await expect(page).toHaveURL(/\/enquiry\?program=colmgmt_cs&institution=colman/);
    await expect(page.getByRole('dialog', { name: 'מכללת ניהול – לימודים אקדמיים' })).toBeVisible(); // Approved test update, Jorje 2026-10-26
    await expect(page.locator('form input:not([type="checkbox"])')).toHaveCount(2);
    await expect(page.getByLabel('שם', { exact: true })).toBeVisible(); // Approved test update, Jorje 2026-10-26
    await expect(page.getByLabel('טלפון נייד', { exact: true })).toBeVisible(); // Approved test update, Jorje 2026-10-26
    const attribution = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('myway_lead_attribution_v1')!),
    );
    expect(attribution.utm_source).toBe('whatsapp');
  });
}

for (const [path, source] of [
  ['/tt', 'tiktok'],
  ['/ig', 'instagram'],
  ['/fb', 'facebook'],
  ['/wa', 'whatsapp'],
  ['/tt/', 'tiktok'],
  ['/ig/', 'instagram'],
  ['/fb/', 'facebook'],
  ['/wa/', 'whatsapp'],
]) {
  test(`${path} is a redirect only, with no invented medium/campaign`, async ({ request }) => {
    const response = await request.get(`${path}?utm_source=other&email=private%40example.com`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    const destination = new URL(response.headers().location, response.url());
    expect(destination.origin).toBe(new URL(response.url()).origin);
    expect(destination.pathname + destination.search).toBe(`/?utm_source=${source}`);
  });
}
test('social short links are excluded from sitemap', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  for (const path of ['/tt', '/ig', '/fb', '/wa']) {
    expect(xml).not.toContain(`https://findmyway.co.il${path}</loc>`);
  }
});
