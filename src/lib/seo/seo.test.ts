import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import JsonLd from '@/components/seo/JsonLd';
import { getInstitutionDirectoryItems } from '@/data/institutionDirectory';
import { buildRobots, TRAINING_BOTS_POLICY } from './robots';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { getPublicInstitutionPageData, getPublicProgramPageData } from '@/lib/publicCataloguePages';
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

const institutions = getStaticCatalogueInstitutions();
const programs = getStaticCataloguePrograms();

describe('crawl policy', () => {
  it('separates wildcard, search and allowed training policies with operational exclusions', () => {
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

  it('can block training in one policy change without affecting answer/search crawlers', () => {
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

  it('indexes exactly existing non-opaque pages with at least one resolved relation', () => {
    for (const institution of institutions) {
      expect(isIndexableInstitution(institution.id)).toBe(
        !institution.id.startsWith('mon_') &&
          getPublicInstitutionPageData(institution.id)!.programs.length > 0,
      );
    }
    for (const program of programs) {
      expect(isIndexableProgram(program.id)).toBe(
        !program.id.startsWith('mon_') &&
          getPublicProgramPageData(program.id)!.institutions.length > 0,
      );
    }
    expect(isIndexableInstitution('tau')).toBe(true);
    expect(isIndexableProgram('tau_cs')).toBe(true);
    expect(isIndexableInstitution('weizmann')).toBe(false);
    expect(isIndexableInstitution('missing')).toBe(false);
    expect(isIndexableProgram('missing')).toBe(false);
    expect(indexableInstitutionIds()).toEqual(
      institutions.filter((i) => isIndexableInstitution(i.id)).map((i) => i.id),
    );
    expect(indexableProgramIds()).toEqual(
      programs.filter((p) => isIndexableProgram(p.id)).map((p) => p.id),
    );
  });

  it('includes only public indexable routes in a unique production sitemap with one timestamp', () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls).toEqual([
      SITE_URL,
      `${SITE_URL}/about`,
      `${SITE_URL}/institutions`,
      ...indexableInstitutionIds().map(
        (id) => `${SITE_URL}/institutions/${encodeURIComponent(id)}`,
      ),
      ...indexableProgramIds().map((id) => `${SITE_URL}/programs/${encodeURIComponent(id)}`),
    ]);
    expect(urls).toContain(`${SITE_URL}/institutions/tau`);
    expect(urls).toContain(`${SITE_URL}/programs/tau_cs`);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) {
      expect(new URL(url).origin).toBe(SITE_URL);
      expect(url.endsWith('/')).toBe(false);
      expect(url).not.toMatch(/mon_|\/(?:app|login|signup|enquiry|internal|auth|api|dev)(?:\/|$)/);
    }
    for (const entry of entries) {
      expect(entry.lastModified).toBeInstanceOf(Date);
      expect(entry.changeFrequency).toBe(entry.url.endsWith('/about') ? 'monthly' : 'weekly');
      expect(entry.priority).toBeGreaterThan(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
    expect(entries[0].priority).toBe(1);
    expect(new Set(entries.map((entry) => entry.lastModified)).size).toBe(1);
    expect(sitemap()[0].lastModified).toBe(entries[0].lastModified);
  });
});

describe('metadata', () => {
  it('uses a fixed production origin and general study copy', () => {
    expect(SITE_NAME).toBe('MyWay');
    expect(SITE_ALT_NAMES).toEqual(['FindMyWay', 'Way', 'findmyway.co.il']);
    expect(SITE_DESCRIPTION).toMatch(/תארים.*קורסים.*תעודה.*בינלאומיות/);
    expect(absoluteUrl()).toBe(SITE_URL);
    expect(absoluteUrl('/institutions/tau')).toBe(`${SITE_URL}/institutions/tau`);
  });

  it('builds institution-specific title, count, canonical and social metadata', () => {
    const data = getPublicInstitutionPageData('tau')!;
    const meta = buildInstitutionMetadata('tau');
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

  it('distinguishes single-provider programs from generic multi-provider records', () => {
    const data = getPublicProgramPageData('tau_cs')!;
    const meta = buildProgramMetadata('tau_cs');
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
    expect(buildProgramMetadata('cs').title).toBe('לימודי מדעי המחשב: באילו מוסדות לומדים');
  });

  it('gives every excluded existing detail page a self-canonical and noindex,follow', () => {
    for (const { id } of institutions.filter((i) => !isIndexableInstitution(i.id))) {
      expect(buildInstitutionMetadata(id)).toMatchObject({
        alternates: { canonical: `/institutions/${encodeURIComponent(id)}` },
        robots: { index: false, follow: true },
      });
    }
    for (const { id } of programs.filter((p) => !isIndexableProgram(p.id))) {
      expect(buildProgramMetadata(id)).toMatchObject({
        alternates: { canonical: `/programs/${encodeURIComponent(id)}` },
        robots: { index: false, follow: true },
      });
    }
    expect(buildInstitutionMetadata('missing')).toEqual({});
    expect(buildProgramMetadata('missing')).toEqual({});
  });

  it('leads with real relation facts and keeps descriptions unique across indexable detail pages', () => {
    const institution = getPublicInstitutionPageData('tau')!;
    expect(buildInstitutionMetadata('tau').description).toMatch(
      new RegExp(`^${institution.programs.length} מסלולי לימוד`),
    );
    expect(buildProgramMetadata('tau_cs').description).toMatch(/^מדעי המחשב באוניברסיטת תל אביב:/);
    expect(buildProgramMetadata('cs').description).toContain(
      `ב-${getPublicProgramPageData('cs')!.institutions.length} מוסדות לימוד`,
    );
    const descriptions = [
      ...indexableInstitutionIds().map((id) => buildInstitutionMetadata(id).description),
      ...indexableProgramIds().map((id) => buildProgramMetadata(id).description),
    ];
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it('has unique titles across all indexable public pages and disambiguates known collisions', () => {
    const titles = [
      'MyWay | הדרך שלך ללימודים',
      'מי אנחנו | MyWay',
      'מוסדות לימוד | MyWay',
      ...indexableInstitutionIds().map((id) => `${buildInstitutionMetadata(id).title} | MyWay`),
      ...indexableProgramIds().map((id) => `${buildProgramMetadata(id).title} | MyWay`),
    ];
    expect(new Set(titles).size).toBe(titles.length);
    for (const id of [
      'biology',
      'tau_biology',
      'social_work',
      'tau_socialwork',
      'accounting',
      'tau_accounting',
      'occupational_therapy',
      'tau_occupational_therapy',
      'criminology',
      'biu_criminology',
    ]) {
      expect(buildProgramMetadata(id).title).toContain(
        `(${getPublicProgramPageData(id)!.program.category})`,
      );
    }
    expect(buildProgramMetadata('biology').title).toContain('(biology)');
    expect(buildProgramMetadata('tau_biology').title).toContain('(tau_biology)');
  });
});

describe('structured data', () => {
  it('connects Organization and WebSite without unsupported search or FAQ markup', () => {
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

  it('describes the existing free web application without reviews or invented features', () => {
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

  it('lists precisely the directory cards in order, including their existing public IDs', () => {
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
    for (const item of items) expect(getPublicInstitutionPageData(item.id)).not.toBeNull();
  });

  it('renders graph envelopes with consistent apex node IDs and no unsupported content schemas', () => {
    const data = [
      organizationLd(),
      websiteLd(),
      webApplicationLd(),
      ...institutionDirectoryLd(getInstitutionDirectoryItems()),
      institutionLd(getPublicInstitutionPageData('tau')!),
      institutionBreadcrumbLd(getPublicInstitutionPageData('tau')!),
      programLd(getPublicProgramPageData('tau_cs')!),
      programBreadcrumbLd(getPublicProgramPageData('tau_cs')!),
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
    expect(institutionLd(getPublicInstitutionPageData('tau')!)['@id']).toBe(
      `${SITE_URL}/institutions/tau#institution`,
    );
    expect(programLd(getPublicProgramPageData('tau_cs')!).provider[0]['@id']).toBe(
      `${SITE_URL}/institutions/tau#institution`,
    );
    expect(JSON.stringify(graph)).not.toMatch(
      /FAQPage|HowTo|Dataset|AggregateRating|"@type":"Review"/,
    );
  });

  it('classifies institutions and emits only official HTTPS identities with no inferred address', () => {
    expect(institutionLd(getPublicInstitutionPageData('tau')!)).toMatchObject({
      '@type': 'CollegeOrUniversity',
      url: `${SITE_URL}/institutions/tau`,
    });
    const nonAcademic = getPublicInstitutionPageData('danon')!;
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

  it('represents full programs and providers without inventing credentials or durations', () => {
    const data = getPublicProgramPageData('tau_cs')!;
    const ld = programLd(data);
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
      programLd({
        ...data,
        program: { ...data.program, institutionDetails: [{ ...detail, durationYears: 3.5 }] },
      }).timeToComplete,
    ).toBe('P42M');
    expect(
      programLd({ ...data, program: { ...data.program, institutionDetails: [] } }),
    ).not.toHaveProperty('timeToComplete');
    expect(programLd(getPublicProgramPageData('cs')!)).not.toHaveProperty('timeToComplete');
    const opaque = programs.find((p) => p.id.startsWith('mon_'))!;
    expect(programLd(getPublicProgramPageData(opaque.id)!)).not.toHaveProperty('timeToComplete');
  });

  it('builds ordered absolute breadcrumbs through existing pages', () => {
    const institution = institutionBreadcrumbLd(getPublicInstitutionPageData('tau')!);
    expect(institution.itemListElement.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(institution.itemListElement.map((item) => item.item)).toEqual([
      SITE_URL,
      `${SITE_URL}/institutions`,
      `${SITE_URL}/institutions/tau`,
    ]);
    const program = programBreadcrumbLd(getPublicProgramPageData('tau_cs')!);
    expect(program.itemListElement.map((item) => item.item)).toEqual([
      SITE_URL,
      `${SITE_URL}/institutions`,
      `${SITE_URL}/institutions/tau`,
      `${SITE_URL}/programs/tau_cs`,
    ]);
    expect(programBreadcrumbLd(getPublicProgramPageData('cs')!).itemListElement).toHaveLength(3);
    expect(breadcrumbLd([])['@type']).toBe('BreadcrumbList');
  });

  it('escapes every less-than character so data cannot close the JSON-LD script', () => {
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
