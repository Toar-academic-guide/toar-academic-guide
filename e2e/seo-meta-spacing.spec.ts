import { expect, test } from './fixtures';

for (const width of [1280, 390]) {
  for (const path of ['/programs/tau_cs', '/programs/tau_biology', '/institutions/tau']) {
    test(`${path} search metadata and SSR boundaries at ${width}px`, async ({
      page,
      request,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const response = await request.get(path);
      expect(response.ok()).toBe(true);
      const rawText = (await response.text())
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<!--[^]*?-->|<[^>]*>/g, '');
      expect(rawText).not.toMatch(/קבלההתאמה|אביביצירת|לימודהרשימה|שלימי אנחנו/);
      if (path.startsWith('/programs/')) {
        expect(rawText).toMatch(/בדיקת סיכויי קבלה\s+התאמה אישית/);
        expect(rawText).toMatch(/אוניברסיטת תל אביב\s+יצירת קשר/);
      }
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const title = await page.title();
      expect(title.length).toBeLessThanOrEqual(62);
      expect(title).toContain('תנאי קבלה');
      if (path === '/programs/tau_biology') {
        expect(title).toBe('ביולוגיה – אוניברסיטת תל אביב: תנאי קבלה וסיכויי קבלה | MyWay');
        expect(title).toHaveLength(61);
      }
      expect(title).not.toMatch(/סכם|מתואם|מצרף|composite/i);
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description!.length).toBeLessThanOrEqual(160);
      for (const platform of ['og', 'twitter']) {
        const attribute = platform === 'og' ? 'property' : 'name';
        await expect(page.locator(`meta[${attribute}="${platform}:title"]`)).toHaveAttribute(
          'content',
          title.replace(/ \| MyWay$/, ''),
        );
        await expect(page.locator(`meta[${attribute}="${platform}:description"]`)).toHaveAttribute(
          'content',
          description!,
        );
      }
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://findmyway.co.il${path}`,
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.screenshot({
        path: testInfo.outputPath('page.png'),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
}
