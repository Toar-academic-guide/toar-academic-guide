// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';

const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
const state = vi.hoisted(() => ({
  programs: vi.fn(),
  institutions: vi.fn(),
  evaluate: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/app/calculator',
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    hydrated: true,
    initialProfileStatus: 'ready',
    profile: { firstName: 'נועה', lastName: 'לוי' },
    updateProfile: vi.fn().mockResolvedValue(true),
  }),
}));
vi.mock('@/lib/catalogueClient', () => ({
  fetchCataloguePrograms: state.programs,
  fetchCatalogueInstitutions: state.institutions,
}));
vi.mock('@/lib/admissionsEvaluationClient', () => ({ fetchAdmissionsBatch: state.evaluate }));
import StudyJourney from './StudyJourney';

const programs = getStaticCataloguePrograms().filter((program) => program.type === 'academic');

describe('calculator back button', () => {
  beforeEach(() => {
    router.push.mockReset();
    router.back.mockReset();
    state.evaluate.mockReset().mockResolvedValue({ reports: {}, failedDegreeIds: [] });
    state.programs.mockResolvedValue(programs);
    state.institutions.mockResolvedValue(getStaticCatalogueInstitutions());
    window.history.replaceState({ __NA: true, tree: 'keep' }, '', '/app/calculator');
    window.sessionStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('leaves the calculator from the first step instead of opening the skipped intent question', async () => {
    render(<StudyJourney initialStep="subjects" />);
    expect(await screen.findByRole('heading', { name: 'מה מעניין אתכם ללמוד?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'חזרה' }));
    expect(screen.queryByRole('heading', { name: 'אני יודע/ת מה אני רוצה ללמוד' })).toBeNull();
    expect(router.push).toHaveBeenCalledWith('/');
    expect(window.history.state).toMatchObject({ __NA: true, tree: 'keep' });
  });

  it('returns to the previous step and keeps the router history state', async () => {
    render(<StudyJourney initialStep="subjects" />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'מדעי המחשב' }))[0]);
    fireEvent.click(screen.getByRole('button', { name: 'המשיכו' }));
    expect(screen.getByRole('heading', { name: 'איפה אתם רוצים ללמוד?' })).toBeTruthy();
    expect(window.history.state).toMatchObject({
      __NA: true,
      tree: 'keep',
      journeyStep: 'regions',
      journeyFrom: 'subjects',
    });
    const lengthAfterForward = window.history.length;
    fireEvent.click(screen.getByRole('button', { name: 'חזרה' }));
    expect(screen.getByRole('heading', { name: 'מה מעניין אתכם ללמוד?' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'אני יודע/ת מה אני רוצה ללמוד' })).toBeNull();
    expect(window.history.length).toBe(lengthAfterForward);
    expect(window.location.hash).toBe('#subjects');
    expect(window.history.state).toMatchObject({
      __NA: true,
      tree: 'keep',
      journeyStep: 'subjects',
    });
  });

  it('returns from an enquiry opened on the results to those results in one tap', async () => {
    window.sessionStorage.setItem(
      'myway_study_journey_v2',
      JSON.stringify({
        fields: ['cs'],
        locations: ['all'],
        types: ['all'],
        scores: { bagrut: { weightedAverage: 95 }, psychometric: { overall: 650 } },
      }),
    );
    render(<StudyJourney initialStep="results" />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'קבלו שיחה מהמוסד' }))[0]);
    expect(await screen.findByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'חזרה' }));
    expect(await screen.findByRole('heading', { name: 'האפשרויות שלכם' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(state.evaluate).toHaveBeenCalled());
  });
});
