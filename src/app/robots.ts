import type { MetadataRoute } from 'next';
import { absoluteUrl, SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const disallow = ['/api/', '/internal/', '/auth/', '/admission-alerts/', '/ingest/', '/dev'];

  // Product decision (Amit): search + AI crawlers explicitly allowed
  const aiCrawlers = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'PerplexityBot',
    'Perplexity-User',
    'Google-Extended',
    'ClaudeBot',
    'Claude-SearchBot',
    'Claude-User',
    'Applebot-Extended',
    'CCBot',
  ];

  return {
    rules: ['*', ...aiCrawlers].map((userAgent) => ({ userAgent, allow: '/', disallow })),
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
