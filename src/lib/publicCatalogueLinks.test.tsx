import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { prerender } from 'react-dom/static';
import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import Home from '@/app/page';
import ProgramPage, { generateMetadata } from '@/app/programs/[programId]/page';
import { institutionProgramName } from '@/lib/institutionProgramName';
import { canonicalProgramId } from '@/lib/seo/programAliases';
import { CatalogueBrowse, CatalogueFooter, RelatedPrograms } from '@/components/seo/CatalogueLinks';
import { getPublicBrowseLinks, getPublicRelatedPrograms } from './publicCatalogueLinks';

vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/components/StudyJourney', () => ({
  default: ({ browse }: { browse: React.ReactNode }) => (
    <>
      <button>עזרו לי לבחור מה ללמוד</button>
      {browse}
    </>
  ),
}));
const queries = vi.hoisted(() => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));
vi.mock('@/server/catalogue/queries', () => queries);
queries.listCataloguePrograms.mockImplementation(async () => ({
  data: getStaticCataloguePrograms(),
  meta: {},
}));
queries.listCatalogueInstitutions.mockImplementation(async () => ({
  data: getStaticCatalogueInstitutions(),
  meta: {},
}));

// Waits for Suspense boundaries, like the server HTML response.
async function ssr(element: ReactNode): Promise<string> {
  const { prelude } = await prerender(element);
  return new Response(prelude).text();
}

function paths(markup: string): string[] {
  return [...markup.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
}

describe('server-rendered crawl paths', () => {
  it('renders at least 20 catalogue anchors in the homepage, including all hubs and 16 institutions', async () => {
    const links = await getPublicBrowseLinks();
    const hrefs = paths(await ssr(<Home />));
    expect(
      hrefs.filter((href) => /^\/(institutions|programs)\//.test(href)).length,
    ).toBeGreaterThanOrEqual(20);
    expect(links.institutions).toHaveLength(16);
    expect(links.hubs.length).toBeGreaterThanOrEqual(23);
    for (const hub of links.hubs) expect(hrefs).toContain(`/programs/${hub.id}`);
    for (const institution of links.institutions)
      expect(hrefs).toContain(`/institutions/${institution.id}`);
    expect(hrefs).toContain('/institutions');
    expect(renderToStaticMarkup(<CatalogueBrowse {...links} />)).toContain('dir="rtl"');
  });

  it('renders every hub in the site-wide footer with the directory and about links', async () => {
    const links = await getPublicBrowseLinks();
    const hrefs = paths(renderToStaticMarkup(await CatalogueFooter()));
    expect(hrefs).toContain('/institutions');
    expect(hrefs).toContain('/about');
    for (const hub of links.hubs) expect(hrefs).toContain(`/programs/${hub.id}`);
  });

  it('keeps the homepage CTA and static footer links when the catalogue read fails', async () => {
    const failure = () => Promise.reject(new Error('database unavailable'));
    queries.listCataloguePrograms.mockImplementationOnce(failure).mockImplementationOnce(failure);
    const home = await ssr(<Home />);
    expect(home).toContain('עזרו לי לבחור מה ללמוד');
    expect(home).not.toContain('browse-title');
    const footer = paths(renderToStaticMarkup(await CatalogueFooter()));
    expect(footer).toEqual(['/institutions', '/about']);
  });

  it('renders the footer as a contentinfo landmark without a second nav', async () => {
    const markup = renderToStaticMarkup(await CatalogueFooter());
    expect(markup.startsWith('<footer')).toBe(true);
    expect(markup).not.toContain('<nav');
  });

  it('links CS to its hub and eight siblings at other institutions, excluding self and aliases', async () => {
    const related = await getPublicRelatedPrograms('tau_cs');
    const hrefs = paths(renderToStaticMarkup(<RelatedPrograms {...related} />));
    expect(hrefs).toContain('/programs/cs');
    expect(related.programs).toHaveLength(8);
    expect(hrefs).not.toContain('/programs/tau_cs');
    expect(hrefs).not.toContain('/programs/mta_cs');
    expect(related.programs.every((program) => program.institutionId !== 'tau')).toBe(true);
  });

  it('links all available siblings when the subject has fewer than three', async () => {
    const related = await getPublicRelatedPrograms('huji_occupational_therapy');
    expect(related.hub?.id).toBe('occupational_therapy');
    expect(related.programs.map((program) => program.id)).toEqual(['tau_occupational_therapy']);
  });
  it('renders the related section on the program page itself', async () => {
    const html = renderToStaticMarkup(
      await ProgramPage({ params: Promise.resolve({ programId: 'tau_cs' }) }),
    );
    const related = html.split('aria-labelledby="related-title"')[1];
    expect(related).toBeTruthy();
    const hrefs = paths(related);
    expect(hrefs).toContain('/programs/cs');
    expect(hrefs.filter((href) => href.startsWith('/programs/'))).toHaveLength(9);
    expect(hrefs).not.toContain('/programs/tau_cs');
  });

  it('gives every institution program a reachable subject hub and all available siblings up to eight', async () => {
    const source = getStaticCataloguePrograms().filter(
      (program) =>
        program.institutionId &&
        program.isListed !== false &&
        !program.id.startsWith('mon_') &&
        canonicalProgramId(program.id) === program.id,
    );
    for (const program of source) {
      const related = await getPublicRelatedPrograms(program.id);
      expect(related.hub, program.id).toBeDefined();
      const hrefs = paths(renderToStaticMarkup(<RelatedPrograms {...related} />));
      expect(hrefs, program.id).toContain(`/programs/${related.hub!.id}`);
      expect(hrefs, program.id).not.toContain(`/programs/${program.id}`);
      expect(related.programs.length).toBeLessThanOrEqual(8);
      const institutions = getStaticCatalogueInstitutions();
      const subjectName = (p: typeof program) =>
        institutionProgramName(
          p,
          institutions.find((i) => i.id === p.institutionId)!,
        );
      const sameNameSiblings = new Set(
        source
          .filter(
            (p) =>
              p.institutionId !== program.institutionId && subjectName(p) === subjectName(program),
          )
          .map((p) => p.institutionId),
      ).size;
      expect(related.programs.length, program.id).toBeGreaterThanOrEqual(
        Math.min(8, sameNameSiblings),
      );
      const available = new Set(
        related
          .hub!.programs.filter((p) => p.institutionId && p.institutionId !== program.institutionId)
          .map((p) => p.institutionId),
      ).size;
      expect(related.programs.length, program.id).toBe(Math.min(8, available));
      expect(new Set(related.programs.map((p) => p.institutionId)).size).toBe(
        related.programs.length,
      );
      for (const sibling of related.programs) expect(hrefs).toContain(`/programs/${sibling.id}`);
    }
  });

  it('renders missing engineering hubs from real catalogue programs with a self-canonical', async () => {
    const params = Promise.resolve({ programId: 'engineering' });
    const html = renderToStaticMarkup(await ProgramPage({ params }));
    expect(html).toContain('הנדסה וטכנולוגיה');
    expect(paths(html)).toContain('/programs/huji_engineering');
    expect(paths(html)).toContain('/programs/tau_engineering');
    expect(await generateMetadata({ params })).toMatchObject({
      alternates: { canonical: '/programs/engineering' },
    });
  });
  it.each([
    ['biu_medicine', 'medicine'],
    ['technion_datascience', 'datascience'],
    ['tlvyaffo_business', 'business'],
    ['haifa_communication', 'communication'],
    ['ariel_nutrition', 'nutrition'],
  ])(
    'keeps %s in its established %s subject despite a different display name',
    async (programId, hubId) => {
      const related = await getPublicRelatedPrograms(programId);
      expect(related.hub?.id).toBe(hubId);
    },
  );
});
