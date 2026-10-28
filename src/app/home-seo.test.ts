import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/components/StudyJourney', () => ({ default: () => null }));

import { metadata } from './page';

describe('homepage search metadata', () => {
  it('sets the calculator title locally with the brand suffix exactly once', () => {
    expect(metadata.title).toEqual({
      absolute: 'מחשבון סיכויי קבלה לתואר לפי בגרות ופסיכומטרי | MyWay',
    });
    expect(String((metadata.title as { absolute: string }).absolute).length).toBeLessThanOrEqual(
      60,
    );
  });

  it('describes the free score-based check and shares the same social copy', () => {
    for (const keyword of [
      'בדיקת סיכויי קבלה',
      'מחשבון סיכויי קבלה',
      'בגרות',
      'פסיכומטרי',
      'בחינם',
    ]) {
      expect(metadata.description).toContain(keyword);
    }
    expect(metadata.description!.length).toBeLessThanOrEqual(160);
    expect(metadata.description).not.toMatch(/סכם|מתואם|מצרף|composite/i);
    expect(metadata.openGraph).toMatchObject({
      title: (metadata.title as { absolute: string }).absolute,
      description: metadata.description,
    });
    expect(metadata.metadataBase).toBeNull();
    expect(metadata.alternates).toEqual({ canonical: 'https://findmyway.co.il/' });
  });
});
