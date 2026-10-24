import type { MetadataRoute } from 'next';
import { indexableInstitutionIds, indexableProgramIds } from '@/lib/seo/indexability';
import { loadPublicCatalogue } from '@/lib/publicCataloguePages';
import {
  institutionModifiedAt,
  latestModified,
  programModifiedAt,
  STATIC_PAGE_MODIFIED_AT,
} from '@/lib/seo/catalogueModified';
import { absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalogue = await loadPublicCatalogue();
  const dates = new Map<string, string>([
    ...catalogue.institutions.map(
      (institution) =>
        [
          `/institutions/${encodeURIComponent(institution.id)}`,
          institutionModifiedAt(institution, catalogue.programs),
        ] as const,
    ),
    ...catalogue.programs.map(
      (program) =>
        [
          `/programs/${encodeURIComponent(program.id)}`,
          catalogue.generalProgramIds.has(program.id)
            ? latestModified(
                programModifiedAt(program),
                ...catalogue.programs
                  .filter((candidate) => candidate.name === program.name)
                  .map(programModifiedAt),
              )
            : programModifiedAt(program),
        ] as const,
    ),
  ]);
  dates.set('/institutions', latestModified(STATIC_PAGE_MODIFIED_AT, ...dates.values()));
  // The subject index lists hubs built from the programme catalogue.
  dates.set(
    '/programs',
    latestModified(STATIC_PAGE_MODIFIED_AT, ...catalogue.programs.map(programModifiedAt)),
  );
  return [
    '/',
    '/about',
    '/institutions',
    '/programs',
    ...(await indexableInstitutionIds(catalogue)).map(
      (id) => `/institutions/${encodeURIComponent(id)}`,
    ),
    ...(await indexableProgramIds(catalogue)).map((id) => `/programs/${encodeURIComponent(id)}`),
  ].map((path) => ({
    url: absoluteUrl(path),
    lastModified: dates.get(path) ?? STATIC_PAGE_MODIFIED_AT,
    changeFrequency: path === '/about' ? 'monthly' : 'weekly',
    priority:
      path === '/'
        ? 1
        : path === '/institutions' || path === '/programs'
          ? 0.9
          : path === '/about'
            ? 0.5
            : 0.7,
  }));
}
