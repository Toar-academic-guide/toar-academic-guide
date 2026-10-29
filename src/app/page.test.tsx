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
    expect((screen.getByRole('button', { name: 'המשך' }) as HTMLButtonElement).disabled).toBe(true);
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

  it('preserves the hero heading, intro and supporting copy', () => {
    window.history.replaceState(null, '', '/');
    const { container } = render(<Home />);
    const hero = container.querySelector('.journey-hero-copy')!;
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'בוחרים מה ללמוד,איפה ללמודואיך להתקבל.',
    );
    expect(hero.querySelector('p.journey-hero-intro')?.textContent).toBe(
      'הדרך ללימודים שלך מתחילה כאן.',
    );
    expect(hero.querySelector('p:not(.journey-hero-intro)')?.textContent).toBe(
      'בתוך ריבוי האפשרויות, Way עוזרת לעשות סדר ולבנות דרך שמתאימה לך. שנתחיל?',
    );
    expect(hero.querySelector('small')?.textContent).toBe(
      'אפשר להתחיל גם בלי כל הציונים. התוצאות הראשונות בלי הרשמה.',
    );
  });
});
