// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';

const state = vi.hoisted(() => ({
  capture: vi.fn(),
  fetchPrograms: vi.fn(),
  fetchInstitutions: vi.fn(),
  evaluate: vi.fn(),
  updateProfile: vi.fn().mockResolvedValue(true),
}));
vi.mock('posthog-js', () => ({ default: { capture: state.capture } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    hydrated: true,
    initialProfileStatus: 'ready',
    profile: { savedProgramIds: ['tau_cs', 'huji_cs', 'bgu_cs'] },
    updateProfile: state.updateProfile,
  }),
}));
vi.mock('@/lib/catalogueClient', () => ({
  fetchCataloguePrograms: state.fetchPrograms,
  fetchCatalogueInstitutions: state.fetchInstitutions,
}));
vi.mock('@/lib/admissionsEvaluationClient', () => ({ fetchAdmissionsBatch: state.evaluate }));
import StudyJourney from './StudyJourney';

const report = {
  reports: {
    tau_cs: { results: [{ linkedInstitutionId: 'tau', kind: 'exact', decision: 'accepted' }] },
    huji_cs: { results: [{ linkedInstitutionId: 'tau', kind: 'exact', decision: 'below' }] },
  },
  failedDegreeIds: ['bgu_cs'],
};
const events = (name: string) => state.capture.mock.calls.filter(([event]) => event === name);

describe('journey funnel analytics', () => {
  beforeEach(() => {
    state.capture.mockReset();
    state.evaluate.mockReset().mockResolvedValue(report);
    const base = getStaticCataloguePrograms()[0];
    state.fetchPrograms.mockResolvedValue(
      ['tau_cs', 'huji_cs', 'bgu_cs'].map((id) => ({
        ...base,
        id,
        name: 'מדעי המחשב',
        type: 'academic',
        linkedInstitutionIds: ['tau'],
      })),
    );
    state.fetchInstitutions.mockResolvedValue([
      {
        id: 'tau',
        name: 'אוניברסיטת תל אביב',
        region: 'center',
        programUrl: 'https://www.tau.ac.il/',
      },
    ]);
    window.history.replaceState(null, '', '/');
    window.sessionStorage.clear();
    window.sessionStorage.setItem(
      'myway_study_journey_v2',
      JSON.stringify({
        fields: ['cs'],
        locations: ['all'],
        types: ['all'],
        scores: { bagrut: { weightedAverage: 95 }, psychometric: { overall: 650 } },
      }),
    );
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('counts settled groups once per results visit, including Strict Mode and UI rerenders', async () => {
    let finish!: (value: typeof report) => void;
    state.evaluate.mockReturnValue(
      new Promise<typeof report>((resolve) => {
        finish = resolve;
      }),
    );
    const { rerender } = render(
      <StrictMode>
        <StudyJourney initialStep="results" />
      </StrictMode>,
    );
    await waitFor(() => expect(state.evaluate).toHaveBeenCalled());
    expect(events('journey_results_viewed')).toHaveLength(0);
    await act(async () => finish(report));
    expect(events('journey_results_viewed')).toEqual([
      [
        'journey_results_viewed',
        {
          result_count: 3,
          match_count: 1,
          improve_count: 1,
          explore_count: 1,
          has_psychometric: true,
          has_bagrut: true,
        },
      ],
    ]);
    rerender(
      <StrictMode>
        <StudyJourney initialStep="results" />
      </StrictMode>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'לפי מוסד' }));
    fireEvent.click(screen.getByRole('button', { name: 'סינון' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'חיפוש אפשרויות' }), {
      target: { value: 'private search text' },
    });
    expect(events('journey_results_viewed')).toHaveLength(1);
    fireEvent.change(screen.getByRole('textbox', { name: 'חיפוש אפשרויות' }), {
      target: { value: '' },
    });
    // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 16)
    fireEvent.click(screen.getAllByRole('button', { name: 'קבלו שיחה מהמוסד' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'חזרה' }));
    fireEvent.click(screen.getByRole('button', { name: 'חזרה' }));
    await waitFor(() => expect(events('journey_results_viewed')).toHaveLength(2));
  });

  it.each(['row', 'detail', 'compare', 'offer'] as const)(
    'attributes the %s contact entry point without sending scores',
    async (surface) => {
      render(<StudyJourney initialStep="results" />);
      await waitFor(() => expect(events('journey_results_viewed')).toHaveLength(1));
      if (surface === 'offer') {
        fireEvent.click(screen.getByRole('button', { name: 'עזרה בהכנה לפסיכומטרי' }));
      } else {
        if (surface === 'detail') {
          fireEvent.click(screen.getAllByRole('button', { name: 'אוניברסיטת תל אביב' })[0]);
        } else if (surface === 'compare') {
          fireEvent.click(screen.getByRole('button', { name: 'לרשימה שלי' }));
          const checkboxes = await screen.findAllByRole('checkbox', { name: 'להשוואה' });
          fireEvent.click(checkboxes[0]);
          fireEvent.click(checkboxes[1]);
          fireEvent.click(screen.getByRole('button', { name: 'השוואת מסלולים' }));
        }
        // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 16)
        fireEvent.click(screen.getAllByRole('button', { name: 'קבלו שיחה מהמוסד' })[0]);
      }
      await screen // Approved test update, Jorje 2026-10-26
        .findByRole('dialog', {
          name: surface === 'offer' ? 'הכנה לפסיכומטרי' : 'אוניברסיטת תל אביב',
        });
      expect(events('journey_contact_clicked')).toEqual([
        [
          'journey_contact_clicked',
          surface === 'offer'
            ? {
                program_id: 'psychometric-preparation',
                institution_id: '',
                surface: 'offer',
              }
            : { program_id: 'tau_cs', institution_id: 'tau', surface, result_group: 'match' },
        ],
      ]);
      expect(events('enquiry_form_viewed')).toEqual([
        [
          'enquiry_form_viewed',
          {
            program_id: surface === 'offer' ? 'psychometric-preparation' : 'tau_cs',
            institution_id: surface === 'offer' ? '' : 'tau',
            surface: 'journey',
            source_path: '/',
          },
        ],
      ]);
    },
  );

  it('waits for a new target calculation instead of counting older reports', async () => {
    render(<StudyJourney initialStep="results" />);
    await waitFor(() => expect(events('journey_results_viewed')).toHaveLength(1));
    let finish!: (value: typeof report) => void;
    state.evaluate.mockReturnValue(
      new Promise<typeof report>((resolve) => {
        finish = resolve;
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'מה אם אשפר ציון?' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'ציון יעד' }), {
      target: { value: '750' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'לבדוק את האפשרויות' }));
    await waitFor(() => expect(state.evaluate).toHaveBeenCalledTimes(2));
    expect(events('journey_results_viewed')).toHaveLength(1);
    await act(async () => finish(report));
    expect(events('journey_results_viewed')).toHaveLength(2);
  });

  it('does not treat a target as an existing psychometric score', async () => {
    window.sessionStorage.setItem(
      'myway_study_journey_v2',
      JSON.stringify({
        fields: ['cs'],
        locations: ['all'],
        types: ['all'],
        scores: {},
        target: 750,
      }),
    );
    render(<StudyJourney initialStep="results" />);
    await waitFor(() => expect(events('journey_results_viewed')).toHaveLength(1));
    expect(events('journey_results_viewed')[0][1]).toEqual({
      result_count: 3,
      match_count: 1,
      improve_count: 1,
      explore_count: 1,
      has_psychometric: false,
      has_bagrut: false,
    });
  });

  it('tracks the journey institution site link with only the active pair IDs', async () => {
    state.capture.mockClear();
    window.history.replaceState(null, '', '/');
    render(<StudyJourney initialStep="results" />);
    await waitFor(() => expect(events('journey_results_viewed')).toHaveLength(1));
    fireEvent.click(screen.getAllByRole('button', { name: 'אוניברסיטת תל אביב' })[0]);
    const link = await screen.findByRole('link', { name: 'לאתר המוסד' });
    link.addEventListener('click', (e) => e.preventDefault());
    fireEvent.click(link);
    expect(events('institution_site_clicked')).toEqual([
      ['institution_site_clicked', { program_id: 'tau_cs', institution_id: 'tau' }],
    ]);
  });
});
