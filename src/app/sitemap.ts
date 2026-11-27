import type { MetadataRoute } from 'next';
import { indexableInstitutionIds, indexableProgramIds } from '@/lib/seo/indexability';
import { loadPublicCatalogue } from '@/lib/publicCataloguePages';
import {
  institutionModifiedAt,
  latestModified,
  programModifiedAt,
} from '@/lib/seo/catalogueModified';
import { buildSubjectHubs } from '@/lib/publicCatalogueLinks';
import { absoluteUrl } from '@/lib/site';
import { PAGE_CONTENT_DATES } from '@/lib/seo/pageContentDates';

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
  // Authored content and catalogue facts have separate clocks; retain the newer one.
  for (const [path, date] of Object.entries(PAGE_CONTENT_DATES)) {
    dates.set(path, latestModified(date, dates.get(path)));
  }
  for (const hub of buildSubjectHubs(catalogue).publishedHubs) {
    const path = `/programs/${encodeURIComponent(hub.id)}`;
    dates.set(
      path,
      latestModified(
        dates.get(path),
        ...hub.programs.map((program) => dates.get(`/programs/${encodeURIComponent(program.id)}`)),
      ),
    );
  }
  for (const institution of catalogue.institutions) {
    const path = `/institutions/${encodeURIComponent(institution.id)}`;
    dates.set(
      path,
      latestModified(
        dates.get(path),
        ...catalogue.programs
          .filter((program) => program.linkedInstitutionIds.includes(institution.id))
          .map((program) => dates.get(`/programs/${encodeURIComponent(program.id)}`)),
      ),
    );
  }
  for (const index of ['/institutions', '/programs']) {
    dates.set(
      index,
      latestModified(
        dates.get(index),
        ...[...dates.entries()]
          .filter(([path]) => path.startsWith(`${index}/`))
          .map(([, date]) => date),
      ),
    );
  }
  return [
    '/',
    '/about',
    '/sekhem-calculator',
    '/calculator',
    '/threshold-alerts',
    '/psychometric-dates',
    '/psychometric-two-domain',
    '/amirnet',
    '/psychometric-accommodations',
    '/atuda',
    '/open-days',
    '/transfer',
    '/without-psychometric',
    '/institutions',
    '/programs',
    ...(await indexableInstitutionIds(catalogue)).map(
      (id) => `/institutions/${encodeURIComponent(id)}`,
    ),
    ...(await indexableProgramIds(catalogue)).map((id) => `/programs/${encodeURIComponent(id)}`),
    ...generatedHubs.map((hub) => `/programs/${encodeURIComponent(hub.id)}`),
  ].map((path) => {
    const lastModified = dates.get(path);
    if (!lastModified) throw new Error(`Missing sitemap content date: ${path}`);
    return {
      url: absoluteUrl(path),
      lastModified,
      changeFrequency: path === '/about' ? 'monthly' : 'weekly',
      priority:
        path === '/'
          ? 1
          : path === '/institutions' || path === '/programs'
            ? 0.9
            : path === '/about'
              ? 0.5
              : 0.7,
    };
  });
}
