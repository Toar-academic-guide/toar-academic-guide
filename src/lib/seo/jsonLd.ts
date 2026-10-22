import type { PublicInstitutionPageData, PublicProgramPageData } from '@/lib/publicCataloguePages';
import { getPublicInstitutionPageData } from '@/lib/publicCataloguePages';
import { absoluteUrl, SITE_ALT_NAMES, SITE_NAME } from '@/lib/site';
import type { InstitutionDirectoryItem } from '@/data/institutionDirectory';

const ORGANIZATION_ID = absoluteUrl('/#organization');
const WEBSITE_ID = absoluteUrl('/#website');

export function organizationLd() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: SITE_ALT_NAMES,
    url: absoluteUrl(),
    logo: absoluteUrl('/way-logo.png'),
    areaServed: 'IL',
    knowsLanguage: 'he',
  };
}

export function websiteLd() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: absoluteUrl(),
    inLanguage: 'he',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': absoluteUrl(`${items.at(-1)?.path ?? '/'}#breadcrumb`),
    itemListElement: items.map(({ name, path }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: absoluteUrl(path),
    })),
  };
}

function officialHttpsUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    // Aggregator links are not an institution's official identity.
    if (url.hostname === 'yoram.walla.co.il' || url.hostname.endsWith('.yoram.walla.co.il'))
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function institutionLd({ institution, programs }: PublicInstitutionPageData) {
  const academic =
    Boolean(institution.universityId) || programs.some((program) => program.type === 'academic');
  const sameAs = officialHttpsUrl(institution.programUrl) ?? officialHttpsUrl(institution.domain);
  return {
    '@type': academic ? 'CollegeOrUniversity' : 'EducationalOrganization',
    '@id': absoluteUrl(`/institutions/${encodeURIComponent(institution.id)}#institution`),
    name: institution.name,
    url: absoluteUrl(`/institutions/${encodeURIComponent(institution.id)}`),
    ...(sameAs ? { sameAs } : {}),
  };
}

export function institutionBreadcrumbLd({ institution }: PublicInstitutionPageData) {
  return breadcrumbLd([
    { name: 'בית', path: '/' },
    { name: 'מוסדות לימוד', path: '/institutions' },
    { name: institution.name, path: `/institutions/${encodeURIComponent(institution.id)}` },
  ]);
}

export async function programLd({ program, institutions }: PublicProgramPageData) {
  // Whole study programs can award degrees or certificates; they are not individual lessons.
  // Only an explicit duration for the single provider is unambiguous. Monday-derived
  // records have inferred durations, so do not publish those as structured facts.
  const duration =
    institutions.length === 1 && !program.id.startsWith('mon_')
      ? program.institutionDetails?.find(
          (detail) => detail.institutionName === institutions[0].name,
        )?.durationYears
      : undefined;
  const months = duration == null ? 0 : duration * 12;
  return {
    '@type': 'EducationalOccupationalProgram',
    '@id': absoluteUrl(`/programs/${encodeURIComponent(program.id)}#program`),
    name: program.name,
    url: absoluteUrl(`/programs/${encodeURIComponent(program.id)}`),
    provider: await Promise.all(
      institutions.map(async (institution) =>
        institutionLd((await getPublicInstitutionPageData(institution.id))!),
      ),
    ),
    inLanguage: 'he',
    ...(Number.isInteger(months) && months > 0 ? { timeToComplete: `P${months}M` } : {}),
    // The catalogue has no explicit awarded-credential field; do not infer one from type.
  };
}

export function programBreadcrumbLd({ program, institutions }: PublicProgramPageData) {
  return breadcrumbLd([
    { name: 'בית', path: '/' },
    { name: 'מוסדות לימוד', path: '/institutions' },
    ...(institutions.length === 1
      ? [
          {
            name: institutions[0].name,
            path: `/institutions/${encodeURIComponent(institutions[0].id)}`,
          },
        ]
      : []),
    { name: program.name, path: `/programs/${encodeURIComponent(program.id)}` },
  ]);
}

export function webApplicationLd() {
  return {
    '@type': 'WebApplication',
    '@id': absoluteUrl('/#webapp'),
    name: SITE_NAME,
    url: absoluteUrl(),
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    inLanguage: 'he',
    publisher: { '@id': ORGANIZATION_ID },
    isPartOf: { '@id': WEBSITE_ID },
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'ILS' },
    featureList: ['שאלון התאמה ללימודים', 'קטלוג מוסדות ומסלולי לימוד', 'בדיקת סיכויי קבלה אישית'],
  };
}

export function institutionDirectoryLd(institutions: InstitutionDirectoryItem[]) {
  const url = absoluteUrl('/institutions');
  const listId = `${url}#institutions`;
  const breadcrumb = breadcrumbLd([
    { name: 'בית', path: '/' },
    { name: 'מוסדות לימוד', path: '/institutions' },
  ]);
  return [
    {
      '@type': 'CollectionPage',
      '@id': `${url}#collection`,
      name: 'מוסדות לימוד',
      url,
      inLanguage: 'he',
      isPartOf: { '@id': WEBSITE_ID },
      mainEntity: { '@id': listId },
      breadcrumb: { '@id': breadcrumb['@id'] },
    },
    {
      '@type': 'ItemList',
      '@id': listId,
      numberOfItems: institutions.length,
      itemListElement: institutions.map((institution, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: institution.name,
        url: absoluteUrl(`/institutions/${encodeURIComponent(institution.id)}`),
      })),
    },
    breadcrumb,
  ];
}
