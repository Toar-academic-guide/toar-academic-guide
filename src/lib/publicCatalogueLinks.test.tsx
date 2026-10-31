import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { prerender } from 'react-dom/static';
import { describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import Home from '@/app/page';
import SubjectIndexPage, { metadata as subjectIndexMetadata } from '@/app/programs/page';
import ProgramPage, { generateMetadata } from '@/app/programs/[programId]/page';
import { institutionProgramName } from '@/lib/institutionProgramName';
import { canonicalProgramId } from '@/lib/seo/programAliases';
import { CatalogueBrowse, RelatedPrograms } from '@/components/seo/CatalogueLinks';
import SiteFooter from '@/components/SiteFooter';
import { getPublicBrowseLinks, getPublicRelatedPrograms } from './publicCatalogueLinks';

vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/components/StudyJourney', () => ({
  default: ({ browse }: { browse: React.ReactNode }) => (
    <>
      <a href="/app/calculator">בדקו לאן אתם מתקבלים</a>
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
  it('keeps subject hubs in collapsed homepage and browse HTML without institution links', async () => {
    const links = await getPublicBrowseLinks();
    const home = await ssr(<Home />);
    const browse = renderToStaticMarkup(<CatalogueBrowse {...links} />);
    expect(home).toContain('בדקו לאן אתם מתקבלים');
    expect(browse).toContain('dir="rtl"');
    for (const html of [home, browse]) {
      expect(paths(html).filter((href) => href.startsWith('/institutions/'))).toHaveLength(0);
      const details = html.slice(html.indexOf('<details'), html.indexOf('</details>'));
      expect(details.startsWith('<details>')).toBe(true);
      expect(details).not.toMatch(/<details[^>]*\bopen\b/);
      expect(paths(details).filter((href) => href.startsWith('/programs/'))).toEqual(
        links.hubs.slice(0, 12).map((hub) => `/programs/${hub.id}`),
      );
      expect(paths(details)).toContain('/programs');
      expect(paths(details)).not.toContain('/institutions');
      expect(details).not.toContain('מוסדות לימוד');
      expect(details).not.toContain('כל המוסדות');
    }
  });

  it('links SiteFooter to home, email, catalogue, saved programs and legal pages', () => {
    const hrefs = paths(renderToStaticMarkup(<SiteFooter />));
    expect(hrefs).toEqual([
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

  it('keeps the homepage CTA and SiteFooter links when the catalogue read fails', async () => {
    const failure = () => Promise.reject(new Error('database unavailable'));
    queries.listCataloguePrograms.mockImplementationOnce(failure);
    const home = await ssr(<Home />);
    expect(home).toContain('בדקו לאן אתם מתקבלים');
    expect(home).not.toContain('browse-title');
    expect(paths(renderToStaticMarkup(<SiteFooter />))).toEqual([
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

  it('renders SiteFooter as a contentinfo landmark with two labelled navs', () => {
    const markup = renderToStaticMarkup(<SiteFooter />);
    expect(markup.startsWith('<footer')).toBe(true);
    expect([...markup.matchAll(/<nav\b/g)]).toHaveLength(2);
    expect(markup).toContain('aria-label="ניווט בכותרת התחתונה"');
    expect(markup).toContain('aria-label="קישורים משפטיים"');
  });

  it('lists every subject hub on the indexable /programs page', async () => {
    const links = await getPublicBrowseLinks();
    const html = renderToStaticMarkup(await SubjectIndexPage());
    expect(html).toContain('<h1');
    expect(html).toContain('תחומי לימוד');
    const hrefs = paths(html);
    expect(hrefs).toHaveLength(links.hubs.length);
    expect(new Set(hrefs)).toEqual(new Set(links.hubs.map((hub) => `/programs/${hub.id}`)));
    expect(hrefs).toContain('/programs/engineering');
    expect(subjectIndexMetadata.alternates).toEqual({ canonical: '/programs' });
    expect(subjectIndexMetadata.robots).toBeUndefined();
    expect(subjectIndexMetadata.openGraph).toMatchObject({ url: '/programs' });
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

  // Subjects whose slug is taken by a different subject would only get a slug
  // built from one institution's programme id (`<programme>_subject`), so they
  // have no public hub and their programmes show no related block (as on prod).
  const UNPUBLISHED_SUBJECT_PROGRAMS = [
    'bezalel_graphic_design',
    'beit_berl_graphic_design',
    'minshar_graphic_design',
    'tiltan_graphic_design',
    'danon_culinary',
    'hackeru_cs',
    'jerusalem_academy_dance',
    'reichman_infosystems',
    'colmgmt_infosystems',
    'reidman_medicine',
  ];

  it('gives no hub or related block to programmes whose subject slug is taken', async () => {
    for (const id of UNPUBLISHED_SUBJECT_PROGRAMS) {
      const related = await getPublicRelatedPrograms(id);
      expect(related.hub, id).toBeUndefined();
      expect(renderToStaticMarkup(<RelatedPrograms {...related} />), id).toBe('');
    }
  });

  it('gives every other institution program a reachable subject hub and all available siblings up to eight', async () => {
    const source = getStaticCataloguePrograms().filter(
      (program) =>
        program.institutionId &&
        program.isListed !== false &&
        !program.id.startsWith('mon_') &&
        canonicalProgramId(program.id) === program.id,
    );
    for (const program of source) {
      if (UNPUBLISHED_SUBJECT_PROGRAMS.includes(program.id)) continue;
      const related = await getPublicRelatedPrograms(program.id);
      expect(related.hub, program.id).toBeDefined();
      const hrefs = paths(renderToStaticMarkup(<RelatedPrograms {...related} />));
      // PM rule (#271): a hub with no programme links is noindex, so the block
      // links its sibling programmes but not the hub itself.
      if (related.hub!.programLinks > 0)
        expect(hrefs, program.id).toContain(`/programs/${related.hub!.id}`);
      else expect(hrefs, program.id).not.toContain(`/programs/${related.hub!.id}`);
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
