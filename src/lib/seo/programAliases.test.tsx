import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProgramPage from '@/app/programs/[programId]/page';
import sitemap from '@/app/sitemap';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { institutionProgramName } from '@/lib/institutionProgramName';
import {
  getPublicInstitutionPageData,
  getPublicProgramPageData,
  getPublicProgramRequirementSources,
  loadPublicCatalogue,
} from '@/lib/publicCataloguePages';
import { listCatalogueInstitutions, listCataloguePrograms } from '@/server/catalogue/queries';
import { SITE_URL } from '@/lib/site';
import { indexableProgramIds } from './indexability';
import { programBreadcrumbLd, programLd } from './jsonLd';
import { buildProgramMetadata } from './metadata';
import { PROGRAM_CANONICAL_ALIASES } from './programAliases';

vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));

const aliases = [
  ['danon_cs', 'danon_culinary'],
  ['mta_cs', 'tlvyaffo_cs'],
  ['colman_law', 'colmgmt_law'],
  ['colman_business', 'colmgmt_business'],
  ['colman_cs', 'colmgmt_cs'],
  ['beit_zvi_acting', 'beit_zvi_cs'],
  ['bishulim_culinary', 'bishulim_cs'],
  ['wingate_physical_ed', 'wingate_cs'],
  ['nativ_acting', 'nativ_graphic_design'],
] as const;
const programs = getStaticCataloguePrograms();
// Persisted rows include IDs absent from today's static catalogue. Put aliases
// first so provider selection cannot accidentally depend on database row order.
const databasePairs = aliases.flatMap(([hidden, keeper]) => {
  const canonical = programs.find((program) => program.id === keeper) ?? {
    ...programs.find((program) => program.id === hidden)!,
    id: keeper,
  };
  return [
    programs.find((program) => program.id === hidden) ?? { ...canonical, id: hidden },
    canonical,
  ];
});

beforeEach(() => {
  vi.mocked(listCataloguePrograms).mockResolvedValue({
    data: databasePairs,
    meta: { catalogueSource: 'database' },
  });
  vi.mocked(listCatalogueInstitutions).mockResolvedValue({
    data: getStaticCatalogueInstitutions(),
    meta: {},
  });
});

describe('canonical programme aliases', () => {
  it('registers the approved aliases without changing their IDs', () => {
    expect(PROGRAM_CANONICAL_ALIASES).toEqual(Object.fromEntries(aliases));
  });

  it.each(aliases)('keeps %s accessible while advertising only %s', async (hidden, keeper) => {
    const page = (await getPublicProgramPageData(hidden))!;
    expect(page.program.id).toBe(hidden);
    expect((await getPublicProgramPageData(keeper))?.program.id).toBe(keeper);
    const institution = (await getPublicInstitutionPageData(page.program.institutionId!))!;
    expect(institution.programs.map((program) => program.id)).not.toContain(hidden);
    expect(institution.programs.map((program) => program.id)).toContain(keeper);
    const indexable = await indexableProgramIds();
    expect(indexable).not.toContain(hidden);
    expect(indexable).toContain(keeper);
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).not.toContain(`${SITE_URL}/programs/${hidden}`);
    expect(urls).toContain(`${SITE_URL}/programs/${keeper}`);
    const metadata = await buildProgramMetadata(hidden);
    expect(metadata.alternates).toEqual({ canonical: `/programs/${keeper}` });
    expect(metadata.openGraph).toMatchObject({ url: `/programs/${keeper}` });
    expect(metadata.robots).toBeUndefined();
    expect(await programLd(page)).toMatchObject({
      '@id': `${SITE_URL}/programs/${keeper}#program`,
      url: `${SITE_URL}/programs/${keeper}`,
    });
    expect(JSON.stringify(await programLd(page))).not.toContain(`/programs/${hidden}`);
    expect(programBreadcrumbLd(page).itemListElement.at(-1)?.item).toBe(
      `${SITE_URL}/programs/${keeper}`,
    );
    expect(
      renderToStaticMarkup(await ProgramPage({ params: Promise.resolve({ programId: hidden }) })),
    ).toContain('<h1');
  });

  it.each(['mta', 'colman', 'danon', 'beit_zvi', 'bishulim', 'wingate', 'nativ'])(
    'shows unique card names with own programmes first at %s',
    async (id) => {
      const page = (await getPublicInstitutionPageData(id))!;
      const names = page.programs.map((program) =>
        institutionProgramName(program, page.institution),
      );
      expect(new Set(names).size).toBe(names.length);
      const own = page.programs.filter((program) => program.institutionId === id);
      expect(page.programs.slice(0, own.length)).toEqual(own);
    },
  );

  it.each(aliases)(
    'selects the keeper of %s for subject links and requirements',
    async (hidden, keeper) => {
      const canonical = databasePairs.find((program) => program.id === keeper)!;
      const alias = { ...canonical, id: hidden, admissionRequirements: ['תנאי ישן'] };
      const subject = {
        ...canonical,
        id: 'test_subject',
        institutionId: undefined,
        admissionRequirements: [],
        institutionDetails: [],
        thresholds: undefined,
      };
      const specific = {
        ...canonical,
        admissionRequirements: ['ריאיון קבלה'],
        institutionDetails: [],
      };
      vi.mocked(listCataloguePrograms).mockResolvedValue({
        data: [alias, subject, specific],
        meta: { catalogueSource: 'database' },
      });
      const catalogue = await loadPublicCatalogue();
      expect(
        catalogue.institutionProgramsByName.get(canonical.name)?.get(canonical.institutionId!)?.id,
      ).toBe(keeper);
      const page = (await getPublicProgramPageData(subject.id))!;
      expect(page.institutionProgramPaths[canonical.institutionId!]).toBe(`/programs/${keeper}`);
      expect(
        (await getPublicProgramRequirementSources(page))[canonical.institutionId!],
      ).toMatchObject({
        sourceProgramId: keeper,
        requirements: ['ריאיון קבלה'],
      });
    },
  );
});
