import { readFileSync } from 'node:fs';
import type { InstitutionId } from '@/data/institutions';
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
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { getPublicInstitutionPageData, getPublicProgramPageData } from '@/lib/publicCataloguePages';
import * as catalogueDisplayText from '@/lib/catalogueDisplayText';
import { absoluteUrl, SITE_ALT_NAMES, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import {
  indexableInstitutionIds,
  indexableProgramIds,
  isIndexableInstitution,
  isIndexableProgram,
} from './indexability';
import { buildInstitutionMetadata, buildProgramMetadata } from './metadata';
import {
  breadcrumbLd,
  institutionDirectoryLd,
  webApplicationLd,
  institutionBreadcrumbLd,
  institutionLd,
  organizationLd,
  programBreadcrumbLd,
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
    for (const program of programs) {
      expect(await isIndexableProgram(program.id)).toBe(
        !program.id.startsWith('mon_') &&
          program.isListed !== false &&
          (await getPublicProgramPageData(program.id))!.institutions.length > 0,
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
            !p.id.startsWith('mon_') &&
            p.isListed !== false &&
            institutions.some((i) => p.linkedInstitutionIds.includes(i.id)),
        )
        .map((p) => p.id),
    );
  }, 15_000);

  it('keeps all 358 listed public URLs in order and omits lastmod without per-page data dates', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls).toEqual([
      SITE_URL,
      `${SITE_URL}/about`,
      `${SITE_URL}/institutions`,
      ...(await indexableInstitutionIds()).map(
        (id) => `${SITE_URL}/institutions/${encodeURIComponent(id)}`,
      ),
      ...(await indexableProgramIds()).map(
        (id) => `${SITE_URL}/programs/${encodeURIComponent(id)}`,
      ),
    ]);
    expect(urls).toContain(`${SITE_URL}/institutions/tau`);
    expect(urls).toContain(`${SITE_URL}/programs/tau_cs`);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toHaveLength(358);
    for (const url of urls) {
      expect(new URL(url).origin).toBe(SITE_URL);
      expect(url.endsWith('/')).toBe(false);
      expect(url).not.toMatch(/mon_|\/(?:app|login|signup|enquiry|internal|auth|api|dev)(?:\/|$)/);
    }
    for (const entry of entries) {
      // The static page records have no verified per-page modification dates.
      expect(entry).not.toHaveProperty('lastModified');
      expect(entry.changeFrequency).toBe(entry.url.endsWith('/about') ? 'monthly' : 'weekly');
      expect(entry.priority).toBeGreaterThan(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
    expect(entries[0].priority).toBe(1);
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
    expect(absoluteUrl()).toBe(SITE_URL);
    expect(absoluteUrl('/institutions/tau')).toBe(`${SITE_URL}/institutions/tau`);
  });

  it('builds institution-specific title, count, canonical and social metadata', async () => {
    const data = (await getPublicInstitutionPageData('tau'))!;
    const meta = await buildInstitutionMetadata('tau');
    expect(meta.title).toBe(`${data.institution.name}: מסלולים ותנאי קבלה`);
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
    expect(meta.title).toBe(`${data.program.name} – ${data.institutions[0].name}`);
    expect(meta.alternates).toEqual({ canonical: '/programs/tau_cs' });
    expect(meta.openGraph).toMatchObject({
      title: meta.title,
      description: meta.description,
      url: '/programs/tau_cs',
      type: 'website',
      locale: 'he_IL',
    });
    expect(meta.robots).toBeUndefined();
    expect((await buildProgramMetadata('cs')).title).toBe('לימודי מדעי המחשב: באילו מוסדות לומדים');
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
      'לימודי תחום עם מוסד אחד: באילו מוסדות לומדים',
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
      expect(metadata.title).toBe(`לימודי ${page.program.name}: באילו מוסדות לומדים`);
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
        expect(markup).toContain(`הצגת כל המסלולים (${page.programs.length})`);
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
    for (const { id } of programs.filter((p) => !programIds.includes(p.id))) {
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
  });

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
      'לימודי ביולוגיה: באילו מוסדות לומדים',
    );
    expect((await buildProgramMetadata('tau_biology')).title).toBe('ביולוגיה – אוניברסיטת תל אביב');
    expect((await buildProgramMetadata('nativ_acting')).title).toBe(
      'משחק – בית הספר למשחק ניסן נתיב: מסלול במוזיקה ותיאטרון',
    );
    expect((await buildProgramMetadata('nativ_graphic_design')).title).toBe(
      'משחק – בית הספר למשחק ניסן נתיב: מסלול באמנויות הבמה',
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
      url: SITE_URL,
      logo: `${SITE_URL}/way-logo.png`,
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
      url: SITE_URL,
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
    const data = [
      organizationLd(),
      websiteLd(),
      webApplicationLd(),
      ...institutionDirectoryLd(getInstitutionDirectoryItems()),
      institutionLd((await getPublicInstitutionPageData('tau'))!),
      institutionBreadcrumbLd((await getPublicInstitutionPageData('tau'))!),
      await programLd((await getPublicProgramPageData('tau_cs'))!),
      programBreadcrumbLd((await getPublicProgramPageData('tau_cs'))!),
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
      SITE_URL,
      `${SITE_URL}/institutions`,
      `${SITE_URL}/institutions/tau`,
    ]);
    const program = programBreadcrumbLd((await getPublicProgramPageData('tau_cs'))!);
    expect(program.itemListElement.map((item) => item.item)).toEqual([
      SITE_URL,
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
