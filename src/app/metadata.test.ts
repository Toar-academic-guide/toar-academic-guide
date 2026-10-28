import { describe, expect, it, vi } from 'vitest';

// Inspect server metadata exports without loading unrelated client application code.
vi.mock('server-only', () => ({}));
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
    // Intentional (indexing brief): the home canonical is the slashed root URL.
    // metadataBase is cleared on this page because Next 16 strips the root slash
    // from a canonical resolved against it.
    expect(homeMetadata.metadataBase).toBeNull();
    expect(homeMetadata.alternates).toEqual({ canonical: 'https://findmyway.co.il/' });
    expect(homeMetadata.openGraph).toEqual({
      type: 'website',
      locale: 'he_IL',
      siteName: 'MyWay',
      url: 'https://findmyway.co.il/',
      title: 'מחשבון סיכויי קבלה לתואר לפי בגרות ופסיכומטרי | MyWay',
      description: 'בדיקת סיכויי קבלה לתואר לפי בגרות ופסיכומטרי עם מחשבון סיכויי קבלה בחינם לסטודנטים.',
    });
  });
});
