import type { MetadataRoute } from 'next';
import { indexableInstitutionIds, indexableProgramIds } from '@/lib/seo/indexability';
import { absoluteUrl } from '@/lib/site';

// This metadata route is prerendered at build time; every entry shares this timestamp.
const LAST_MODIFIED = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    '/',
    '/about',
    '/institutions',
    ...indexableInstitutionIds().map((id) => `/institutions/${encodeURIComponent(id)}`),
    ...indexableProgramIds().map((id) => `/programs/${encodeURIComponent(id)}`),
  ].map((path) => ({
    url: absoluteUrl(path),
    lastModified: LAST_MODIFIED,
    changeFrequency: path === '/about' ? 'monthly' : 'weekly',
    priority: path === '/' ? 1 : path === '/institutions' ? 0.9 : path === '/about' ? 0.5 : 0.7,
  }));
}
