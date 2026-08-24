// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  push: vi.fn(),
  fetchCataloguePrograms: vi.fn(),
  fetchCatalogueInstitutions: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: hoisted.push,
  }),
}));

vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
  },
}));

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
    profile: { savedProgramIds: [], academicScores: {} },
    hydrated: true,
    isAuthenticated: false,
    removeSavedProgram: vi.fn(),
    syncError: null,
    syncing: false,
    toggleSavedProgram: vi.fn(),
    updateProfile: hoisted.updateProfile,
  }),
}));

vi.mock('@/lib/catalogueClient', () => {
  class CatalogueApiError extends Error {
    code = 'CATALOGUE_REQUEST_FAILED';
    details: string[];

    constructor(message: string, options?: { details?: string[] }) {
      super(message);
      this.details = options?.details ?? [];
    }
  }

  return {
    CatalogueApiError,
    fetchCataloguePrograms: hoisted.fetchCataloguePrograms,
    fetchCatalogueInstitutions: hoisted.fetchCatalogueInstitutions,
  };
});

vi.mock('@/components/NavBar', () => ({
  default: ({
    onGoToBucket,
    onGoToRecommendations,
  }: {
    onGoToBucket: () => void;
    onGoToRecommendations: () => void;
  }) => (
    <nav>
      <button type="button" onClick={onGoToBucket}>
        nav-saved-programs
      </button>
      <button type="button" onClick={onGoToRecommendations}>
        nav-recommendations
      </button>
    </nav>
  ),
}));

vi.mock('@/components/RecommendationResults', () => ({
  default: ({ onSelectDegree }: { onSelectDegree: (degreeId: string) => void }) => (
    <button type="button" onClick={() => onSelectDegree('technion-computer-science')}>
      select-degree
    </button>
  ),
}));

vi.mock('@/components/LandingPage', () => ({
  default: ({
    onNeedHelp,
    onGoToProfile,
  }: {
    onNeedHelp: () => void;
    onGoToProfile: () => void;
  }) => (
    <div>
      <button type="button" onClick={onNeedHelp}>
        start-assessment
      </button>
      <button type="button" onClick={onGoToProfile}>
        go-profile
      </button>
    </div>
  ),
}));

vi.mock('@/components/QuizIntro', () => ({
  default: ({ onStart }: { onStart: () => void }) => (
    <button type="button" onClick={onStart}>
      quiz-intro
    </button>
  ),
}));

vi.mock('@/components/AcademicProfileForm', () => ({
  default: ({ onComplete }: { onComplete: (scores: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onComplete({
          psychometric: { overall: 650 },
          bagrut: {
            weightedAverage: 102,
            subjectRecord: {
              schemaVersion: 1,
              sector: 'jewish',
              subjects: [{ subjectId: 'mathematics', units: 5, grade: 90 }],
            },
          },
        })
      }
    >
      academic-profile
    </button>
  ),
}));

vi.mock('@/components/CareerAssessment', () => ({
  default: () => <div>career-assessment</div>,
}));

vi.mock('@/components/OnboardingFunnel', () => ({
  default: () => <div>quick-filters</div>,
}));

vi.mock('@/components/BucketList', () => ({
  default: () => <div>bucket-list</div>,
}));

vi.mock('@/components/DegreePicker', () => ({
  default: () => <div>degree-picker</div>,
}));

vi.mock('@/components/AuthScreen', () => ({
  default: () => <div>auth-screen</div>,
}));

vi.mock('@/components/ScoreForm', () => ({
  default: () => <div>score-form</div>,
}));

vi.mock('@/components/ResultsDashboard', () => ({
  default: () => <div>results-dashboard</div>,
}));

vi.mock('@/components/CalculatorResults', () => ({
  default: ({
    degreeId,
    psychometric,
    bagrut,
  }: {
    degreeId: string;
    psychometric: number;
    bagrut: number;
  }) => <div>{`calculator-results:${degreeId}:${psychometric}:${bagrut}`}</div>,
}));

vi.mock('@/utils/recommendationEngine', () => ({
  getRecommendations: () => [{ id: 'software', label: 'Software' }],
}));

import AppExperience from './AppExperience';

describe('AppExperience route entry', () => {
  beforeEach(() => {
    hoisted.push.mockReset();
    hoisted.updateProfile.mockReset();
    hoisted.updateProfile.mockResolvedValue(true);
    hoisted.fetchCataloguePrograms.mockResolvedValue([
      {
        id: 'technion-computer-science',
        name: 'Computer Science',
        admissionType: 'sekhem',
      },
    ]);
    hoisted.fetchCatalogueInstitutions.mockResolvedValue([]);
    window.scrollTo = vi.fn();
  });

  it('shows a prerequisite state for direct recommendations links without assessment data', async () => {
    render(<AppExperience initialStep="recommendations" />);

    await waitFor(() =>
      expect(screen.getByText('כדי להציג המלצות צריך להשלים שאלון')).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'להתחיל שאלון' }));

    expect(hoisted.push).toHaveBeenCalledWith('/app/assessment');
  });

  it('pushes durable app routes for recommendation and saved-program navigation', async () => {
    render(<AppExperience initialStep="recommendations" enableDevShortcuts />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'select-degree' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'select-degree' }));
    expect(hoisted.push).toHaveBeenCalledWith('/app/calculator');

    fireEvent.click(screen.getByRole('button', { name: 'nav-saved-programs' }));
    expect(hoisted.push).toHaveBeenCalledWith('/app/saved-programs');
  });

  it('routes landing CTAs into durable app areas', () => {
    const firstRender = render(<AppExperience initialStep="landing" />);

    fireEvent.click(screen.getByRole('button', { name: 'start-assessment' }));
    expect(hoisted.push).toHaveBeenCalledWith('/app/assessment');

    firstRender.unmount();
    cleanup();
    hoisted.push.mockClear();

    render(<AppExperience initialStep="landing" />);

    fireEvent.click(screen.getByRole('button', { name: 'go-profile' }));
    expect(hoisted.push).toHaveBeenCalledWith('/app/profile');
  });

  it('returns a validated alert continuation to the TAU result after the profile is saved', async () => {
    render(
      <AppExperience
        initialStep="academic-profile"
        admissionAlertTarget={{ institutionId: 'tau', programId: 'tau_cs' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'academic-profile' }));

    await waitFor(() => expect(screen.getByText('calculator-results:tau_cs:650:102')).toBeTruthy());
  });

  it('does not show the TAU alert confirmation until the profile save succeeds', async () => {
    let resolveProfileSave: ((value: boolean) => void) | undefined;
    hoisted.updateProfile.mockImplementation(
      () => new Promise<boolean>((resolve) => (resolveProfileSave = resolve)),
    );

    render(
      <AppExperience
        initialStep="academic-profile"
        admissionAlertTarget={{ institutionId: 'tau', programId: 'tau_cs' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'academic-profile' }));
    expect(screen.queryByText('calculator-results:tau_cs:650:102')).toBeNull();

    resolveProfileSave?.(true);

    await waitFor(() => expect(screen.getByText('calculator-results:tau_cs:650:102')).toBeTruthy());
  });

  it('keeps the user on the profile when saving it fails', async () => {
    hoisted.updateProfile.mockResolvedValue(false);

    render(
      <AppExperience
        initialStep="academic-profile"
        admissionAlertTarget={{ institutionId: 'tau', programId: 'tau_cs' }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'academic-profile' }));

    await waitFor(() => expect(hoisted.updateProfile).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'academic-profile' })).toBeTruthy();
    expect(screen.queryByText('calculator-results:tau_cs:650:102')).toBeNull();
  });
});
