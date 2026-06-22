// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockedCatalogueModule = vi.hoisted(() => {
  class HoistedCatalogueApiError extends Error {
    code: string;
    details: string[];

    constructor(message: string, options?: { code?: string; details?: string[] }) {
      super(message);
      this.code = options?.code ?? 'CATALOGUE_REQUEST_FAILED';
      this.details = options?.details ?? [];
    }
  }

  return {
    CatalogueApiError: HoistedCatalogueApiError,
    fetchCataloguePrograms: vi.fn(() =>
      Promise.reject(
        new HoistedCatalogueApiError('Catalogue database is not ready for runtime traffic.', {
          code: 'CATALOGUE_DATABASE_NOT_READY',
          details: ['Institutions missing calculator configs: tau'],
        })
      )
    ),
    fetchCatalogueInstitutions: vi.fn(() => Promise.resolve([])),
  };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    signOut: vi.fn(),
    user: null,
  }),
}));

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    clearLocalProfileData: vi.fn(),
    profile: { savedProgramIds: [] },
    hydrated: true,
    isAuthenticated: false,
    removeSavedProgram: vi.fn(),
    syncError: null,
    syncing: false,
    toggleSavedProgram: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock('@/lib/catalogueClient', () => mockedCatalogueModule);

vi.mock('@/components/LandingPage', () => ({
  default: ({ onAlreadyKnow }: { onAlreadyKnow: () => void }) => (
    <button type="button" onClick={onAlreadyKnow}>
      open-degree-picker
    </button>
  ),
}));

vi.mock('@/components/DegreePicker', () => ({
  default: () => <div>degree-picker</div>,
}));

vi.mock('@/components/NavBar', () => ({
  default: () => null,
}));

vi.mock('@/components/RiasecExam', () => ({
  default: () => null,
}));

vi.mock('@/components/OnboardingFunnel', () => ({
  default: () => null,
}));

vi.mock('@/components/AuthScreen', () => ({
  default: () => null,
}));

vi.mock('@/components/QuizIntro', () => ({
  default: () => null,
}));

vi.mock('@/components/AcademicProfileForm', () => ({
  default: () => null,
}));

vi.mock('@/components/RecommendationResults', () => ({
  default: () => null,
}));

vi.mock('@/components/BucketList', () => ({
  default: () => null,
}));

vi.mock('@/components/ScoreForm', () => ({
  default: () => null,
}));

vi.mock('@/components/ResultsDashboard', () => ({
  default: () => null,
}));

import Home from '@/app/page';

describe('Home catalogue cutover', () => {
  it('shows an unavailable state instead of silently rendering the degree picker when catalogue boot fails', async () => {
    render(<Home />);

    fireEvent.click(screen.getByRole('button', { name: 'open-degree-picker' }));

    await waitFor(() =>
      expect(screen.getByText('לא הצלחנו לטעון את קטלוג התארים')).toBeTruthy()
    );
    expect(screen.getByText('Catalogue database is not ready for runtime traffic.')).toBeTruthy();
    expect(screen.queryByText('degree-picker')).toBeNull();
  });
});
