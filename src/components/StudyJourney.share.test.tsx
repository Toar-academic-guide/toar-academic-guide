// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';

const state = vi.hoisted(() => ({
  capture: vi.fn(),
  fetchPrograms: vi.fn(),
  fetchInstitutions: vi.fn(),
  evaluate: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: { capture: state.capture } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/calculator',
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    hydrated: true,
    initialProfileStatus: 'ready',
    profile: { savedProgramIds: [] },
    updateProfile: vi.fn(),
  }),
}));
vi.mock('@/lib/catalogueClient', () => ({
  fetchCataloguePrograms: state.fetchPrograms,
  fetchCatalogueInstitutions: state.fetchInstitutions,
}));
vi.mock('@/lib/admissionsEvaluationClient', () => ({ fetchAdmissionsBatch: state.evaluate }));
import StudyJourney from './StudyJourney';

beforeEach(() => {
  state.capture.mockReset();
  state.evaluate.mockReset().mockResolvedValue({
    reports: {
      tau_cs: { results: [{ linkedInstitutionId: 'tau', kind: 'exact', decision: 'accepted' }] },
    },
    failedDegreeIds: [],
  });
  const base = getStaticCataloguePrograms()[0];
  state.fetchPrograms.mockResolvedValue([
    {
      ...base,
      id: 'tau_cs',
      name: 'מדעי המחשב',
      type: 'academic',
      linkedInstitutionIds: ['tau'],
    },
  ]);
  state.fetchInstitutions.mockResolvedValue([
    {
      id: 'tau',
      name: 'אוניברסיטת תל אביב',
      region: 'center',
      programUrl: 'https://www.tau.ac.il/',
    },
  ]);
  window.history.replaceState(null, '', '/app/calculator?bagrut=95&psychometric=700');
  window.sessionStorage.clear();
  window.sessionStorage.setItem(
    'myway_study_journey_v2',
    JSON.stringify({
      fields: ['cs'],
      locations: ['all'],
      types: ['all'],
      scores: { bagrut: { weightedAverage: 95 }, psychometric: { overall: 700 } },
    }),
  );
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('open', vi.fn());
});

it('shares the calculator from the results, without the entered scores', async () => {
  render(<StudyJourney initialStep="results" />);
  fireEvent.click(await screen.findByRole('button', { name: 'שיתוף התוצאות' }));
  const target = String(vi.mocked(window.open).mock.calls.at(-1)?.[0] ?? '');
  const text = new URL(target).searchParams.get('text') ?? '';
  expect(text).toContain('https://findmyway.co.il/app/calculator');
  expect(text).not.toContain('95');
  expect(text).not.toContain('700');
  expect(target).not.toContain('bagrut');
  expect(state.capture.mock.calls).toContainEqual([
    'calculator_results_shared',
    { calculator_surface: 'journey_calculator' },
  ]);
});
