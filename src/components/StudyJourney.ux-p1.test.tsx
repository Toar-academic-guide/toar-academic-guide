// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { studyFields } from '@/lib/studyJourney';

const state = vi.hoisted(() => ({
  programs: vi.fn(),
  institutions: vi.fn(),
  evaluate: vi.fn(),
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
import StudyJourney from './StudyJourney';

const programs = getStaticCataloguePrograms().filter((program) => program.type === 'academic');

describe('UX P1 subject selection', () => {
  beforeEach(() => {
    state.programs.mockResolvedValue(programs);
    state.institutions.mockResolvedValue(getStaticCatalogueInstitutions());
    window.history.replaceState(null, '', '/app/calculator');
    window.sessionStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('finds every engineering subject and the hub when searching הנדסה', async () => {
    render(<StudyJourney initialStep="subjects" />);
    const search = await screen.findByRole('textbox', { name: 'חיפוש תחום לימודים' });
    fireEvent.change(search, { target: { value: 'הנדסה' } });

    const engineeringFields = studyFields(programs).filter((field) => /הנדס[הת]/.test(field.name));
    expect(engineeringFields.some((field) => field.name === 'הנדסה וטכנולוגיה')).toBe(true);
    expect(engineeringFields.some((field) => field.name === 'הנדסת תוכנה')).toBe(true);
    for (const field of engineeringFields) {
      expect(screen.getByRole('button', { name: field.name })).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: 'מדעי המחשב' })).toBeNull();
  });

  it('preselects a linked programme over unrelated stored filters and retains its institution', async () => {
    window.sessionStorage.setItem(
      'myway_study_journey_v2',
      JSON.stringify({
        fields: ['law'],
        locations: ['south'],
        types: ['college'],
        scores: { bagrut: { weightedAverage: 95 } },
      }),
    );
    render(<StudyJourney initialStep="subjects" initialProgramId="tau_cs" />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'המשך' })).toHaveProperty('disabled', false);
      expect(JSON.parse(window.sessionStorage.getItem('myway_study_journey_v2')!)).toMatchObject({
        fields: ['cs'],
        locations: ['all'],
        types: ['all'],
        selectedRowId: 'tau_cs:tau',
        scores: { bagrut: { weightedAverage: 95 } },
      });
    });
    expect(
      screen
        .getAllByRole('button', { name: 'מדעי המחשב' })
        .every((button) => button.getAttribute('aria-pressed') === 'true'),
    ).toBe(true);
  });

  it('allows the student to change the preselected field without forcing it back', async () => {
    render(<StudyJourney initialStep="subjects" initialProgramId="tau_cs" />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'המשך' })).toHaveProperty('disabled', false),
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'מדעי המחשב' })[0]);
    expect(screen.getByRole('button', { name: 'המשך' })).toHaveProperty('disabled', true);
  });

  it('keeps unknown programme IDs in the ordinary empty chooser', async () => {
    render(<StudyJourney initialStep="subjects" initialProgramId="missing-program" />);
    await screen.findByRole('textbox', { name: 'חיפוש תחום לימודים' });
    expect(screen.getByRole('button', { name: 'המשך' })).toHaveProperty('disabled', true);
  });
});
