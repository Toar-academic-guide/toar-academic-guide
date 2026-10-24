import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import SubjectIndexPage from '@/app/programs/page';
import ProgramPage from '@/app/programs/[programId]/page';
import sitemap from '@/app/sitemap';
import { loadPublicCatalogue } from '@/lib/publicCataloguePages';
import { getPublicSubjectHub } from '@/lib/publicCatalogueLinks';
import { SITE_URL } from '@/lib/site';
import type { CatalogueProgram } from '@/types/catalogue';

vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
const queries = vi.hoisted(() => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));
vi.mock('@/server/catalogue/queries', () => queries);
queries.listCatalogueInstitutions.mockImplementation(async () => ({
  data: getStaticCatalogueInstitutions(),
  meta: {},
}));

const staticPrograms = getStaticCataloguePrograms();
const like = (id: string, patch: Partial<CatalogueProgram>) => ({
  ...staticPrograms.find((program) => program.id === id)!,
  ...patch,
});
// Rows the live DB has and the static fixture lacks (seen on the #271 preview):
// canonical ids whose descriptive alias names a new subject.
const liveDbRows: CatalogueProgram[] = [
  like('wingate_physical_ed', { id: 'wingate_cs' }),
  like('bishulim_chef', { id: 'bishulim_cs', name: 'קולינריה' }),
];

const catalogues = {
  'static fixture': staticPrograms,
  'static fixture + live-DB-only rows': [...staticPrograms, ...liveDbRows],
};

function hrefs(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
}

describe.each(Object.entries(catalogues))('subject hub contract on the %s', (_, programs) => {
  async function load() {
    queries.listCataloguePrograms.mockImplementation(async () => ({ data: programs, meta: {} }));
    const catalogue = await loadPublicCatalogue();
    const index = hrefs(renderToStaticMarkup(await SubjectIndexPage())).map((href) =>
      decodeURIComponent(href.replace(/^\/programs\//, '')),
    );
    const institutionProgramIds = new Set(
      catalogue.programs
        .filter((program) => !catalogue.generalProgramIds.has(program.id))
        .map((program) => program.id),
    );
    const sitemapHubs = (await sitemap())
      .map((entry) => entry.url)
      .filter((url) => url.startsWith(`${SITE_URL}/programs/`))
      .map((url) => decodeURIComponent(url.slice(`${SITE_URL}/programs/`.length)))
      .filter((id) => !institutionProgramIds.has(id));
    return { catalogue, index, institutionProgramIds, sitemapHubs };
  }

  it('lists each hub once and exactly the hubs the sitemap publishes', async () => {
    const { index, sitemapHubs } = await load();
    expect(new Set(index).size).toBe(index.length);
    expect([...sitemapHubs].sort()).toEqual([...index].sort());
  });

  it('only lists hubs the hub route serves with a self-canonical', async () => {
    const { catalogue, index } = await load();
    for (const id of index) {
      if (catalogue.generalProgramIds.has(id)) continue;
      expect((await getPublicSubjectHub(id))?.hub.id, id).toBe(id);
      const html = renderToStaticMarkup(
        await ProgramPage({ params: Promise.resolve({ programId: id }) }),
      );
      expect(html, id).toContain('<h1');
      expect(html, id).toContain('data-page-kind="subject"');
    }
  });

  it('never publishes a hub slug built from one institution programme id', async () => {
    const { index, institutionProgramIds } = await load();
    const artifacts = index.filter((id) =>
      [...institutionProgramIds].some((programId) => id.startsWith(`${programId}_`)),
    );
    expect(artifacts).toEqual([]);
    for (const id of artifacts) expect(await getPublicSubjectHub(id)).toBeNull();
  });
});

it('publishes the live-DB-only subjects as hubs in both the index and the sitemap', async () => {
  queries.listCataloguePrograms.mockImplementation(async () => ({
    data: [...staticPrograms, ...liveDbRows],
    meta: {},
  }));
  const index = hrefs(renderToStaticMarkup(await SubjectIndexPage()));
  const urls = (await sitemap()).map((entry) => entry.url);
  for (const id of ['physical_ed', 'culinary']) {
    expect(index).toContain(`/programs/${id}`);
    expect(urls).toContain(`${SITE_URL}/programs/${id}`);
  }
});
