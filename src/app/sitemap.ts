import type { MetadataRoute } from 'next';
import { indexableInstitutionIds, indexableProgramIds } from '@/lib/seo/indexability';
import { absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    '/',
    '/about',
    '/institutions',
    ...(await indexableInstitutionIds()).map((id) => `/institutions/${encodeURIComponent(id)}`),
    ...(await indexableProgramIds()).map((id) => `/programs/${encodeURIComponent(id)}`),
  ].map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: path === '/about' ? 'monthly' : 'weekly',
    priority: path === '/' ? 1 : path === '/institutions' ? 0.9 : path === '/about' ? 0.5 : 0.7,
  }));
}
