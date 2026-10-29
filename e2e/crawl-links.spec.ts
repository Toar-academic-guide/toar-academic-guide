import { expect, test } from './fixtures';

async function mapLimited<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

function anchors(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
}

// PM trim spec: 12 subjects + 8 institutions on the homepage, collapsed by default.
test('homepage browse links are in raw HTML inside a collapsed details', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('בדקו לאן אתם מתקבלים');
  const browse = html.split('aria-labelledby="browse-title"')[1] ?? '';
  const details = browse.slice(browse.indexOf('<details'), browse.indexOf('</details>'));
  expect(details.startsWith('<details>')).toBe(true);
  const hrefs = anchors(details);
  expect(hrefs.filter((href) => /^\/programs\/[^/]+$/.test(href))).toHaveLength(12);
  expect(hrefs.filter((href) => /^\/institutions\/[^/]+$/.test(href))).toHaveLength(8);
  expect(hrefs).toContain('/programs');
  expect(hrefs).toContain('/institutions');
  const footer = anchors(html.split('<footer')[1] ?? '');
  expect(footer).toEqual([
    '/',
    'mailto:info@findmyway.co.il',
    '/programs',
    '/institutions',
    '/about',
    '/app/saved-programs',
    '/privacy',
    '/terms',
    '/accessibility',
    '/contact',
  ]);
});

test('subject index is indexable and self-canonical', async ({ request }) => {
  const response = await request.get('/programs');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<link rel="canonical" href="https://findmyway.co.il/programs"/>');
  expect(html).not.toMatch(/<meta[^>]+name="robots"[^>]+noindex/);
  // Vercel sends `X-Robots-Tag: noindex` on every preview deployment, so the
  // header must match the homepage's rather than be absent.
  const home = await request.get('/');
  expect(response.headers()['x-robots-tag']).toBe(home.headers()['x-robots-tag']);
});

// Set-based so it holds on the live DB as well as the static fixture.
test('subject index lists exactly the hubs the sitemap publishes', async ({ request }) => {
  test.setTimeout(300_000);
  const html = await (await request.get('/programs')).text();
  const main = html.split('<main')[1]?.split('</main>')[0] ?? '';
  const index = anchors(main).map((href) => decodeURIComponent(href.replace(/^\/programs\//, '')));
  expect(index.length).toBeGreaterThan(0);
  expect(new Set(index).size).toBe(index.length);
  for (const id of ['cs', 'engineering', 'occupational_therapy']) expect(index).toContain(id);

  const xml = await (await request.get('/sitemap.xml')).text();
  const sitemapPrograms = [
    ...xml.matchAll(/<loc>https:\/\/findmyway\.co\.il\/programs\/([^<]+)<\/loc>/g),
  ].map((match) => decodeURIComponent(match[1]));
  for (const id of index) expect(sitemapPrograms, id).toContain(id);

  const api = await request.get('/api/catalog/programs');
  expect(api.status()).toBe(200);
  const rows: { id: string; institutionId?: string }[] = (await api.json()).data;
  const institutionProgramIds = new Set(
    rows.filter((row) => row.institutionId).map((row) => row.id),
  );
  // No hub slug may be built from one institution programme's id.
  for (const id of index)
    expect(
      [...institutionProgramIds].filter((programId) => id.startsWith(`${programId}_`)),
      id,
    ).toEqual([]);
  // Candidate pages: every sitemap programme URL plus every general subject in the
  // catalogue API, so 0-programme subjects (kept out of the sitemap) are checked too.
  const subjectRows = rows.filter((row) => !row.institutionId).map((row) => row.id);
  const candidates = [...new Set([...sitemapPrograms, ...subjectRows])];
  const pages = await mapLimited(candidates, 6, async (id) => {
    const response = await request.get(`/programs/${encodeURIComponent(id)}`);
    const page = await response.text();
    const main = page.split('<main')[1]?.split('</main>')[0] ?? '';
    const links = anchors(main);
    return {
      id,
      status: response.status(),
      kind: page.match(/<main[^>]*data-page-kind="([^"]+)"/)?.[1],
      canonical: page.includes(
        `<link rel="canonical" href="https://findmyway.co.il/programs/${encodeURIComponent(id)}"/>`,
      ),
      // The meta tag, not the header: Vercel previews add X-Robots-Tag: noindex everywhere.
      robots: page.match(/<meta name="robots" content="([^"]+)"/)?.[1],
      programLinks: links.filter(
        (href) => href.startsWith('/programs/') && href !== `/programs/${encodeURIComponent(id)}`,
      ).length,
      institutionLinks: links.filter((href) => href.startsWith('/institutions/')).length,
    };
  });
  const served = pages.filter((page) => page.status !== 404 || sitemapPrograms.includes(page.id));
  const zeroHubs: string[] = [];
  for (const page of served) {
    const { id, status, kind, canonical, robots, programLinks, institutionLinks } = page;
    expect(status, id).toBe(200);
    expect(canonical, id).toBe(true);
    if (kind === 'subject' && programLinks === 0) {
      // PM rule: a hub with no programme links stays up, noindex,follow, unlisted.
      zeroHubs.push(id);
      expect(robots, id).toBe('noindex, follow');
      expect(institutionLinks, id).toBeGreaterThan(0);
      expect(index, id).not.toContain(id);
      expect(sitemapPrograms, id).not.toContain(id);
    } else {
      expect(robots, id).toBeUndefined();
      expect(sitemapPrograms, id).toContain(id);
      // Exact set contract: an indexable subject page is in the index, a programme page is not.
      expect(kind, id).toBe(index.includes(id) ? 'subject' : 'programme');
    }
  }
  console.log(`0-programme hubs (noindex,follow): ${zeroHubs.sort().join(', ') || 'none'}`);
  for (const id of index)
    expect(
      served.find((page) => page.id === id)?.programLinks,
      `${id} programme links`,
    ).toBeGreaterThan(0);
});

for (const [id, hub, minimum] of [
  ['tau_cs', 'cs', 3],
  ['haifa_engineering', 'engineering', 3],
  ['huji_occupational_therapy', 'occupational_therapy', 1],
] as const) {
  test(`${id} has its hub and siblings in raw HTML`, async ({ request }) => {
    const response = await request.get(`/programs/${id}`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    const section = html.split('aria-labelledby="related-title"')[1]?.split('</section>')[0] ?? '';
    const hrefs = anchors(section);
    expect(hrefs).toContain(`/programs/${hub}`);
    expect(hrefs).not.toContain(`/programs/${id}`);
    const siblings = hrefs.filter((href) => href !== `/programs/${hub}`);
    expect(siblings.length).toBeGreaterThanOrEqual(minimum);
    expect(siblings.length).toBeLessThanOrEqual(8);
  });
}

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`browse links stay collapsed, readable and right-aligned at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'בדקו לאן אתם מתקבלים' })).toBeVisible();
    await expect(
      page
        .locator('.journey-hero-copy')
        .getByRole('link', { name: 'בדקו לאן אתם מתקבלים', exact: true }),
    ).toHaveAttribute('href', '/app/calculator');
    await expect(page.getByRole('button', { name: 'עזרו לי לבחור מה ללמוד' })).toHaveCount(0);
    const browse = page.locator('section[aria-labelledby="browse-title"]');
    await expect(browse).toBeVisible();
    await expect(browse).toHaveCSS('text-align', 'right');
    await expect(page.getByRole('navigation')).toHaveCount(3);
    const subjects = browse.locator('a[href^="/programs/"]');
    await expect(subjects.first()).toBeHidden();
    await browse.locator('summary').click();
    await expect(subjects).toHaveCount(12);
    await expect(subjects.first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();
    await footer.getByRole('link', { name: 'תחומי לימוד', exact: true }).click();
    await expect(page).toHaveURL(/\/programs$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('תחומי לימוד');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole('link', { name: 'מדעי המחשב', exact: true }).click();
    await expect(page).toHaveURL(/\/programs\/cs$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('מדעי המחשב');
  });
}

test('collapsed browse links and the subject index work without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const page = await browser.newPage({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 900 },
  });
  try {
    await page.goto(`${baseURL}/`);
    const browse = page.locator('section[aria-labelledby="browse-title"]');
    await browse.locator('summary').click();
    await expect(browse.locator('a[href^="/institutions/"]').first()).toBeVisible();
    await page.getByRole('contentinfo').getByRole('link', { name: 'תחומי לימוד' }).click();
    await expect(page).toHaveURL(/\/programs$/);
    await page.getByRole('link', { name: 'מדעי המחשב', exact: true }).click();
    await expect(page).toHaveURL(/\/programs\/cs$/);
  } finally {
    await page.close();
  }
});
