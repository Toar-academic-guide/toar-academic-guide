// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import type { InstitutionId } from '@/data/institutions';
import { applyCatalogueContentRepair } from '@/data/admissions/catalogueContentRepair';
import type { ReactNode } from 'react';
import InstitutionPage from '@/app/institutions/[institutionId]/page';
import ProgramPage from '@/app/programs/[programId]/page';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import JsonLd from '@/components/seo/JsonLd';
import { getInstitutionDirectoryItems } from '@/data/institutionDirectory';
import { buildRobots, TRAINING_BOTS_POLICY } from './robots';
import { buildSubjectHubs } from '@/lib/publicCatalogueLinks';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import {
  getPublicInstitutionPageData,
  getPublicProgramPageData,
  getPublicProgramRequirementSources,
  loadPublicCatalogue,
} from '@/lib/publicCataloguePages';
import * as catalogueDisplayText from '@/lib/catalogueDisplayText';
import { absoluteUrl, SITE_ALT_NAMES, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import {
  indexableInstitutionIds,
  indexableProgramIds,
  isIndexableInstitution,
  isIndexableProgram,
} from './indexability';
import { buildInstitutionMetadata, buildProgramMetadata } from './metadata';
import { canonicalProgramId } from './programAliases';
import {
  breadcrumbLd,
  institutionDirectoryLd,
  webApplicationLd,
  institutionBreadcrumbLd,
  institutionLd,
  organizationLd,
  programBreadcrumbLd,
  programFaqPageLd,
  programLd,
  websiteLd,
} from './jsonLd';

vi.mock('server-only', () => ({}));
vi.mock('@/components/WayPageShell', () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/server/catalogue/queries', () => ({
  listCataloguePrograms: vi.fn(),
  listCatalogueInstitutions: vi.fn(),
}));
import { listCataloguePrograms, listCatalogueInstitutions } from '@/server/catalogue/queries';
beforeEach(() => {
  vi.mocked(listCataloguePrograms).mockResolvedValue({
    data: getStaticCataloguePrograms().map((program) => ({
      ...program,
      institutionId: program.institutionId ?? (program.linkedInstitutionIds[0] as InstitutionId),
    })),
    meta: { catalogueSource: 'database' },
  });
  vi.mocked(listCatalogueInstitutions).mockResolvedValue({
    data: [
      ...getStaticCatalogueInstitutions(),
      ...getInstitutionDirectoryItems()
        .filter(
          (item) =>
            !getStaticCatalogueInstitutions().some((institution) => institution.id === item.id),
        )
        .map((item) => ({
          id: item.id as InstitutionId,
          name: item.name,
          region: 'center' as const,
        })),
    ],
    meta: {},
  });
});
const institutions = getStaticCatalogueInstitutions();
const programs = getStaticCataloguePrograms();

describe('crawl policy', () => {
  it('directs llms.txt readers to public pages and preserves the business-model disclosure', async () => {
    const llms = readFileSync('public/llms.txt', 'utf8');
    expect(llms).not.toContain('/app/');
    expect(llms).toContain('https://findmyway.co.il/institutions');
    expect(llms).toContain('https://findmyway.co.il/programs/<id>');
    expect(llms.split('\n')).toContain(
      'Business model: MyWay is free for students; revenue comes from referring qualified leads to academic institutions.',
    );
    expect(llms).toContain('Last updated: 2026-10-22');
  });

  it('separates wildcard, search and allowed training policies with operational exclusions', async () => {
    expect(robots()).toEqual(buildRobots(TRAINING_BOTS_POLICY));
    const result = buildRobots('allow');
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    expect(rules.map((rule) => rule.userAgent)).toEqual([
      '*',
      [
        'OAI-SearchBot',
        'ChatGPT-User',
        'PerplexityBot',
        'Perplexity-User',
        'Claude-SearchBot',
        'Claude-User',
      ],
      ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'Applebot-Extended'],
    ]);
    for (const rule of rules) {
      expect(rule.allow).toBe('/');
      expect(rule.disallow).toEqual([
        '/app/',
        '/login',
        '/api/',
        '/internal/',
        '/auth/',
        '/admission-alerts/',
        '/ingest/',
        '/dev',
      ]);
      expect(rule.disallow).not.toContain('/signup');
      expect(rule.disallow).not.toContain('/enquiry');
    }
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(result.host).toBe(SITE_URL);
  });

  it('can block training in one policy change without affecting answer/search crawlers', async () => {
    const allowed = buildRobots('allow');
    const blocked = buildRobots('block');
    expect(Array.isArray(allowed.rules) && Array.isArray(blocked.rules)).toBe(true);
    if (!Array.isArray(allowed.rules) || !Array.isArray(blocked.rules))
      throw new Error('Expected rule groups');
    expect(blocked.rules.slice(0, 2)).toEqual(allowed.rules.slice(0, 2));
    expect(blocked.rules[2].userAgent).toEqual(allowed.rules[2].userAgent);
    expect(blocked.rules[2].disallow).toBe('/');
    expect(blocked.rules[2].allow).toBeUndefined();
  });

  it('indexes exactly existing non-opaque pages with at least one resolved relation', async () => {
    for (const institution of institutions) {
      expect(await isIndexableInstitution(institution.id)).toBe(
        !institution.id.startsWith('mon_') &&
          (await getPublicInstitutionPageData(institution.id))!.programs.length > 0,
      );
    }
    // PM rule (#271): a general subject page that links to no programme page
    // (institution links only) is a thin hub and is not indexable.
    const thinSubjects = new Set<string>();
    for (const program of programs) {
      const data = await getPublicProgramPageData(program.id);
      if (
        data?.isGeneral &&
        !Object.values(data.institutionProgramPaths).some((path) => path.startsWith('/programs/'))
      )
        thinSubjects.add(program.id);
    }
    expect([...thinSubjects].sort()).toEqual([
      'communication',
      'education',
      'nutrition',
      'pharmacy',
      'sports_science',
    ]);
    for (const program of programs) {
      expect(await isIndexableProgram(program.id)).toBe(
        canonicalProgramId(program.id) === program.id &&
          !program.id.startsWith('mon_') &&
          program.isListed !== false &&
          (await getPublicProgramPageData(program.id))!.institutions.length > 0 &&
          !thinSubjects.has(program.id),
      );
    }
    expect(await isIndexableInstitution('tau')).toBe(true);
    expect(await isIndexableProgram('tau_cs')).toBe(true);
    expect(await isIndexableInstitution('weizmann')).toBe(false);
    expect(await isIndexableInstitution('missing')).toBe(false);
    expect(await isIndexableProgram('missing')).toBe(false);
    expect(await indexableInstitutionIds()).toEqual(
      institutions
        .filter(
          (i) =>
            !i.id.startsWith('mon_') &&
            programs.some((p) => p.isListed !== false && p.linkedInstitutionIds.includes(i.id)),
        )
        .map((i) => i.id),
    );
    expect(await indexableProgramIds()).toEqual(
      programs
        .filter(
          (p) =>
            canonicalProgramId(p.id) === p.id &&
            !p.id.startsWith('mon_') &&
            p.isListed !== false &&
            institutions.some((i) => p.linkedInstitutionIds.includes(i.id)) &&
            !thinSubjects.has(p.id),
        )
        .map((p) => p.id),
    );
  }, 15_000);

  it('keeps all 401 canonical public URLs in order with stable data modification dates', async () => {
    const entries = await sitemap();
    for (const path of ['/tt', '/ig', '/fb', '/wa']) {
      expect(entries.map((entry) => entry.url)).not.toContain(`${SITE_URL}${path}`);
    }
    const urls = entries.map((entry) => entry.url);
    const catalogue = await loadPublicCatalogue();
    const generatedHubIds = buildSubjectHubs(catalogue)
      .hubs.map((hub) => hub.id)
      .filter((id) => !catalogue.generalProgramIds.has(id));
    expect(urls).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/about`,
      `${SITE_URL}/institutions`,
      `${SITE_URL}/programs`,
      ...(await indexableInstitutionIds()).map(
        (id) => `${SITE_URL}/institutions/${encodeURIComponent(id)}`,
      ),
      ...(await indexableProgramIds()).map(
        (id) => `${SITE_URL}/programs/${encodeURIComponent(id)}`,
      ),
      // Subject hubs generated from institution programmes (no catalogue row).
      ...generatedHubIds.map((id) => `${SITE_URL}/programs/${encodeURIComponent(id)}`),
    ]);
    expect(generatedHubIds).toContain('engineering');
    expect(generatedHubIds).toHaveLength(56);
    expect(urls.filter((url) => url.endsWith('_subject'))).toEqual([]);
    expect(urls).toContain(`${SITE_URL}/institutions/tau`);
    expect(urls).toContain(`${SITE_URL}/programs/tau_cs`);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).not.toContain(`${SITE_URL}/programs/danon_cs`);
    expect(urls).toContain(`${SITE_URL}/programs/ruppin_cs`);
    // PM rule (#271): the 5 general subjects with no programme links (noindex,follow)
    // leave the sitemap: 410 before this rule - 5 = 405.
    for (const id of ['communication', 'education', 'nutrition', 'pharmacy', 'sports_science'])
      expect(urls).not.toContain(`${SITE_URL}/programs/${id}`);
    // JAMD is a one-for-one replacement; TAU and Sam Spiegel each lose a
    // duplicate programme. Retiring the unsupported documentary row also removes
    // its sole subject hub (official sources checked 24.10.2026).
    expect(urls).not.toContain(`${SITE_URL}/programs/samspiegel_documentary`);
    expect(urls).not.toContain(`${SITE_URL}/programs/documentary`);
    expect(urls).toHaveLength(401);
    const subjectIndex = entries.find((entry) => entry.url === `${SITE_URL}/programs`)!;
    expect(subjectIndex.priority).toBe(0.9);
    // The index changes whenever any programme page changes.
    const programDates = entries
      .filter((entry) => entry.url.startsWith(`${SITE_URL}/programs/`))
      .map((entry) => Date.parse(String(entry.lastModified)));
    expect(Date.parse(String(subjectIndex.lastModified))).toBe(Math.max(...programDates));
    for (const url of urls) {
      expect(new URL(url).origin).toBe(SITE_URL);
      expect(url.endsWith('/')).toBe(url === `${SITE_URL}/`);
      expect(url).not.toMatch(/mon_|\/(?:app|login|signup|enquiry|internal|auth|api|dev)(?:\/|$)/);
    }
    for (const entry of entries) {
      expect(entry.lastModified).toBeTruthy();
      expect(Number.isFinite(Date.parse(String(entry.lastModified)))).toBe(true);
      expect(entry.changeFrequency).toBe(entry.url.endsWith('/about') ? 'monthly' : 'weekly');
      expect(entry.priority).toBeGreaterThan(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
    expect(entries[0].priority).toBe(1);
    expect(new Set(entries.map((entry) => entry.lastModified)).size).toBeGreaterThan(1);
    vi.useFakeTimers();
    try {
      vi.setSystemTime('2030-01-01T00:00:00Z');
      expect(await sitemap()).toEqual(entries);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('metadata', () => {
  it('uses live catalogue names and keeps unlisted saved references out of search indexing', async () => {
    const program = programs.find((item) => item.id === 'tau_cs')!;
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: [{ ...program, name: 'שם מסלול מעודכן', isListed: false }],
      meta: { catalogueSource: 'database' },
    });
    const metadata = await buildProgramMetadata(program.id);
    expect(metadata.title).toContain('שם מסלול מעודכן');
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(await indexableProgramIds()).not.toContain(program.id);
    expect(await getPublicProgramPageData(program.id)).not.toBeNull();
  });

  it('uses a fixed production origin and general study copy', async () => {
    expect(SITE_NAME).toBe('MyWay');
    expect(SITE_ALT_NAMES).toEqual(['FindMyWay', 'Way', 'findmyway.co.il']);
    expect(SITE_DESCRIPTION).toMatch(/תארים.*קורסים.*תעודה.*בינלאומיות/);
    expect(absoluteUrl()).toBe(`${SITE_URL}/`);
    expect(absoluteUrl('/')).toBe(`${SITE_URL}/`);
    expect(absoluteUrl('/about/')).toBe(`${SITE_URL}/about`);
    expect(absoluteUrl('/institutions/tau')).toBe(`${SITE_URL}/institutions/tau`);
  });

  it('builds institution-specific title, count, canonical and social metadata', async () => {
    const data = (await getPublicInstitutionPageData('tau'))!;
    const meta = await buildInstitutionMetadata('tau');
    expect(meta.title).toBe(`${data.institution.name}: תנאי קבלה וסיכויי קבלה`);
    expect(meta.description).toContain(data.institution.name);
    expect(meta.description).toContain(`${data.programs.length} מסלולי לימוד`);
    expect(meta.alternates).toEqual({ canonical: '/institutions/tau' });
    expect(meta.openGraph).toMatchObject({
      title: meta.title,
      description: meta.description,
      url: '/institutions/tau',
      type: 'website',
      locale: 'he_IL',
      siteName: 'MyWay',
    });
    expect(meta.robots).toBeUndefined();
  });

  it('distinguishes single-provider programs from generic multi-provider records', async () => {
    const data = (await getPublicProgramPageData('tau_cs'))!;
    const meta = await buildProgramMetadata('tau_cs');
    expect(meta.title).toBe(`${data.program.name} – ${data.institutions[0].name}: תנאי קבלה`);
    expect(meta.alternates).toEqual({ canonical: '/programs/tau_cs' });
    expect(meta.openGraph).toMatchObject({
      title: meta.title,
      description: meta.description,
      url: '/programs/tau_cs',
      type: 'website',
      locale: 'he_IL',
    });
    expect(meta.robots).toBeUndefined();
    expect((await buildProgramMetadata('cs')).title).toBe(
      'לימודי מדעי המחשב: תנאי קבלה וסיכויי קבלה',
    );
  });

  it('builds metadata and JSON-LD without computing admission requirement summaries', async () => {
    const requirements = vi.spyOn(catalogueDisplayText, 'catalogueAdmissionRequirements');
    for (const id of ['nursing', 'haifa_nursing']) {
      const page = (await getPublicProgramPageData(id))!;
      expect((await buildProgramMetadata(id)).title).toBeTruthy();
      expect((await programLd(page)).provider.length).toBe(page.institutions.length);
      expect(programBreadcrumbLd(page).itemListElement.length).toBeGreaterThan(0);
    }
    expect(requirements).not.toHaveBeenCalled();
  });

  it('keeps the Danon alias renderable with only canonical SEO identities and no noindex', async () => {
    // The retired ID exists in persisted catalogues, but is absent from current static data.
    const canonical = programs.find((program) => program.id === 'danon_culinary')!;
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: [...programs, { ...canonical, id: 'danon_cs' }],
      meta: { catalogueSource: 'database' },
    });
    const page = (await getPublicProgramPageData('danon_cs'))!;
    const metadata = await buildProgramMetadata('danon_cs');
    expect(metadata.alternates).toEqual({ canonical: '/programs/danon_culinary' });
    expect(metadata.openGraph).toMatchObject({ url: '/programs/danon_culinary' });
    expect(metadata.robots).toBeUndefined();
    expect(metadata.title).toBe('קולינריה — דנון – מכון דנון לבישול: תנאי קבלה');
    expect((await buildProgramMetadata('danon_culinary')).title).toBe(metadata.title);
    expect(await indexableProgramIds()).not.toContain('danon_cs');
    expect((await sitemap()).map((entry) => entry.url)).not.toContain(
      `${SITE_URL}/programs/danon_cs`,
    );
    const titles = await Promise.all(
      (await indexableProgramIds()).map(async (id) => (await buildProgramMetadata(id)).title),
    );
    expect(new Set(titles).size).toBe(titles.length);
    expect(await programLd(page)).toMatchObject({
      '@id': `${SITE_URL}/programs/danon_culinary#program`,
      url: `${SITE_URL}/programs/danon_culinary`,
    });
    expect(JSON.stringify(await programLd(page))).not.toContain('/programs/danon_cs');
    expect(programBreadcrumbLd(page).itemListElement.at(-1)?.item).toBe(
      `${SITE_URL}/programs/danon_culinary`,
    );
    expect(
      renderToStaticMarkup(
        await ProgramPage({ params: Promise.resolve({ programId: 'danon_cs' }) }),
      ),
    ).toContain(page.program.name);
  });

  it('absorbs the definite article in institution descriptions', async () => {
    expect((await buildProgramMetadata('huji_cs')).description).toContain(
      'באוניברסיטה העברית בירושלים',
    );
  });

  it('uses the general title even when the only subject signal is one institution', async () => {
    const program = {
      ...programs.find((program) => program.id === 'biology')!,
      name: 'תחום עם מוסד אחד',
      institutionId: 'tau' as const,
      thresholds: { haifa: 500 } as (typeof programs)[0]['thresholds'],
      institutionDetails: [],
      linkedInstitutionIds: ['tau'],
    };
    vi.mocked(listCataloguePrograms).mockResolvedValue({
      data: [program],
      meta: { catalogueSource: 'database' },
    });
    const page = (await getPublicProgramPageData(program.id))!;
    expect(page.institutions.map((institution) => institution.id)).toEqual(['haifa']);
    expect((await buildProgramMetadata(program.id)).title).toBe(
      'לימודי תחום עם מוסד אחד: תנאי קבלה וסיכויי קבלה',
    );
    expect(programBreadcrumbLd(page).itemListElement).toHaveLength(3);
  });

  it.each([
    ['nursing', ['tau', 'bgu', 'haifa', 'ariel', 'telhai', 'mta', 'ono']],
    ['biology', ['tau', 'huji', 'bgu', 'haifa', 'biu', 'telhai']],
  ])(
    'uses every provider for %s in metadata, JSON-LD and rendered links',
    async (id, expectedIds) => {
      const seeded = programs.find((program) => program.id === id)!;
      vi.mocked(listCataloguePrograms).mockResolvedValue({
        data: [
          {
            ...seeded,
            institutionId: 'tau',
            linkedInstitutionIds: ['tau'],
            ...(id === 'nursing'
              ? { thresholds: { tau: 610, haifa: 580 } as typeof seeded.thresholds }
              : {}),
          },
          ...programs.filter((program) => program.id !== id),
        ],
        meta: { catalogueSource: 'database' },
      });
      const page = (await getPublicProgramPageData(id))!;
      expect(page.isGeneral).toBe(true);
      expect(page.institutions.map((institution) => institution.id)).toEqual(expectedIds);
      const metadata = await buildProgramMetadata(id);
      expect(metadata.title).toBe(`לימודי ${page.program.name}: תנאי קבלה וסיכויי קבלה`);
      expect(metadata.description).toContain(`ב-${expectedIds.length} מוסדות לימוד`);
      expect((await programLd(page)).provider.map((provider) => provider.url)).toEqual(
        expectedIds.map((institutionId) => `${SITE_URL}/institutions/${institutionId}`),
      );
      const markup = renderToStaticMarkup(
        await ProgramPage({ params: Promise.resolve({ programId: id }) }),
      );
      for (const institution of page.institutions) {
        const specific = programs.find(
          (program) =>
            program.isListed !== false &&
            program.name === seeded.name &&
            program.institutionId === institution.id,
        );
        const path = specific ? `/programs/${specific.id}` : `/institutions/${institution.id}`;
        expect(page.institutionProgramPaths[institution.id]).toBe(path);
        expect(markup).toContain(`href="${path}"`);
        expect(markup).toContain(`href="/enquiry?program=${id}&amp;institution=${institution.id}"`);
      }
      expect(markup).toContain('תנאי קבלה');
      if (id === 'nursing') {
        expect(page.institutionProgramPaths.bgu).toBe('/programs/bgu_nursing');
        expect(page.institutionProgramPaths.tau).toBe('/institutions/tau');
        expect(markup).not.toContain('href="/programs/nursing"');
      }
    },
  );

  it('lists own programs first and makes every ordered program accessible with matching metadata and JSON-LD counts', async () => {
    for (const institution of institutions) {
      const page = (await getPublicInstitutionPageData(institution.id))!;
      const own = page.programs.filter((program) => program.institutionId === institution.id);
      const general = page.programs.filter((program) => program.institutionId !== institution.id);
      expect(page.programs).toEqual([...own, ...general]);
      expect(new Set(general.map((program) => program.name)).size).toBe(general.length);
      expect(
        general.some((program) => own.some((specific) => specific.name === program.name)),
      ).toBe(false);
      const metadata = await buildInstitutionMetadata(institution.id);
      expect(metadata.description).toContain(`${page.programs.length} מסלולי לימוד`);
      const markup = renderToStaticMarkup(
        await InstitutionPage({ params: Promise.resolve({ institutionId: institution.id }) }),
      );
      expect(markup.match(/href="\/programs\//g) ?? []).toHaveLength(page.programs.length);
      const ld = institutionLd(page).hasOfferCatalog;
      expect(ld.numberOfItems).toBe(page.programs.length);
      expect(ld.itemListElement.map((item) => item.name)).toEqual(
        page.programs.map((program) => program.name),
      );
      expect(ld.itemListElement.map((item) => item.url)).toEqual(
        page.programs.map((program) => `${SITE_URL}/programs/${program.id}`),
      );
      if (page.programs.length > 12) {
        expect(markup).toContain(
          page.programs.length === 13
            ? 'הצגת מסלול נוסף'
            : `הצגת עוד ${page.programs.length - 12} מסלולים`,
        );
        const firstSection = markup.split('<details')[0];
        expect(firstSection.match(/href="\/programs\//g)).toHaveLength(12);
        expect(markup.split('</summary>')[1]).toContain(`/programs/${page.programs[12].id}`);
      } else expect(markup).not.toContain('<details');
    }
  });

  it('gives every excluded existing detail page a self-canonical and noindex,follow', async () => {
    const institutionIds = await indexableInstitutionIds();
    const programIds = await indexableProgramIds();
    for (const { id } of institutions.filter((i) => !institutionIds.includes(i.id))) {
      expect(await buildInstitutionMetadata(id)).toMatchObject({
        alternates: { canonical: `/institutions/${encodeURIComponent(id)}` },
        robots: { index: false, follow: true },
      });
    }
    for (const { id } of programs.filter(
      (p) => !programIds.includes(p.id) && canonicalProgramId(p.id) === p.id,
    )) {
      expect(await buildProgramMetadata(id)).toMatchObject({
        alternates: { canonical: `/programs/${encodeURIComponent(id)}` },
        robots: { index: false, follow: true },
      });
    }
    expect(await buildInstitutionMetadata('missing')).toEqual({});
    expect(await buildProgramMetadata('missing')).toEqual({});
  });

  it('leads with real relation facts and keeps descriptions unique across indexable detail pages', async () => {
    const institution = (await getPublicInstitutionPageData('tau'))!;
    expect((await buildInstitutionMetadata('tau')).description).toMatch(
      new RegExp(`^${institution.programs.length} מסלולי לימוד`),
    );
    expect((await buildProgramMetadata('tau_cs')).description).toMatch(
      /^מדעי המחשב באוניברסיטת תל אביב:/,
    );
    expect((await buildProgramMetadata('cs')).description).toContain(
      `ב-${(await getPublicProgramPageData('cs'))!.institutions.length} מוסדות לימוד`,
    );
    const descriptions = [
      ...(await Promise.all(
        (await indexableInstitutionIds()).map(
          async (id) => (await buildInstitutionMetadata(id)).description,
        ),
      )),
      ...(await Promise.all(
        (await indexableProgramIds()).map(
          async (id) => (await buildProgramMetadata(id)).description,
        ),
      )),
    ];
    expect(new Set(descriptions).size).toBe(descriptions.length);
  }, 15_000);

  it('has unique titles across all indexable public pages and disambiguates known collisions', async () => {
    const programIds = await indexableProgramIds();
    const programMetadata = await Promise.all(programIds.map(buildProgramMetadata));
    const titles = [
      'MyWay | הדרך שלך ללימודים',
      'מי אנחנו | MyWay',
      'מוסדות לימוד | MyWay',
      ...(await Promise.all(
        (await indexableInstitutionIds()).map(
          async (id) => `${(await buildInstitutionMetadata(id)).title} | MyWay`,
        ),
      )),
      ...programMetadata.map((metadata) => `${metadata.title} | MyWay`),
    ];
    expect(new Set(titles).size).toBe(titles.length);
    for (const [index, id] of programIds.entries()) {
      const program = programs.find((program) => program.id === id)!;
      const title = String(programMetadata[index].title);
      expect(title.endsWith(`(${program.category})`)).toBe(false);
      expect(title.endsWith(`(${id})`)).toBe(false);
    }
    expect((await buildProgramMetadata('biology')).title).toBe(
      'לימודי ביולוגיה: תנאי קבלה וסיכויי קבלה',
    );
    expect((await buildProgramMetadata('tau_biology')).title).toBe(
      'ביולוגיה – אוניברסיטת תל אביב: תנאי קבלה וסיכויי קבלה',
    );
    expect((await buildProgramMetadata('nativ_acting')).title).toBe(
      'משחק – בית הספר למשחק ניסן נתיב: תנאי קבלה',
    );
    expect((await buildProgramMetadata('nativ_graphic_design')).title).toBe(
      'משחק – בית הספר למשחק ניסן נתיב: תנאי קבלה',
    );
  }, 15_000);
});

describe('structured data', () => {
  it('connects Organization and WebSite without unsupported search or FAQ markup', async () => {
    expect(organizationLd()).toMatchObject({
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'MyWay',
      alternateName: SITE_ALT_NAMES,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/brand/myway-wordmark-1200.png`,
      areaServed: 'IL',
      knowsLanguage: 'he',
    });
    expect(websiteLd()).toMatchObject({
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'he',
    });
    expect(websiteLd()).not.toHaveProperty('potentialAction');
  });

  it('describes the existing free web application without reviews or invented features', async () => {
    expect(webApplicationLd()).toMatchObject({
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#webapp`,
      url: `${SITE_URL}/`,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'ILS' },
      publisher: { '@id': `${SITE_URL}/#organization` },
      isPartOf: { '@id': `${SITE_URL}/#website` },
      featureList: [
        'שאלון התאמה ללימודים',
        'קטלוג מוסדות ומסלולי לימוד',
        'בדיקת סיכויי קבלה אישית',
      ],
    });
  });

  it('lists precisely the directory cards in order, including their existing public IDs', async () => {
    const items = getInstitutionDirectoryItems();
    const graph = institutionDirectoryLd(items);
    expect(graph[0]).toMatchObject({
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/institutions#collection`,
      url: `${SITE_URL}/institutions`,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      mainEntity: { '@id': `${SITE_URL}/institutions#institutions` },
      breadcrumb: { '@id': `${SITE_URL}/institutions#breadcrumb` },
    });
    expect(graph[1]).toMatchObject({
      '@type': 'ItemList',
      '@id': `${SITE_URL}/institutions#institutions`,
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: `${SITE_URL}/institutions/${encodeURIComponent(item.id)}`,
      })),
    });
    expect(graph[2]['@type']).toBe('BreadcrumbList');
    for (const item of items) expect(await getPublicInstitutionPageData(item.id)).not.toBeNull();
  });

  it('renders graph envelopes with consistent apex node IDs and no unsupported content schemas', async () => {
    const page = (await getPublicProgramPageData('tau_cs'))!;
    const faq = programFaqPageLd(page, await getPublicProgramRequirementSources(page));
    expect(faq).toBeNull();
    const data = [
      organizationLd(),
      websiteLd(),
      webApplicationLd(),
      ...institutionDirectoryLd(getInstitutionDirectoryItems()),
      institutionLd((await getPublicInstitutionPageData('tau'))!),
      institutionBreadcrumbLd((await getPublicInstitutionPageData('tau'))!),
      await programLd((await getPublicProgramPageData('tau_cs'))!),
      programBreadcrumbLd((await getPublicProgramPageData('tau_cs'))!),
      ...(faq ? [faq] : []),
    ];
    const markup = renderToStaticMarkup(JsonLd({ data }));
    const graph = JSON.parse(
      markup.slice(markup.indexOf('>') + 1, markup.lastIndexOf('</script>')),
    );
    expect(graph['@context']).toBe('https://schema.org');
    expect(graph['@graph']).toEqual(data);
    const ids = data.map((node) => node['@id']);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(new URL(id).origin).toBe(SITE_URL);
    expect(institutionLd((await getPublicInstitutionPageData('tau'))!)['@id']).toBe(
      `${SITE_URL}/institutions/tau#institution`,
    );
    expect((await programLd((await getPublicProgramPageData('tau_cs'))!)).provider[0]['@id']).toBe(
      `${SITE_URL}/institutions/tau#institution`,
    );
    expect(JSON.stringify(graph)).not.toMatch(
      /FAQPage|HowTo|Dataset|AggregateRating|"@type":"Review"/,
    );
  });

  const faqProgramIds = [
    'bgu_psychology',
    'huji_law',
    'biu_psychology',
    'ariel_psychology',
    'haifa_nursing',
    'ono_nursing',
    'tau_law',
    'biu_law',
    'ruppin_cs',
    'tau_business',
    'bgu_business',
    'haifa_infosystems',
    'ariel_economics',
    'huji_business',
    'bgu_accounting',
    'tau_accounting',
    'huji_accounting',
    'haifa_accounting',
    'biu_criminology',
    'ariel_criminology',
    'ariel_communication',
    'haifa_communication',
    'haifa_politicalscience',
    'haifa_sociology',
    'ariel_health_systems',
    'biu_computational_bio',
    'biu_biotech',
    'biu_lifesciences',
    'hit_cs',
    'wingate_cs',
    'ono_law',
    'colmgmt_cs',
    'haifa_psychology',
  ];

  it('allows FAQPage for exactly the 33 approved programs', async () => {
    const data = (await getPublicProgramPageData('huji_law'))!;
    const sources = await getPublicProgramRequirementSources(data);
    const candidateIds = new Set([...programs.map(({ id }) => id), ...faqProgramIds]);
    const allowedIds = [...candidateIds].filter((id) =>
      programFaqPageLd({ ...data, program: { ...data.program, id } }, sources),
    );
    expect(allowedIds).toHaveLength(33);
    expect(allowedIds.sort()).toEqual([...faqProgramIds].sort());
  });

  it.each(faqProgramIds)(
    'adds FAQPage alongside program and breadcrumb schema for %s using on-page facts',
    async (id) => {
      // These live catalogue IDs are absent from the static catalogue used by the mock.
      if (id === 'hit_cs' || id === 'wingate_cs') {
        const institutionId = id === 'hit_cs' ? 'hit' : 'wingate';
        const institution = institutions.find((item) => item.id === institutionId)!;
        const templateId = id === 'hit_cs' ? 'cs' : 'wingate_physical_ed';
        const program = applyCatalogueContentRepair({
          ...programs.find((item) => item.id === templateId)!,
          id,
          institutionId,
          institution: institution.name,
          institutionDetails: [],
        });
        vi.mocked(listCataloguePrograms).mockResolvedValue({
          data: [...programs, { ...program, linkedInstitutionIds: [institutionId] }],
          meta: { catalogueSource: 'database' },
        });
      }
      const data = (await getPublicProgramPageData(id))!;
      const sources = await getPublicProgramRequirementSources(data);
      const faq = programFaqPageLd(data, sources)!;
      expect(faq).toMatchObject({
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/programs/${id}#faq`,
        inLanguage: 'he',
      });
      const document = new DOMParser().parseFromString(
        renderToStaticMarkup(await ProgramPage({ params: Promise.resolve({ programId: id }) })),
        'text/html',
      );
      const graph = JSON.parse(
        document.querySelector('script[type="application/ld+json"]')!.textContent!,
      );
      expect(graph['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual([
        'EducationalOccupationalProgram',
        'BreadcrumbList',
        'FAQPage',
      ]);
      expect(graph['@graph'][2]).toEqual(faq);
      const visibleText =
        id === 'colmgmt_cs'
          ? document.querySelector('main')!.textContent!
          : Array.from(document.querySelectorAll('main li, main p'))
              .map((element) => element.textContent)
              .join(' ');
      const source = sources[data.institutions[0].id];
      expect(faq.mainEntity[0].acceptedAnswer.text).toBe(source.requirements.join(' '));
      for (const requirement of source.requirements) {
        expect(faq.mainEntity[0].acceptedAnswer.text).toContain(requirement);
        // BGU splits its first two requirements into three near-verbatim route bullets.
        // Colman presents the equivalent conditions in tiles and expanded details below.
        if (
          id !== 'colmgmt_cs' &&
          (id !== 'bgu_psychology' || source.requirements.indexOf(requirement) >= 2)
        ) {
          expect(visibleText).toContain(requirement);
        }
      }
      if (id === 'colmgmt_cs') {
        for (const [answerFact, pageFact] of [
          ['ממוצע בגרות משוקלל 85+', '85בגרות'],
          ['מתמטיקה 5 יח"ל 70+ או 4 יח"ל 80+', 'מתמטיקה 5 יח"ל 70 / 4 יח"ל 80'],
          ['ומעבר מבדק פנימי', '+ מבדק פנימי'],
          ['עמידה בציון המשוקלל של המכללה', 'המכללה מחליטה'],
          ['פטור מהמבדק בפסיכומטרי 600+ וכמותי 120+', 'פטור: פסיכומטרי 600 וכמותי 120'],
          ['לא מפרסמת את הציון המשוקלל הנדרש', 'ולא מפרסמת את הציון הנדרש'],
          ['מכינת שחקים', 'חסר רק ממוצע הבגרות: אחרי סיום מכינת שחקים בהצלחה.'],
          [
            'מכינת ריענון במתמטיקה',
            'חסר רק ציון המתמטיקה: אחרי מבדק פנימי וסיום מכינת ריענון במתמטיקה בהצלחה.',
          ],
          ['או שתיהן, לפי מה שחסר', 'חסרים שניהם: אחרי מבדק פנימי וסיום שתי המכינות בהצלחה.'],
        ]) {
          expect(faq.mainEntity[0].acceptedAnswer.text).toContain(answerFact);
          expect(visibleText).toContain(pageFact);
        }
      }
      if (id === 'ono_law' || id === 'colmgmt_cs') {
        expect(source.checked?.date).toBe('23.10.2026');
      }
      if (id === 'haifa_psychology') {
        expect(source.checked).toMatchObject({
          date: '24.10.2026',
          sourceUrl:
            'https://admissions.haifa.ac.il/social-sciences/program/3268/?utm_source=myway&utm_medium=referral',
        });
        expect(faq.mainEntity[0].acceptedAnswer.text).not.toMatch(/אופק|מילואים|תואר קודם/);
      }
      for (const entity of faq.mainEntity) {
        expect(entity['@type']).toBe('Question');
        expect(entity.name).toMatch(/[א-ת]/);
        expect(entity.acceptedAnswer['@type']).toBe('Answer');
        expect(entity.acceptedAnswer.text.replace(data.institutions[0].name, '')).not.toMatch(
          /[a-z]|מתואם|מצרף/i,
        );
        if (!source.requirements.some((text) => text.includes('סכם'))) {
          expect(entity.acceptedAnswer.text).not.toContain('סכם');
        }
        for (const number of entity.acceptedAnswer.text.match(/\d+(?:\.\d+)?/g) ?? []) {
          expect(visibleText).toContain(number);
        }
      }
      expect(faq.mainEntity).toHaveLength(source.checked ? 2 : 1);
      if (source.checked) {
        expect(visibleText).toContain(faq.mainEntity[1].acceptedAnswer.text);
      }
      // The only addition is the schema script: no FAQ questions become visible UI.
      for (const entity of faq.mainEntity) {
        expect(document.querySelector('main')!.textContent).not.toContain(entity.name);
      }
    },
  );

  it('omits FAQs when scoped requirements are hidden or unavailable and for other programs', async () => {
    const data = (await getPublicProgramPageData('huji_law'))!;
    const sources = await getPublicProgramRequirementSources(data);
    expect(
      programFaqPageLd({ ...data, program: { ...data.program, isListed: false } }, sources),
    ).toBeNull();
    expect(programFaqPageLd(data, {})).toBeNull();
    const institutionId = data.institutions[0].id;
    expect(
      programFaqPageLd(data, {
        [institutionId]: { ...sources[institutionId], requirements: [] },
      }),
    ).toBeNull();
    for (const id of [
      'tau_cs',
      'technion_cs',
      'ariel_cs',
      'afeka_ee',
      'afeka_softwareeng',
      'hit_visual_comm',
      'huji_engineering',
      'bezalel_graphic_design',
      'afeka_cs',
      'psychology',
      'law',
      'nursing',
      'cs',
      ...programs.filter((program) => program.id.startsWith('reichman_')).map(({ id }) => id),
    ]) {
      expect(programFaqPageLd({ ...data, program: { ...data.program, id } }, sources)).toBeNull();
    }
  });

  it.each([
    'tau_cs',
    'technion_cs',
    'ariel_cs',
    'afeka_ee',
    'afeka_softwareeng',
    'hit_visual_comm',
    'huji_engineering',
    'bezalel_graphic_design',
    'afeka_cs',
    'psychology',
    'law',
    'nursing',
    'cs',
    ...programs.filter((program) => program.id.startsWith('reichman_')).map(({ id }) => id),
  ])('omits FAQPage from the rendered non-allowlisted page %s', async (id) => {
    const data = (await getPublicProgramPageData(id))!;
    expect(programFaqPageLd(data, await getPublicProgramRequirementSources(data))).toBeNull();
    const document = new DOMParser().parseFromString(
      renderToStaticMarkup(await ProgramPage({ params: Promise.resolve({ programId: id }) })),
      'text/html',
    );
    const graph = JSON.parse(
      document.querySelector('script[type="application/ld+json"]')!.textContent!,
    );
    expect(graph['@graph'].map((node: { '@type': string }) => node['@type'])).toEqual([
      'EducationalOccupationalProgram',
      'BreadcrumbList',
    ]);
  });

  it('classifies institutions and emits only official HTTPS identities with no inferred address', async () => {
    expect(institutionLd((await getPublicInstitutionPageData('tau'))!)).toMatchObject({
      '@type': 'CollegeOrUniversity',
      url: `${SITE_URL}/institutions/tau`,
    });
    const nonAcademic = (await getPublicInstitutionPageData('danon'))!;
    expect(institutionLd(nonAcademic)['@type']).toBe('EducationalOrganization');
    expect(institutionLd(nonAcademic)).not.toHaveProperty('address');
    for (const url of [
      'http://example.org',
      'https://yoram.walla.co.il/test',
      'https://user:pass@example.org',
      'https://[invalid',
    ]) {
      expect(
        institutionLd({
          ...nonAcademic,
          institution: { ...nonAcademic.institution, programUrl: url, domain: undefined },
        }),
      ).not.toHaveProperty('sameAs');
    }
    expect(
      institutionLd({
        ...nonAcademic,
        institution: { ...nonAcademic.institution, programUrl: undefined, domain: 'example.org' },
      }).sameAs,
    ).toBe('https://example.org/');
  });

  it('represents full programs and providers without inventing credentials or durations', async () => {
    const data = (await getPublicProgramPageData('tau_cs'))!;
    const ld = await programLd(data);
    expect(ld).toMatchObject({
      '@type': 'EducationalOccupationalProgram',
      name: data.program.name,
      url: `${SITE_URL}/programs/tau_cs`,
      inLanguage: 'he',
      provider: [
        {
          '@type': 'CollegeOrUniversity',
          name: data.institutions[0].name,
          url: `${SITE_URL}/institutions/tau`,
        },
      ],
    });
    expect(ld).not.toHaveProperty('educationalCredentialAwarded');
    const detail = data.program.institutionDetails![0];
    expect(
      (
        await programLd({
          ...data,
          program: { ...data.program, institutionDetails: [{ ...detail, durationYears: 3.5 }] },
        })
      ).timeToComplete,
    ).toBe('P42M');
    expect(
      await programLd({ ...data, program: { ...data.program, institutionDetails: [] } }),
    ).not.toHaveProperty('timeToComplete');
    expect(await programLd((await getPublicProgramPageData('cs'))!)).not.toHaveProperty(
      'timeToComplete',
    );
    const opaque = programs.find((p) => p.id.startsWith('mon_'))!;
    expect(await programLd((await getPublicProgramPageData(opaque.id))!)).not.toHaveProperty(
      'timeToComplete',
    );
  });

  it('builds ordered absolute breadcrumbs through existing pages', async () => {
    const institution = institutionBreadcrumbLd((await getPublicInstitutionPageData('tau'))!);
    expect(institution.itemListElement.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(institution.itemListElement.map((item) => item.item)).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/institutions`,
      `${SITE_URL}/institutions/tau`,
    ]);
    const program = programBreadcrumbLd((await getPublicProgramPageData('tau_cs'))!);
    expect(program.itemListElement.map((item) => item.item)).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/institutions`,
      `${SITE_URL}/institutions/tau`,
      `${SITE_URL}/programs/tau_cs`,
    ]);
    expect(
      programBreadcrumbLd((await getPublicProgramPageData('cs'))!).itemListElement,
    ).toHaveLength(3);
    expect(breadcrumbLd([])['@type']).toBe('BreadcrumbList');
  });

  it('escapes every less-than character so data cannot close the JSON-LD script', async () => {
    const data = {
      '@type': 'Organization',
      name: '</script><script>alert(1)</script>',
      description: 'a < b',
    };
    const markup = renderToStaticMarkup(JsonLd({ data }));
    expect(markup).toMatch(/^<script type="application\/ld\+json">/);
    expect(markup.match(/<script/g)).toHaveLength(1);
    const json = markup.slice(markup.indexOf('>') + 1, markup.lastIndexOf('</script>'));
    expect(json).not.toContain('<');
    expect(json).toContain('\\u003c');
    expect(JSON.parse(json)).toEqual({ '@context': 'https://schema.org', '@graph': [data] });
  });
});
