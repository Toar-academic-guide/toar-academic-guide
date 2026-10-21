import type { PublicInstitutionPageData, PublicProgramPageData } from '@/lib/publicCataloguePages';
import { getPublicInstitutionPageData } from '@/lib/publicCataloguePages';
import { absoluteUrl, SITE_ALT_NAMES, SITE_NAME } from '@/lib/site';

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteUrl('/#org'),
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
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    name: SITE_NAME,
    url: absoluteUrl(),
    inLanguage: 'he',
    publisher: { '@id': absoluteUrl('/#org') },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
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
    '@context': 'https://schema.org',
    '@type': academic ? 'CollegeOrUniversity' : 'EducationalOrganization',
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

export function programLd({ program, institutions }: PublicProgramPageData) {
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
    '@context': 'https://schema.org',
    '@type': 'EducationalOccupationalProgram',
    name: program.name,
    url: absoluteUrl(`/programs/${encodeURIComponent(program.id)}`),
    provider: institutions.map((institution) =>
      institutionLd(getPublicInstitutionPageData(institution.id)!),
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
