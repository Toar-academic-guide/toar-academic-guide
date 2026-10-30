import { expect, test } from './fixtures';

const POSTHOG_MISSING_TOKEN_NOTICE =
  '[PostHog.js] PostHog was initialized without a token. This likely indicates a misconfiguration. Please check the first argument passed to posthog.init()';

function isUnexpectedConsoleError(message: string) {
  return message !== POSTHOG_MISSING_TOKEN_NOTICE;
}

test.use({
  launchOptions: {
    args: [
      '--use-angle=swiftshader',
      '--use-gl=angle',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  },
});

test('console allowlist excludes only the exact missing-token notice', () => {
  const unexpected = [
    '[PostHog.js] Another initialization error',
    `${POSTHOG_MISSING_TOKEN_NOTICE} `,
    `Error: ${POSTHOG_MISSING_TOKEN_NOTICE}`,
    'Hero renderer: Shader compilation failed',
  ];
  expect([POSTHOG_MISSING_TOKEN_NOTICE, ...unexpected].filter(isUnexpectedConsoleError)).toEqual(
    unexpected,
  );
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`approved hero, WebGL and calculator entry at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && isUnexpectedConsoleError(message.text()))
        errors.push(message.text());
    });
    await page.goto('/');
    const hero = page.locator('.hero-v2');
    await expect(hero.locator('h1')).toHaveText('הדרך ללימודים שלכם מתחילה כאן.');
    await expect(hero).toHaveAttribute('data-renderer', 'webgl');
    await expect(hero).toHaveAttribute('data-renderer-thread', 'worker');
    await expect(hero.locator('.hero-fallback')).toBeHidden();
    await expect(hero.getByRole('link', { name: 'לא בטוחים מה ללמוד? לשאלון' })).toHaveAttribute(
      'href',
      '/app/assessment',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.locator('.journey-funnel')).toHaveCount(0);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('#main')).toHaveCount(1);
    await hero.getByRole('link', { name: 'בדקו לאן אתם מתקבלים' }).click();
    await expect(page).toHaveURL(/\/app\/calculator$/);
    await expect(page.locator('.journey-progress')).toBeVisible();
    await expect(page.locator('main h1')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('CSS fallback survives unavailable WebGL and unavailable workers', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', {
      value: undefined,
      configurable: true,
    });
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/');
  const hero = page.locator('.hero-v2');
  await expect(hero).toHaveAttribute('data-renderer', 'fallback');
  await expect(hero.locator('.hero-fallback')).toBeVisible();
  await expect(hero.locator('canvas')).toHaveCSS('opacity', '0');
});

test('main-thread fallback renders when OffscreenCanvas transfer is unavailable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto('/');
  await expect(page.locator('.hero-v2')).toHaveAttribute('data-renderer-thread', 'main');
  await expect(page.locator('.hero-v2')).toHaveAttribute('data-renderer', 'webgl');
});

test('main-thread renderer restores lost context without WebGL warnings', async ({ page }) => {
  const warnings: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
    if (message.type() === 'error' && isUnexpectedConsoleError(message.text()))
      errors.push(message.text());
  });
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto('/');
  const hero = page.locator('.hero-v2');
  await expect(hero).toHaveAttribute('data-renderer-thread', 'main');
  await expect(hero).toHaveAttribute('data-renderer', 'webgl');
  const extension = await hero.locator('canvas').evaluateHandle((canvas) => {
    const gl = canvas.getContext('webgl');
    const loseContext = gl?.getExtension('WEBGL_lose_context');
    if (!loseContext) throw new Error('WEBGL_lose_context is required for restoration coverage');
    return loseContext;
  });
  await extension.evaluate((loseContext) => loseContext.loseContext());
  await expect(hero).toHaveAttribute('data-renderer', 'fallback');
  await expect(hero.locator('.hero-fallback')).toBeVisible();
  await extension.evaluate((loseContext) => loseContext.restoreContext());
  await expect(hero).toHaveAttribute('data-renderer', 'webgl');
  await expect(hero.locator('.hero-fallback')).toBeHidden();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await extension.dispose();
  expect(warnings).toEqual([]);
  expect(errors).toEqual([]);
});

test('reduced motion holds one static silk frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const hero = page.locator('.hero-v2');
  await expect(hero).toHaveAttribute('data-renderer', 'webgl');
  await page.evaluate(() => document.fonts.ready);
  // Capture only the decorative canvas, after geometry and font updates settle.
  await page.waitForTimeout(250);
  const first = await hero.locator('canvas').screenshot();
  await page.waitForTimeout(400);
  expect(await hero.locator('canvas').screenshot()).toEqual(first);
});

test('head declares the approved icons, manifest, theme colours and social image', async ({
  page,
  request,
  baseURL,
}) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/site.webmanifest');
  await expect(
    page.locator('meta[name="theme-color"][media="(prefers-color-scheme: light)"]'),
  ).toHaveAttribute('content', '#FFFFFF');
  await expect(
    page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]'),
  ).toHaveAttribute('content', '#0C1D45');
  const image = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(new URL(image!).pathname).toBe('/opengraph-image.png');
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    /\/opengraph-image.png$/,
  );
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    'content',
    'MyWay — הדרך ללימודים שלכם מתחילה כאן.',
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  const paths = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')!));
  expect(paths.some((path) => path.startsWith('/favicon.ico'))).toBe(true);
  expect(paths.some((path) => path.startsWith('/icon.png'))).toBe(true);
  expect(paths.some((path) => path.startsWith('/apple-icon.png'))).toBe(true);
  for (const path of [...paths, image!]) {
    // Resolve production-origin social metadata against the local server for this check.
    expect(
      (await request.get(new URL(path, baseURL).pathname + new URL(path, baseURL).search)).status(),
    ).toBe(200);
  }
});

test('hero text and fallback render without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await expect(page.locator('.hero-v2 h1')).toHaveText('הדרך ללימודים שלכם מתחילה כאן.');
  await expect(page.locator('.hero-v2 .hero-fallback')).toBeVisible();
  await expect(page.locator('.hero-v2 .hero-primary')).toHaveAttribute('href', '/app/calculator');
  await context.close();
});

test('approved headline tracking and button hover survive the live shell styles', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const title = page.locator('.hero-v2 h1');
  expect(await title.evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(
    613.625,
    1,
  );
  await expect(title.locator('span')).toHaveCSS('letter-spacing', '-2.3px');
  const primary = page.locator('.hero-primary');
  await primary.hover();
  await expect(primary).toHaveCSS('background-color', 'rgb(60, 87, 183)');
  await expect(primary).toHaveCSS('filter', 'none');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(title.locator('span')).toHaveCSS('letter-spacing', '-1.2px');
  expect(
    await title.locator('span').evaluate((element) => element.getBoundingClientRect().width),
  ).toBeCloseTo(106.2, 1);
});
