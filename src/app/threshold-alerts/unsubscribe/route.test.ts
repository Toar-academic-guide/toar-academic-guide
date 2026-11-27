import { expect, it } from 'vitest';
import { GET } from './route';
it('keeps the bearer link out of app analytics, caches, referrers and GET parameters', async () => {
  const response = GET();
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
  const html = await response.text();
  expect(html).toContain('location.hash');
  expect(html).toContain('history.replaceState');
  expect(html).toContain("method:'POST'");
  expect(html).toContain('הוסרת מעדכוני תנאי הקבלה לשנת 2027');
  expect(html).not.toMatch(/posthog|googletagmanager|_next\/static/);
});
