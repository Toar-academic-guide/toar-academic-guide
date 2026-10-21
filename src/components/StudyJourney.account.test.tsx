// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ user: null as null | { id: string }, push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push }),
  usePathname: () => '/',
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: state.user, loading: false }) }));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    hydrated: true,
    initialProfileStatus: 'ready',
    profile: {
      geographicPreference: 'any',
      academicScores: { bagrut: { weightedAverage: 110 }, psychometric: { overall: 700 } },
    },
  }),
}));
vi.mock('@/lib/catalogueClient', () => ({
  fetchCataloguePrograms: async () => [],
  fetchCatalogueInstitutions: async () => [],
}));
import StudyJourney from './StudyJourney';

describe('account grades in the homepage journey', () => {
  beforeEach(() => {
    state.user = null;
    window.history.replaceState(null, '', '/');
    window.sessionStorage.clear();
    window.sessionStorage.setItem(
      'myway_study_journey_v2',
      JSON.stringify({
        fields: ['cs'],
        locations: ['all'],
        types: ['all'],
        scores: { bagrut: { weightedAverage: 95 } },
        gradeMode: 'none',
        psyMode: 'none',
      }),
    );
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('loads account grades over an old browser draft and preserves edits during the visit', async () => {
    state.user = { id: 'signed-in-account' };
    const { rerender } = render(<StudyJourney initialStep="grades-quick" />);
    const average = screen.getByRole('spinbutton', { name: 'ממוצע בגרות' });
    await waitFor(() => expect((average as HTMLInputElement).value).toBe('110'));
    fireEvent.change(average, { target: { value: '111.5' } });
    rerender(<StudyJourney initialStep="grades-quick" />);
    expect((average as HTMLInputElement).value).toBe('111.5');
  });

  it('preserves an unfinished guest draft', async () => {
    render(<StudyJourney initialStep="grades-quick" />);
    await waitFor(() =>
      expect(
        (screen.getByRole('spinbutton', { name: 'ממוצע בגרות' }) as HTMLInputElement).value,
      ).toBe('95'),
    );
  });
});
