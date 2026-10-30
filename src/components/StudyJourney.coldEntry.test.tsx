// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { studyFields } from '@/lib/studyJourney';

const state = vi.hoisted(() => ({
  programs: vi.fn(),
  institutions: vi.fn(),
  evaluate: vi.fn(), preload: vi.fn(),
}));
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
    updateProfile: vi.fn().mockResolvedValue(true),
  }),
}));
vi.mock('@/lib/catalogueClient', () => ({
  fetchCataloguePrograms: state.programs,
  fetchCatalogueInstitutions: state.institutions,
}));
vi.mock('@/lib/admissionsEvaluationClient', () => ({ fetchAdmissionsBatch: state.evaluate }));
vi.mock('./preloadJourneyExactGrades', () => ({ preloadJourneyExactGrades: state.preload }));
import StudyJourney from './StudyJourney';
import CalculatorPage from '@/app/app/calculator/page';

const programs = getStaticCataloguePrograms().filter((program) => program.type === 'academic');

describe('calculator cold entry', () => {
  beforeEach(() => {
    state.programs.mockResolvedValue(programs);
    state.institutions.mockResolvedValue(getStaticCatalogueInstitutions());
    state.preload.mockReset();
    window.history.replaceState(null, '', '/app/calculator');
    window.sessionStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('renders the calculator without a server searchParams prop', async () => {
    const page = await (CalculatorPage as unknown as () => Promise<React.ReactNode>)();
    render(page);
    expect(await screen.findByRole('heading', { name: 'מה מעניין אותך ללמוד?' })).toBeTruthy();
  });

  it('selects the URL programme exactly like an explicit initialProgramId', async () => {
    window.history.replaceState(null, '', '/app/calculator?program=huji_cs');
    render(<StudyJourney initialStep="subjects" />);
    await waitFor(() => expect(JSON.parse(window.sessionStorage.getItem('myway_study_journey_v2')!)).toMatchObject({ fields: ['cs'], selectedRowId: 'huji_cs:huji' }));
    expect(screen.getByRole('button', { name: 'המשך' })).toHaveProperty('disabled', false);
  });

  it.each(['', '?program=huji_cs&program=tau_cs'])('preserves the empty chooser for absent/array programme queries: %s', async (query) => {
    window.history.replaceState(null, '', '/app/calculator' + query);
    render(<StudyJourney initialStep="subjects" />);
    await screen.findByRole('textbox', { name: 'חיפוש תחום לימודים' });
    expect(screen.getByRole('button', { name: 'המשך' })).toHaveProperty('disabled', true);
  });

  it('preloads the exact-grade chunk before effects for subjects entry', async () => {
    let preloadedAtCatalogueLoad = false;
    state.programs.mockImplementationOnce(async () => { preloadedAtCatalogueLoad = state.preload.mock.calls.length > 0; return programs; });
    render(<StudyJourney initialStep="subjects" />);
    expect(state.preload).toHaveBeenCalled();
    expect(preloadedAtCatalogueLoad).toBe(true);
    await screen.findByRole('textbox', { name: 'חיפוש תחום לימודים' });
  });

  it('retains the exact-grade hash entry', async () => {
    window.history.replaceState(null, '', '/app/calculator#grades-exact');
    render(<StudyJourney initialStep="subjects" />);
    expect(await screen.findByRole('heading', { name: 'ציוני הבגרות שלך' })).toBeTruthy();
    expect(state.preload).toHaveBeenCalled();
  });
});
