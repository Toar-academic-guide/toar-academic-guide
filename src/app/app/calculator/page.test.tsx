import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/StudyJourney', () => ({ default: () => null }));
import CalculatorPage, { metadata } from './page';

describe('calculator programme query', () => {
  it('passes a single programme query to the journey', async () => {
    const page = await CalculatorPage({ searchParams: Promise.resolve({ program: 'tau_cs' }) });
    expect(page.props).toMatchObject({ initialStep: 'subjects', initialProgramId: 'tau_cs' });
  });

  it('ignores ambiguous repeated programme parameters', async () => {
    const page = await CalculatorPage({
      searchParams: Promise.resolve({ program: ['tau_cs', 'haifa_law'] }),
    });
    expect(page.props.initialProgramId).toBeUndefined();
  });
});

describe('calculator metadata', () => {
  it('describes admission chances without institutional composite terminology', () => {
    expect(metadata.title).toContain('מחשבון סיכויי קבלה');
    expect(metadata.description).toContain('מחשבון סיכויי קבלה');
    expect(metadata.title).not.toContain('סכם');
    expect(metadata.description).not.toContain('סכם');
  });

  it('inherits robots and leaves canonical metadata unset', () => {
    expect('robots' in metadata).toBe(false);
    expect(metadata.alternates).toBeUndefined();
  });

  it('sets calculator-specific Open Graph and Twitter metadata', () => {
    expect(metadata.openGraph?.url).toBe('/app/calculator');
    expect(metadata.openGraph).toMatchObject({
      title: `${metadata.title} | MyWay`,
      description: metadata.description,
      type: 'website',
      locale: 'he_IL',
      siteName: 'MyWay',
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary',
      title: `${metadata.title} | MyWay`,
      description: metadata.description,
    });
  });
});
