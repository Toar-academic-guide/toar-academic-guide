// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { evaluateBiuPublishedRoutes } from '@/server/admissions/biuPublishedRoutesEvaluation';

const state = vi.hoisted(() => ({ programs: vi.fn(), institutions: vi.fn(), evaluate: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    hydrated: true,
    initialProfileStatus: 'ready',
    profile: {},
    updateProfile: vi.fn(),
  }),
}));
vi.mock('@/lib/catalogueClient', () => ({
  fetchCataloguePrograms: state.programs,
  fetchCatalogueInstitutions: state.institutions,
}));
vi.mock('@/lib/admissionsEvaluationClient', () => ({ fetchAdmissionsBatch: state.evaluate }));
import StudyJourney from './StudyJourney';

const institution = getStaticCatalogueInstitutions().find((item) => item.id === 'biu')!;
const reservist = 'מילואימניקים: ייתכן מסלול קבלה ייעודי — כדאי לבדוק מול האוניברסיטה.';
const url = /https?:\/\/|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:ac\.il|co\.il|org\.il|com)/i;

async function detail(psychometric = 649, programId = 'biu_ee', quantitative: number | null = 132) {
  const result = evaluateBiuPublishedRoutes({
    institution,
    input: {
      degreeId: programId,
      bagrut: 100,
      psychometric,
      extraInputs: {
        psychometricMath: quantitative ?? undefined,
        psychometricEnglish: 85,
        mathUnits: 5,
        mathGrade: 90,
        physicsUnits: 5,
        physicsGrade: 85,
      },
    },
  });
  state.evaluate.mockResolvedValue({
    reports: { [programId]: { results: [{ ...result, estimated: true }] } },
    failedDegreeIds: [],
  });
  const base = getStaticCataloguePrograms().find((item) => item.id === programId)!;
  state.programs.mockResolvedValue([{ ...base, linkedInstitutionIds: ['biu'] }]);
  window.sessionStorage.setItem(
    'myway_study_journey_v2',
    JSON.stringify({
      fields: [],
      locations: ['all'],
      types: ['all'],
      selectedRowId: `${programId}:biu`,
      scores: { bagrut: { weightedAverage: 100 }, psychometric: { overall: psychometric } },
    }),
  );
  const rendered = render(<StudyJourney initialStep="detail" />);
  const table = await screen.findByRole('table', { name: 'בדיקת תנאי הסף לפי הציונים שלך' });
  return {
    ...rendered,
    table,
    result,
    summary: rendered.container.querySelector('.journey-result-explanation')!,
  };
}

describe('BIU journey detail verdict', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/#detail');
    window.sessionStorage.clear();
    state.institutions.mockResolvedValue([institution]);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('keeps URLs out of the detail summary and all body text, including source link labels', async () => {
    const { summary, table } = await detail();
    expect(summary.textContent).not.toMatch(url);
    expect(table.closest('section')!.textContent).not.toMatch(url);
  });

  it('replaces the old prose with exactly one deduplicated EE below verdict', async () => {
    const { container, result, summary } = await detail();
    expect(summary.textContent).toBe('לא עומד/ת בתנאי הסף: פסיכומטרי 649 מתחת ל-700');
    expect(container.querySelectorAll('.journey-result-explanation')).toHaveLength(1);
    expect(summary.textContent?.match(/פסיכומטרי/g)).toHaveLength(1);
    expect(summary.textContent).not.toMatch(/\n|\.\s+\S/);
    expect(screen.queryByText(result.explanation)).toBeNull();
  });

  it('states that all floors pass without claiming admission or changing the status chip', async () => {
    const { summary, result, container } = await detail(700);
    expect(summary.textContent).toBe('עומד/ת בכל תנאי הסף');
    expect(result.decision).toBe('unknown');
    expect(container.querySelector('.journey-status')?.textContent).toBe('אין הכרעת קבלה');
    expect(screen.queryByText(reservist)).toBeNull();
  });

  it('keeps conflicting floors to one short verdict with no invented threshold', async () => {
    const { summary } = await detail(650);
    expect(summary.textContent).toBe('מקורות סותרים לגבי תנאי הסף — כדאי לבדוק במחשבון הרשמי');
    expect(screen.queryByText(reservist)).toBeNull();
  });

  it('recognizes a passing alternative channel despite a miss in another channel', async () => {
    const { summary } = await detail(650, 'biu_cs');
    expect(summary.textContent).toBe('עומד/ת בתנאי הסף באחד ממסלולי הקבלה');
    expect(screen.queryByText(reservist)).toBeNull();
  });

  it('does not call missing hard-floor inputs a pass', async () => {
    const { summary } = await detail(700, 'biu_ee', null);
    expect(summary.textContent).toBe('חסרים נתונים לבדיקת תנאי הסף');
  });

  it('shows only the short reservist caveat below the table for below-floor results', async () => {
    const { table } = await detail();
    const caveat = screen.getByText(reservist);
    expect(table.compareDocumentPosition(caveat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(caveat.textContent).not.toMatch(url);
    expect(table.closest('section')!.textContent).not.toMatch(
      /תוכנית 30\+|בני 40|בוגרי מוסדות חינוך חרדיים/,
    );
  });

  it('places the estimate after the floor table in the detail view', async () => {
    const { table, container } = await detail();
    const estimate = container.querySelector('.admission-estimate');
    expect(estimate).not.toBeNull();
    expect(
      table.compareDocumentPosition(estimate!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
