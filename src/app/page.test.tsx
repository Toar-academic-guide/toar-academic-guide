// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const catalogue = vi.hoisted(() => ({
  fetchCataloguePrograms: vi.fn(() => Promise.reject(new Error('database unavailable'))),
  fetchCatalogueInstitutions: vi.fn(() => Promise.resolve([])),
}));
vi.mock('@/lib/catalogueClient', () => catalogue);
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ loading: false, user: null, signOut: vi.fn() }),
}));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: { geographicPreference: 'any', savedProgramIds: [] },
    hydrated: true,
    initialProfileStatus: 'ready',
    syncError: null,
    updateProfile: vi.fn(),
    toggleSavedProgram: vi.fn(),
    clearLocalProfileData: vi.fn(),
  }),
}));
vi.mock('@/components/WayBackdrop', () => ({ default: () => null }));
// HomeBrowse is an async Server Component that jsdom's client renderer cannot run.
// Its SSR output and catalogue-failure fallback are covered in publicCatalogueLinks.test.tsx.
vi.mock('@/components/seo/CatalogueLinks', () => ({ HomeBrowse: () => null }));

import Home from '@/app/page';

describe('Home catalogue cutover', () => {
  it('keeps the homepage usable without substituting fixtures when the catalogue fails', async () => {
    window.history.replaceState(null, '', '/#intent');
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: 'כן' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('לא הצלחנו לטעון את המסלולים. נסו שוב.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'פיזיותרפיה' })).toBeNull();
    expect((screen.getByRole('button', { name: 'המשיכו' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('shows one primary hero link directly to the calculator with a decorative spark', () => {
    window.history.replaceState(null, '', '/');
    const { container } = render(<Home />);
    const ctas = container.querySelectorAll('.journey-hero-copy .journey-primary');
    expect(ctas).toHaveLength(1);
    const cta = screen.getByRole('link', { name: 'בדקו לאן אתם מתקבלים' });
    expect(ctas[0]).toBe(cta);
    expect(cta.getAttribute('href')).toBe('/app/calculator');
    expect(cta.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(cta.querySelector('svg')?.getAttribute('focusable')).toBe('false');
    expect(screen.queryByRole('button', { name: 'עזרו לי לבחור מה ללמוד' })).toBeNull();
    expect(screen.queryByText('עזרו לי לבחור מה ללמוד')).toBeNull();
  });

  // Approved test update, Jorje 2026-10-30
  it('preserves the hero heading, intro and supporting copy', () => {
    window.history.replaceState(null, '', '/');
    const { container } = render(<Home />);
    const hero = container.querySelector('.hero-v2')!;
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'הדרך ללימודים שלכם מתחילה כאן.',
    );
    expect(hero.querySelector('.hero-subline')?.textContent).toBe(
      'בתוך ריבוי האפשרויות, MyWay עוזרת לעשות סדר ולבנות דרך שמתאימה לכם. שנתחיל?',
    );
    expect(hero.querySelector('.hero-intro')?.textContent).toBe(
      'בוחרים תחום לימודים ומשווים בין אוניברסיטאות ומכללות בכל הארץ',
    );
    expect(hero.querySelector('small')).toBeNull();
    expect(
      screen.queryByText('אפשר להתחיל גם בלי כל הציונים. התוצאות הראשונות בלי הרשמה.'),
    ).toBeNull();
  });
});

describe('Homepage hero 2.0', () => {
  it('renders the approved plural copy, exact separator, destinations and no funnel', () => {
    window.history.replaceState(null, '', '/');
    const { container } = render(<Home />);
    const hero = container.querySelector('.hero-v2')!;
    expect(hero).toBeTruthy();
    expect(hero.querySelector('h1')?.textContent).toBe('הדרך ללימודים שלכם מתחילה כאן.');
    expect(hero.querySelector('.hero-subline')?.textContent).toBe(
      'בתוך ריבוי האפשרויות, MyWay עוזרת לעשות סדר ולבנות דרך שמתאימה לכם. שנתחיל?',
    );
    expect(hero.querySelector('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(hero.querySelector('.hero-intro')?.textContent).toBe(
      'בוחרים תחום לימודים ומשווים בין אוניברסיטאות ומכללות בכל הארץ',
    );
    const primary = screen.getByRole('link', { name: 'בדקו לאן אתם מתקבלים' });
    expect(primary.getAttribute('href')).toBe('/app/calculator');
    expect(primary.textContent).toBe('בדקו לאן אתם מתקבלים\n\n\n');
    expect(
      screen.getByRole('link', { name: 'לא בטוחים מה ללמוד? לשאלון' }).getAttribute('href'),
    ).toBe('/app/assessment');
    expect(hero.querySelector('canvas')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.journey-funnel')).toBeNull();
    expect(
      hero.querySelectorAll('small, .journey-funnel-cloud, .journey-funnel-stage'),
    ).toHaveLength(0);
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(container.querySelectorAll('#main')).toHaveLength(1);
    expect(container.querySelector('#main-content')).toBeTruthy();
  });
});
