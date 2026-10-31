// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/calculator',
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    hydrated: true,
    initialProfileStatus: 'ready',
    profile: {},
    updateProfile: vi.fn(),
  }),
}));
vi.mock('@/lib/catalogueClient', () => ({
  fetchCataloguePrograms: async () => getStaticCataloguePrograms(),
  fetchCatalogueInstitutions: async () => getStaticCatalogueInstitutions(),
}));
vi.mock('@/components/preloadJourneyExactGrades', () => ({ preloadJourneyExactGrades: vi.fn() }));
import CalculatorPage, { metadata } from './page';

describe('calculator programme query', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/app/calculator');
  });
  const selectedProgramId = () =>
    JSON.parse(
      window.sessionStorage.getItem('myway_study_journey_v2') ?? '{}',
    ).selectedRowId?.split(':')[0];
  it('passes a single programme query to the journey', async () => {
    window.history.replaceState(null, '', '/app/calculator?program=tau_cs');
    const page = CalculatorPage();
    render(page);
    await waitFor(() =>
      expect({
        initialStep: page.props.initialStep,
        initialProgramId: selectedProgramId(),
      }).toMatchObject({ initialStep: 'subjects', initialProgramId: 'tau_cs' }),
    );
  });

  it('ignores ambiguous repeated programme parameters', async () => {
    window.history.replaceState(null, '', '/app/calculator?program=tau_cs&program=haifa_law');
    render(CalculatorPage());
    await screen.findByRole('textbox', { name: 'חיפוש תחום לימודים' });
    expect(selectedProgramId()).toBeUndefined();
  });
});

describe('calculator metadata', () => {
  it('describes admission chances without institutional composite terminology', () => {
    expect(metadata.title).toContain('מחשבון סיכויי קבלה');
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 33)
    expect(metadata.description).toBe(
      'מזינים בגרות ופסיכומטרי, ורואים לאן אתם מתקבלים. חינם, בלי הרשמה, מול תנאי הקבלה הרשמיים.',
    );
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
