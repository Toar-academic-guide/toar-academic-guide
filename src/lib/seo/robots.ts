import type { MetadataRoute } from 'next';
import { absoluteUrl, SITE_URL } from '@/lib/site';

// Decision for Amit: change only this line to block training crawlers.
export const TRAINING_BOTS_POLICY: 'allow' | 'block' = 'allow';

const SEARCH_BOTS = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
];
const TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'Applebot-Extended'];
const DISALLOW = [
  '/app/',
  '/login',
  '/api/',
  '/internal/',
  '/auth/',
  '/admission-alerts/',
  '/ingest/',
  '/dev',
];

export function buildRobots(
  trainingPolicy: 'allow' | 'block' = TRAINING_BOTS_POLICY,
): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      { userAgent: SEARCH_BOTS, allow: '/', disallow: DISALLOW },
      // Training policy is separate from the answer/search crawler policy above.
      trainingPolicy === 'allow'
        ? { userAgent: TRAINING_BOTS, allow: '/', disallow: DISALLOW }
        : { userAgent: TRAINING_BOTS, disallow: '/' },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
