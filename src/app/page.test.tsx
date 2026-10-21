// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

import Home from '@/app/page';

describe('Home catalogue cutover', () => {
  it('keeps the homepage usable without substituting fixtures when the catalogue fails', async () => {
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: 'עזרו לי לבחור מה ללמוד' }));
    fireEvent.click(screen.getByRole('button', { name: 'כן' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('לא הצלחנו לטעון את המסלולים. נסו שוב.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'פיזיותרפיה' })).toBeNull();
    expect((screen.getByRole('button', { name: 'המשך' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
