import { expect, test } from './fixtures';
import { ENQUIRY_COPY, ENQUIRY_PREP_CONSENT } from '../src/lib/enquiries';

for (const width of [1280, 390]) {
  test(`R7e consent, contrast, RTL fields and delivery states at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const browserErrors: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    const submissions: Record<string, unknown>[] = [];
    let releaseSend: (() => void) | undefined;
    await page.route('**/api/enquiries', async (route) => {
      submissions.push(route.request().postDataJSON());
      await new Promise<void>((resolve) => {
        releaseSend = resolve;
      });
      await route.fulfill({
        status: submissions.length === 1 ? 502 : 201,
        json:
          submissions.length === 1
            ? { error: { message: 'private provider detail' } }
            : { data: { received: true } },
      });
    });
    await page.goto('/enquiry?program=cs&institution=tau');
    const dialog = page.getByRole('dialog', { name: 'אוניברסיטת תל אביב', exact: true });
    await expect(dialog).toBeVisible();
    await test.step('grey Hebrew placeholders keep empty fields RTL and typed phone values LTR', async () => {
      for (const [label, placeholder] of [
        [ENQUIRY_COPY.nameLabel, ENQUIRY_COPY.namePlaceholder],
        [ENQUIRY_COPY.phoneLabel, ENQUIRY_COPY.phonePlaceholder],
      ]) {
        const input = dialog.getByLabel(label, { exact: true });
        await expect(input).toHaveValue('');
        await expect(input).toHaveAttribute('placeholder', placeholder);
        expect(await input.evaluate((node) => getComputedStyle(node, '::placeholder').color)).toBe(
          'rgb(102, 102, 102)',
        );
        expect(
          await input.evaluate((node) => getComputedStyle(node, '::placeholder').opacity),
        ).toBe('1');
        expect(await input.evaluate((node) => getComputedStyle(node).direction)).toBe('rtl');
        expect(await input.evaluate((node) => getComputedStyle(node).textAlign)).toBe('right');
      }
      const phone = dialog.getByLabel(ENQUIRY_COPY.phoneLabel, { exact: true });
      await expect(phone).toHaveAttribute('dir', 'ltr');
      await phone.fill('0501234567');
      expect(await phone.evaluate((node) => getComputedStyle(node).direction)).toBe('ltr');
      expect(await phone.evaluate((node) => getComputedStyle(node).textAlign)).toBe('right');
      await phone.clear();
      expect(await phone.evaluate((node) => getComputedStyle(node).direction)).toBe('rtl');
    });
    expect(await dialog.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe(
      'rgb(255, 255, 255)',
    );
    const checkbox = dialog.getByRole('checkbox', { name: ENQUIRY_PREP_CONSENT, exact: true });
    await expect(dialog.getByRole('checkbox')).toHaveCount(1);
    await expect(checkbox).not.toBeChecked();
    const button = dialog.getByRole('button', { name: ENQUIRY_COPY.button, exact: true });
    await expect(button.locator('svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(button.locator('svg')).toHaveAttribute('focusable', 'false');
    expect(await button.locator('svg').evaluate((icon) => getComputedStyle(icon).scale)).toBe(
      '-1 1',
    );
    const measurements = await dialog.evaluate((root) => {
      function background(node: Element): string {
        for (let current: Element | null = node; current; current = current.parentElement) {
          const color = getComputedStyle(current).backgroundColor;
          if (color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') return color;
        }
        throw new Error('No opaque consent background found');
      }
      function luminance(color: string): number {
        const rgb = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      }
      return ['action-consent', 'consent-prep', 'privacy-link'].map((id) => {
        const node = root.querySelector(`#${id}`)!;
        const style = getComputedStyle(node);
        const bg = background(node);
        const values = [luminance(style.color), luminance(bg)].sort((a, b) => b - a);
        return {
          id,
          color: style.color,
          size: style.fontSize,
          lineHeight: style.lineHeight,
          background: bg,
          contrast: (values[0] + 0.05) / (values[1] + 0.05),
        };
      });
    });
    for (const measurement of measurements) {
      expect(measurement.color).toBe('rgb(102, 102, 102)'); // Approved test update, Jorje 2026-10-26
      expect(measurement.size).toBe('12px');
      expect(measurement.lineHeight).toBe('18px');
      expect(measurement.contrast).toBeGreaterThanOrEqual(4.5); // Approved test update, Jorje 2026-10-26
    }
    expect(await dialog.evaluate((node) => node.getBoundingClientRect().width)).toBe(320);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `/tmp/r7e-default-${width}.png` });
    await button.click();
    await expect(dialog.getByText(ENQUIRY_COPY.nameError)).toBeVisible();
    await expect(dialog.getByText(ENQUIRY_COPY.phoneError)).toBeVisible();
    await page.screenshot({ path: `/tmp/r7e-field-error-${width}.png` });
    for (const label of [ENQUIRY_COPY.nameLabel, ENQUIRY_COPY.phoneLabel]) {
      const input = dialog.getByLabel(label, { exact: true });
      expect(await input.evaluate((node) => getComputedStyle(node).textAlign)).toBe('right');
      await input.fill(label === ENQUIRY_COPY.nameLabel ? 'בדיקת MyWay' : '0501234567');
      expect(await input.evaluate((node) => getComputedStyle(node).textAlign)).toBe('right');
    }
    await button.click();
    await expect.poll(() => Boolean(releaseSend)).toBe(true);
    await expect(dialog.getByRole('status')).toHaveText(ENQUIRY_COPY.loadingLive);
    await expect(dialog.getByLabel(ENQUIRY_COPY.nameLabel, { exact: true })).toHaveAttribute(
      'readonly',
      '',
    );
    await expect(checkbox).toBeDisabled();
    await page.screenshot({ path: `/tmp/r7e-sending-${width}.png` });
    releaseSend!();
    releaseSend = undefined;
    await expect(dialog.getByRole('alert')).toHaveText(ENQUIRY_COPY.serverError);
    expect(submissions[0]).toMatchObject({ consent: true, prepConsent: false });
    await page.screenshot({ path: `/tmp/r7e-send-failed-${width}.png` });
    await checkbox.check();
    await dialog.getByRole('button', { name: ENQUIRY_COPY.retry, exact: true }).click();
    await expect.poll(() => Boolean(releaseSend)).toBe(true);
    releaseSend!();
    await expect(dialog.getByRole('status')).toContainText(ENQUIRY_COPY.successTitle);
    expect(submissions[1]).toMatchObject({ consent: true, prepConsent: true });
    await page.screenshot({ path: `/tmp/r7e-success-${width}.png` });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(browserErrors).toEqual([]);
  });
}
