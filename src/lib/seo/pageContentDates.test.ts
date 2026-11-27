import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));
import { listCataloguePrograms, listCatalogueInstitutions } from '@/server/catalogue/queries';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { loadPublicCatalogue } from '@/lib/publicCataloguePages';
import { buildSubjectHubs } from '@/lib/publicCatalogueLinks';
import sitemap from '@/app/sitemap';
import { PAGE_CONTENT_DATES } from './pageContentDates';

beforeEach(() => {
  vi.mocked(listCataloguePrograms).mockResolvedValue({
    data: getStaticCataloguePrograms(),
    meta: { catalogueSource: 'static' },
  });
  vi.mocked(listCatalogueInstitutions).mockResolvedValue({
    data: getStaticCatalogueInstitutions(),
    meta: {},
  });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('authored sitemap content dates', () => {
  it('registers every static page and published subject hub with a real ISO calendar date', async () => {
    const hubs = buildSubjectHubs(await loadPublicCatalogue()).publishedHubs;
    const entries = await sitemap();
    const staticPaths = entries
      .map((entry) => new URL(entry.url).pathname)
      .filter((path) => !path.startsWith('/programs/') && !path.startsWith('/institutions/'));
    for (const path of [
      ...staticPaths,
      ...hubs.map((h) => `/programs/${h.id}`),
      ...Object.keys(PAGE_CONTENT_DATES),
    ]) {
      const date = PAGE_CONTENT_DATES[path];
      expect(date, path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(date).toISOString().slice(0, 10), path).toBe(date);
    }
  });
  it('corrects rebuilt hubs and static pages without changing dates on every deploy', async () => {
    const before = await sitemap();
    for (const path of ['/programs/prep', '/programs/nursing', '/amirnet', '/psychometric-dates']) {
      expect(before.find((entry) => new URL(entry.url).pathname === path)?.lastModified).toBe(
        '2026-11-19',
      );
    }
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime('2031-04-01T10:00:00Z');
    expect(await sitemap()).toEqual(before);
  });
  it('preserves newer database content and propagates it to hubs and indexes', async () => {
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: getStaticCataloguePrograms().map((program) =>
        program.id === 'haifa_nursing'
          ? { ...program, updatedAt: '2026-12-01T12:00:00Z' }
          : program,
      ),
      meta: { catalogueSource: 'database' },
    });
    const entries = await sitemap();
    for (const path of [
      '/programs/haifa_nursing',
      '/programs/nursing',
      '/institutions/haifa',
      '/programs',
      '/institutions',
    ]) {
      expect(
        entries.find((entry) => new URL(entry.url).pathname === path)?.lastModified,
        path,
      ).toBe('2026-12-01T12:00:00Z');
    }
  });
});
