import { expect, test } from './fixtures';

test('homepage canonical and JSON-LD use the slashed root URL', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<link rel="canonical" href="https://findmyway.co.il/"');
  const graphs = [
    ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g),
  ].flatMap((match) => JSON.parse(match[1])['@graph']);
  for (const type of ['Organization', 'WebSite', 'WebApplication']) {
    expect(graphs.find((node) => node['@type'] === type).url).toBe('https://findmyway.co.il/');
  }
});

test('sitemap has exactly one slashed root and stable real dates for every URL', async ({
  request,
}) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml.match(/<loc>https:\/\/findmyway.co.il\/<\/loc>/g)).toHaveLength(1);
  const urls = xml.match(/<url>.*?<\/url>/gs)!;
  const dates = urls.map((url) => url.match(/<lastmod>(.*?)<\/lastmod>/)?.[1]);
  for (const date of dates) expect(Number.isFinite(Date.parse(date ?? ''))).toBe(true);
  expect(new Set(dates).size).toBeGreaterThan(1);
  expect(await (await request.get('/sitemap.xml')).text()).toBe(xml);
  for (const url of urls.slice(1))
    expect(url.match(/<loc>(.*?)<\/loc>/)?.[1].endsWith('/')).toBe(false);
});
