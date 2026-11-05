import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: mocks.load,
  listCatalogueInstitutions: mocks.load,
  CatalogueQueryError: class extends Error {},
}));
import { GET as programs } from '@/app/api/catalog/programs/route';
import { GET as institutions } from '@/app/api/catalog/institutions/route';
beforeEach(() => {
  mocks.load.mockReset();
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
describe.each([
  ['programs', programs],
  ['institutions', institutions],
] as const)('%s CDN headers', (_name, GET) => {
  it('caches successful DB responses', async () => {
    mocks.load.mockResolvedValue({ data: [], meta: { catalogueSource: 'database' } });
    expect((await GET()).headers.get('cache-control')).toBe(
      'public, s-maxage=120, stale-while-revalidate=600',
    );
  });
  it('does not cache errors or fallback responses', async () => {
    mocks.load.mockRejectedValueOnce(new Error('offline'));
    const error = await GET();
    expect(error.status).toBe(503);
    expect(error.headers.get('cache-control')).toBe('no-store');
    for (const meta of [
      { catalogueSource: 'static' },
      { catalogueSource: 'database', fallbackReason: 'degraded' },
    ]) {
      mocks.load.mockResolvedValue({ data: [], meta });
      expect((await GET()).headers.get('cache-control')).toBe('no-store');
    }
  });
});

it('CDN-caches DB programmes supplemented by the code registry', async () => {
  mocks.load.mockResolvedValue({
    data: [],
    meta: { catalogueSource: 'database' },
  });
  expect((await programs()).headers.get('cache-control')).toBe(
    'public, s-maxage=120, stale-while-revalidate=600',
  );
});
