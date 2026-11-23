import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { metadata as admission } from '@/app/app/calculator/page';
import { metadata as institutions } from '@/app/institutions/page';
import { metadata as openDays } from '@/app/open-days/page';
import { metadata as twoDomain } from '@/app/psychometric-two-domain/page';
import { metadata as sekhem } from '@/app/sekhem-calculator/page';
import { SHARE_IMAGE_SIZE, shareCards, socialImage } from './shareCards';

const pages = [
  ['admission calculator', admission, shareCards.admission, '/app/calculator'],
  ['sekhem calculator', sekhem, shareCards.sekhem, 'https://findmyway.co.il/sekhem-calculator'],
  ['institutions', institutions, shareCards.institutions, '/institutions'],
  [
    'psychometric two-domain',
    twoDomain,
    shareCards.psychometricTwoDomain,
    'https://findmyway.co.il/psychometric-two-domain',
  ],
  ['open days', openDays, shareCards.openDays, '/open-days'],
] as const;

describe('high-traffic share cards', () => {
  it.each(pages)('%s publishes a Hebrew 1200×630 preview', (_name, metadata, card, url) => {
    const image = socialImage(card);
    expect(metadata.openGraph).toMatchObject({
      title: expect.any(String),
      description: metadata.description,
      url,
      locale: 'he_IL',
      siteName: 'MyWay',
      images: [image],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: metadata.openGraph?.title,
      description: metadata.description,
      images: [image],
    });
    expect(card.alt).toMatch(/[\u0590-\u05FF]/);
    expect(card.headline).toMatch(/[\u0590-\u05FF]/);
    expect(image).toMatchObject(SHARE_IMAGE_SIZE);
    expect(String(metadata.openGraph?.title)).not.toMatch(/og:|sitemap|פומבי/);
  });
});
