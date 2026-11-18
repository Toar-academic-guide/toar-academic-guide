import { ENQUIRY_COPY, ENQUIRY_PREP_COPY } from '../src/lib/enquiries';
import expectedCopy from '../src/app/enquiry/__fixtures__/prep-page-copy.json';
import { expect, test } from './fixtures';

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`prep reading and mocked enquiry stay usable at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    const submissions: Record<string, unknown>[] = [];
    await page.route('**/api/enquiries', async (route) => {
      expect(route.request().method()).toBe('POST');
      submissions.push(route.request().postDataJSON());
      await route.fulfill({
        status: 201,
        headers: { 'x-prep-test-mock': '1' },
        json: { data: { received: true } },
      });
    });
    await page.route(
      /https:\/\/[^/]*(?:monday\.com|slack\.com|posthog\.com|posthog\.i\.posthog\.com)\//,
      (route) => route.abort(),
    );

    const response = await page.goto(
      '/enquiry?program=psychometric-preparation&utm_source=content-test',
    );
    expect(response?.status()).toBe(200);
    const html = await response!.text();
    for (const block of expectedCopy) expect(html).toContain(`<h2>${block.heading}</h2>`);
    await page.evaluate(() => document.fonts.ready);
    const reading = page.locator('[data-prep-content]');
    const text = reading.locator('[data-prep-text]');
    const hero = page.locator('main > section').first();
    const cta = hero.locator('button');
    const dialog = page.getByRole('dialog');
    const submit = dialog.getByRole('button', { name: ENQUIRY_PREP_COPY.button, exact: true });
    await expect(dialog).toBeVisible();
    await expect(reading.locator('h2')).toHaveText(expectedCopy.map((block) => block.heading));
    await expect(reading.locator('ul')).toHaveCount(2);
    await expect(reading.locator('ul').nth(0).locator('li')).toHaveCount(4);
    await expect(reading.locator('ul').nth(1).locator('li')).toHaveCount(3);
    await expect(reading.locator('strong')).toHaveCount(10);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(cta).toHaveText('השאירו פרטים');
    await expect(reading.locator('button')).toHaveCount(0);
    expect(await reading.evaluate((node) => node.getBoundingClientRect().width)).toBe(
      viewport.width === 1280 ? 760 : 350,
    );
    expect(await hero.evaluate((node) => node.getBoundingClientRect().width)).toBe(
      viewport.width === 1280 ? 760 : 350,
    );
    expect(await text.evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(
      620,
    );
    expect(await dialog.evaluate((node) => node.getBoundingClientRect().width)).toBe(
      viewport.width === 1280 ? 400 : 320,
    );
    const heroBox = await cta.boundingBox();
    const submitBox = await submit.boundingBox();
    expect(heroBox!.y).toBeGreaterThanOrEqual(0);
    expect(heroBox!.y + heroBox!.height).toBeLessThanOrEqual(viewport.height);
    expect(submitBox!.y + submitBox!.height).toBeLessThanOrEqual(viewport.height);
    expect(await dialog.evaluate((node) => node.scrollHeight <= node.clientHeight)).toBe(true);
    expect(submitBox!.height).toBe(48);
    const textLines = await submit.evaluate((node) => {
      const range = document.createRange();
      const textNode = [...node.childNodes].find(
        (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
      );
      if (!textNode) throw new Error('Submit label not found');
      range.selectNodeContents(textNode);
      return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
    });
    expect(textLines).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const label of [ENQUIRY_COPY.nameLabel, ENQUIRY_COPY.phoneLabel]) {
      const field = dialog.getByLabel(label, { exact: true });
      await expect(field).toHaveValue('');
      expect(await field.evaluate((node) => getComputedStyle(node).textAlign)).toBe('right');
    }
    await page.screenshot({ path: testInfo.outputPath(`prep-dialog-${viewport.width}.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath(`prep-closed-${viewport.width}.png`),
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await text.evaluate((node) => getComputedStyle(node).textAlign)).toBe('start');
    const blocks = await text.evaluate((node) => {
      return [...node.querySelectorAll('h2')].map((heading) => {
        const pieces: string[] = [];
        for (
          let next = heading.nextElementSibling;
          next && next.tagName !== 'H2';
          next = next.nextElementSibling
        ) {
          const clone = next.cloneNode(true) as Element;
          clone
            .querySelectorAll('[data-prep-new-tab]')
            .forEach((annotation) => annotation.remove());
          pieces.push(clone.textContent!);
        }
        return { heading: heading.textContent, text: pieces.join(' ') };
      });
    });
    expect(blocks).toEqual(expectedCopy);
    const links = reading.locator('a');
    await expect(links.nth(0)).toHaveAttribute('href', '/psychometric-dates');
    await expect(links.nth(1)).toHaveAttribute('href', '/sekhem-calculator');
    for (const link of [links.nth(2), links.nth(3)]) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(link).toHaveAccessibleName(/נפתח בכרטיסייה חדשה/);
      expect(await link.evaluate((node) => getComputedStyle(node).textDecorationLine)).toBe(
        'underline',
      );
      await link.focus();
      expect(await link.evaluate((node) => getComputedStyle(node).outlineWidth)).toBe('3px');
      expect(
        await link
          .locator('svg')
          .evaluate((node) => getComputedStyle(node.parentElement!).whiteSpace),
      ).toBe('nowrap');
    }
    await cta.click();
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(ENQUIRY_COPY.nameLabel, { exact: true }).fill('בדיקת MyWay');
    await dialog.getByLabel(ENQUIRY_COPY.phoneLabel, { exact: true }).fill('0501234567');
    for (const label of [ENQUIRY_COPY.nameLabel, ENQUIRY_COPY.phoneLabel]) {
      expect(
        await dialog
          .getByLabel(label, { exact: true })
          .evaluate((node) => getComputedStyle(node).textAlign),
      ).toBe('right');
    }
    if (viewport.width === 1280) await dialog.getByRole('checkbox').check();
    const mockedResponse = page.waitForResponse(
      (result) => new URL(result.url()).pathname === '/api/enquiries',
    );
    await submit.click();
    expect((await mockedResponse).headers()['x-prep-test-mock']).toBe('1');
    await expect(dialog.getByRole('status')).toContainText(ENQUIRY_COPY.successTitle);
    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toMatchObject({
      programId: 'psychometric-preparation',
      institutionId: '',
      consent: true,
      prepConsent: viewport.width === 1280,
    });
    expect(submissions[0]).not.toHaveProperty('prepConsentText');
    expect(submissions[0]).not.toHaveProperty('prepConsentAt');
    expect(browserErrors).toEqual([]);
  });
}
