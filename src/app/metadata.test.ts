import { describe, expect, it, vi } from 'vitest';
import { SITE_DESCRIPTION } from '@/lib/site';

// Inspect server metadata exports without loading unrelated client application code.
vi.mock('@/components/StudyJourney', () => ({ default: () => null }));
vi.mock('@/context/AuthContext', () => ({ AuthProvider: () => null }));
vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }));

import { metadata as rootMetadata } from './layout';
import { metadata as homeMetadata } from './page';

describe('home metadata inheritance', () => {
  it('keeps home URLs out of the shared root metadata', () => {
    expect(rootMetadata).not.toHaveProperty('alternates.canonical');
    expect(rootMetadata.openGraph).not.toHaveProperty('url');
    expect(rootMetadata.openGraph).toMatchObject({
      type: 'website',
      locale: 'he_IL',
      siteName: 'MyWay',
    });
    expect(rootMetadata.title).toEqual({
      default: 'MyWay | הדרך שלך ללימודים',
      template: '%s | MyWay',
    });
  });

  it('sets the canonical and complete Open Graph metadata only on the home page', () => {
    expect(homeMetadata.alternates).toEqual({ canonical: '/' });
    expect(homeMetadata.openGraph).toEqual({
      type: 'website',
      locale: 'he_IL',
      siteName: 'MyWay',
      url: '/',
      title: 'MyWay | הדרך שלך ללימודים',
      description: SITE_DESCRIPTION,
    });
  });
});
