// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcademicScores } from '@/types';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';

const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  push: vi.fn(),
  savedProgramIds: [] as string[],
  profileStatus: 'ready' as 'ready' | 'loading',
  scores: {} as AcademicScores,
  fetchPrograms: vi.fn(),
  fetchInstitutions: vi.fn(),
  evaluate: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: state.push }),
  usePathname: () => '/',
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: state.user, loading: false }) }));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    hydrated: true,
    initialProfileStatus: state.profileStatus,
    profile: {
      geographicPreference: 'any',
      academicScores: state.scores,
      savedProgramIds: state.savedProgramIds,
    },
  }),
}));
vi.mock('@/lib/catalogueClient', () => ({
  fetchCataloguePrograms: state.fetchPrograms,
  fetchCatalogueInstitutions: state.fetchInstitutions,
}));
vi.mock('@/lib/admissionsEvaluationClient', () => ({ fetchAdmissionsBatch: state.evaluate }));
import StudyJourney from './StudyJourney';

describe('account grades in the homepage journey', () => {
  beforeEach(() => {
    state.user = null;
    state.savedProgramIds = [];
    state.profileStatus = 'ready';
    state.scores = { bagrut: { weightedAverage: 110 }, psychometric: { overall: 700 } };
    state.fetchPrograms.mockReset().mockResolvedValue([]);
    state.fetchInstitutions.mockReset().mockResolvedValue([]);
    state.evaluate.mockReset();
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

  function savedCatalogue() {
    const base = getStaticCataloguePrograms()[0];
    state.user = { id: 'saved-account' };
    state.savedProgramIds = ['saved_course'];
    state.fetchPrograms.mockResolvedValue([
      { ...base, id: 'saved_course', name: 'מסלול שמור', linkedInstitutionIds: ['tau'] },
      { ...base, id: 'other_course', name: 'מסלול אחר', linkedInstitutionIds: ['tau'] },
    ]);
    state.fetchInstitutions.mockResolvedValue([
      { id: 'tau', name: 'אוניברסיטת תל אביב', region: 'center' },
    ]);
    state.evaluate.mockResolvedValue({
      reports: {
        saved_course: {
          results: [{ linkedInstitutionId: 'tau', kind: 'exact', decision: 'accepted' }],
        },
      },
      failedDegreeIds: [],
    });
  }

  it('evaluates saved programmes after account hydration using saved grades, then recalculates changed grades', async () => {
    savedCatalogue();
    state.profileStatus = 'loading';
    // No selected field, and a draft target that must not affect saved matches.
    window.sessionStorage.setItem(
      'myway_study_journey_v2',
      JSON.stringify({
        fields: [],
        locations: ['north'],
        types: ['course'],
        scores: { psychometric: { overall: 500 } },
        target: 800,
      }),
    );
    const { rerender, unmount } = render(<StudyJourney initialStep="saved" />);
    await screen.findByRole('button', { name: 'מסלול שמור — אוניברסיטת תל אביב' });
    expect(state.evaluate).not.toHaveBeenCalled();
    state.profileStatus = 'ready';
    rerender(<StudyJourney initialStep="saved" />);
    await screen.findByText('עומד/ת בסף שחושב');
    expect(state.evaluate).toHaveBeenCalledTimes(1);
    expect(state.evaluate).toHaveBeenLastCalledWith(
      expect.objectContaining({ degreeIds: ['saved_course'], psychometric: 700, bagrut: 110 }),
    );
    expect(screen.queryByText('טרם חושבה התאמה')).toBeNull();
    state.scores = { ...state.scores, psychometric: { overall: 710 } };
    rerender(<StudyJourney initialStep="saved" />);
    await waitFor(() => expect(state.evaluate).toHaveBeenCalledTimes(2));
    expect(state.evaluate).toHaveBeenLastCalledWith(expect.objectContaining({ psychometric: 710 }));
    unmount();
    render(<StudyJourney initialStep="saved" />);
    await screen.findByText('עומד/ת בסף שחושב');
    expect(state.evaluate).toHaveBeenCalledTimes(3);
  });

  it('keeps saved courses with unpublished conditions without suggesting grades will resolve them', async () => {
    savedCatalogue();
    state.evaluate.mockResolvedValue({
      reports: {
        saved_course: {
          results: [
            {
              linkedInstitutionId: 'tau',
              kind: 'requirements_only',
              decision: 'unknown',
              degradationReason: 'incomplete_published_requirements',
              explanation: 'תנאי הקבלה המלאים אינם מפורסמים באתר המוסד.',
            },
          ],
        },
      },
      failedDegreeIds: [],
    });
    render(<StudyJourney initialStep="saved" />);
    await screen.findByText('עדיין לא ניתן לקבוע התאמה');
    fireEvent.click(screen.getByRole('button', { name: 'מסלול שמור — אוניברסיטת תל אביב' }));
    await screen.findByText('עדיין לא ניתן לקבוע התאמה');
    expect(screen.queryByRole('button', { name: 'השלמת נתונים לחישוב' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'עוד דרכי קבלה' })).toBeNull();
    expect(screen.getByRole('button', { name: 'יצירת קשר' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'הסרה מהרשימה' })).toBeTruthy();
    const contact = screen.getByRole('button', { name: 'יצירת קשר' });
    const save = screen.getByRole('button', { name: 'הסרה מהרשימה' });
    const requirements = screen.getByRole('heading', { name: 'תנאי קבלה' });
    // The main actions must be reached before supporting requirements, including by keyboard.
    expect(
      contact.compareDocumentPosition(requirements) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      save.compareDocumentPosition(requirements) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('recalculates a refreshed programme detail after account grades load, without selected fields', async () => {
    savedCatalogue();
    state.profileStatus = 'loading';
    window.sessionStorage.setItem(
      'myway_study_journey_v2',
      JSON.stringify({
        fields: [],
        locations: ['all'],
        types: ['all'],
        selectedRowId: 'saved_course:tau',
        scores: {},
      }),
    );
    const { rerender } = render(<StudyJourney initialStep="detail" />);
    await screen.findByRole('button', { name: 'יצירת קשר' });
    expect(state.evaluate).not.toHaveBeenCalled();
    state.profileStatus = 'ready';
    rerender(<StudyJourney initialStep="detail" />);
    await screen.findByText('עומד/ת בסף שחושב');
    expect(state.evaluate).toHaveBeenLastCalledWith(
      expect.objectContaining({ degreeIds: ['saved_course'], psychometric: 700, bagrut: 110 }),
    );
    expect(screen.queryByText('טרם חושבה התאמה')).toBeNull();
  });

  it('shows the saved-score match separately from outstanding entry conditions', async () => {
    savedCatalogue();
    state.evaluate.mockResolvedValue({
      reports: {
        saved_course: {
          results: [
            {
              linkedInstitutionId: 'tau',
              kind: 'exact',
              decision: 'pending',
              score: 700,
              threshold: 680,
              scoreLabel: 'פסיכומטרי',
              scoreAssessment: 'meets_threshold',
              additionalConditions: [
                { id: 'bgu_language_requirements', label: 'דרישות שפה', status: 'unconfirmed' },
                { id: 'bgu_psychology_requirements', label: 'תנאי החוג הנוסף', status: 'unmet' },
              ],
            },
          ],
        },
      },
      failedDegreeIds: [],
    });
    render(<StudyJourney initialStep="saved" />);
    await screen.findByText('הציונים עומדים בסף');
    fireEvent.click(screen.getByRole('button', { name: 'מסלול שמור — אוניברסיטת תל אביב' }));
    await screen.findByRole('heading', { name: 'תנאים נוספים לבדיקה' });
    expect(screen.getByText('טרם אושר')).toBeTruthy();
    expect(screen.getByText('לא מתקיים לפי הנתונים שהוזנו')).toBeTruthy();
    expect(screen.getByText(/700.00/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'עדכון נתונים ותנאים נוספים' })).toBeTruthy();
    expect(screen.queryByText('חסרים פרטים לחישוב')).toBeNull();
    expect(screen.queryByText('אפשר להגיש מועמדות')).toBeNull();
  });

  it('retries failed saved calculations and shows missing inputs without claiming a match', async () => {
    savedCatalogue();
    state.evaluate.mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValue({
      reports: {
        saved_course: {
          results: [{ linkedInstitutionId: 'tau', kind: 'needs_input', decision: 'unknown' }],
        },
      },
      failedDegreeIds: [],
    });
    render(<StudyJourney initialStep="saved" />);
    await screen.findByText('החישוב לא נטען');
    fireEvent.click(screen.getByRole('button', { name: 'לנסות שוב' }));
    await screen.findByText('חסרים פרטים לחישוב');
    expect(state.evaluate).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('החישוב לא נטען')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'מסלול שמור — אוניברסיטת תל אביב' }));
    await screen.findByText('חסרים פרטים לחישוב');
    fireEvent.click(screen.getByRole('button', { name: 'חזרה' }));
    await screen.findByRole('heading', { name: 'הרשימה שלי' });
    expect(screen.getByText('חסרים פרטים לחישוב')).toBeTruthy();
  });
});
