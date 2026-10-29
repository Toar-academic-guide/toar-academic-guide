import type { MetadataRoute } from 'next';
import { indexableInstitutionIds, indexableProgramIds } from '@/lib/seo/indexability';
import { loadPublicCatalogue } from '@/lib/publicCataloguePages';
import {
  institutionModifiedAt,
  latestModified,
  programModifiedAt,
  STATIC_PAGE_MODIFIED_AT,
} from '@/lib/seo/catalogueModified';
import { buildSubjectHubs } from '@/lib/publicCatalogueLinks';
import { absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalogue = await loadPublicCatalogue();
  // Hubs generated from institution programmes have no catalogue row of their own.
  const generatedHubs = buildSubjectHubs(catalogue).publishedHubs.filter(
    (hub) => !catalogue.generalProgramIds.has(hub.id),
  );
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
    ...generatedHubs.map(
      (hub) =>
        [
          `/programs/${encodeURIComponent(hub.id)}`,
          latestModified(...hub.programs.map(programModifiedAt)),
        ] as const,
    ),
  ]);
  dates.set('/institutions', latestModified(STATIC_PAGE_MODIFIED_AT, ...dates.values()));
  // Authored with the calculator page; never replace this with the build date.
  dates.set('/sekhem-calculator', '2026-10-28');
  // The subject index lists hubs built from the programme catalogue.
  dates.set(
    '/programs',
    latestModified(STATIC_PAGE_MODIFIED_AT, ...catalogue.programs.map(programModifiedAt)),
  );
  return [
    '/',
    '/about',
    '/sekhem-calculator',
    '/institutions',
    '/programs',
    ...(await indexableInstitutionIds(catalogue)).map(
      (id) => `/institutions/${encodeURIComponent(id)}`,
    ),
    ...(await indexableProgramIds(catalogue)).map((id) => `/programs/${encodeURIComponent(id)}`),
    ...generatedHubs.map((hub) => `/programs/${encodeURIComponent(hub.id)}`),
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
