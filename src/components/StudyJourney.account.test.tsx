// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcademicScores } from '@/types';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';
import baselineLaw from '../../docs/ui-verification/2026-10-23-requirement-tiles/baseline-law_low.json';

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
import { evaluateBatchBManualPath } from '@/server/admissions/batchBManualPathEvaluation';

describe('account grades in the homepage journey', () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
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

  it('shows accepted Ono nursing detail with the interview in a gray footnote', async () => {
    const program = getStaticCataloguePrograms().find((p) => p.id === 'ono_nursing')!;
    const institution = getStaticCatalogueInstitutions().find((i) => i.id === 'ono')!;
    const result = evaluateBatchBManualPath({
      input: { degreeId: program.id, bagrut: 85, psychometric: 520 },
      institution,
    })!;
    state.fetchPrograms.mockResolvedValue([program]);
    state.fetchInstitutions.mockResolvedValue([institution]);
    state.evaluate.mockResolvedValue({
      reports: { ono_nursing: { results: [result] } },
      failedDegreeIds: [],
    });
    window.sessionStorage.setItem(
      'myway_study_journey_v2',
      JSON.stringify({
        fields: [],
        locations: ['all'],
        types: ['all'],
        selectedRowId: 'ono_nursing:ono',
        scores: { bagrut: { weightedAverage: 85 }, psychometric: { overall: 520 } },
      }),
    );
    const { container } = render(<StudyJourney initialStep="detail" />);
    expect(await screen.findByText('מתקבלים')).toBeTruthy();
    const footnote = screen.getByText('נדרש גם ריאיון קבלה. אישור סופי מהמכללה.');
    expect(footnote.className).toContain('text-slate-400');
    expect(footnote.className).toContain('text-xs');
    expect(container.querySelector('.journey-result-explanation')?.textContent).toBe(
      result.explanation,
    );
    expect(screen.queryByText('תנאים נוספים לבדיקה')).toBeNull();
    expect(screen.getByRole('button', { name: 'יצירת קשר' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'שמירה לרשימה' })).toBeTruthy();
  });

  it('changes only the calculator detail requirements while preserving the baseline decision and actions', async () => {
    const program = getStaticCataloguePrograms().find((p) => p.id === 'colmgmt_law')!;
    state.fetchPrograms.mockResolvedValue([program]);
    state.fetchInstitutions.mockResolvedValue(
      getStaticCatalogueInstitutions().filter((i) => i.id === 'colman'),
    );
    state.evaluate.mockResolvedValue({
      reports: {
        colmgmt_law: {
          results: [
            {
              linkedInstitutionId: 'colman',
              kind: 'manual_gate',
              decision: 'below',
              scoreAssessment: 'below_threshold',
              explanation: baselineLaw.explanation[0],
            },
          ],
        },
      },
      failedDegreeIds: [],
    });
    window.sessionStorage.setItem(
      'myway_study_journey_v2',
      JSON.stringify({
        fields: [],
        locations: ['all'],
        types: ['all'],
        selectedRowId: 'colmgmt_law:colman',
        scores: {
          bagrut: { weightedAverage: 60 },
          psychometric: { overall: 400 },
          admissions: { colmanBagrutAverage: 60, colmanBagrutCertificateConfirmed: true },
        },
      }),
    );
    const { container } = render(<StudyJourney initialStep="detail" />);
    await screen.findByText(baselineLaw.badge);
    expect(screen.getByText(baselineLaw.explanation[0])).toBeTruthy();
    const details = screen.getByText('פרטים נוספים').closest('details')!;
    expect(details.open).toBe(false);
    const items = [...details.querySelectorAll('li')].map((li) => li.textContent);
    for (const requirement of baselineLaw.requirements)
      expect(items.filter((text) => text === requirement)).toHaveLength(1);
    expect(screen.queryByText('התנאים מורכבים? בדקו את הסיכויים שלכם')).toBeNull();
    expect(container.querySelector('.journey-detail-actions')?.textContent).toBe(
      baselineLaw.actions.replaceAll('\n', ''),
    );
    expect(container.querySelector('.journey-links')?.textContent).toBe(
      baselineLaw.links.replaceAll('\n', ''),
    );
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

  it('uses compact institution-specific requirements when comparing saved programmes', async () => {
    savedCatalogue();
    state.savedProgramIds = ['saved_course', 'other_course'];
    const base = getStaticCataloguePrograms()[0];
    state.fetchPrograms.mockResolvedValue(
      ['saved_course', 'other_course'].map((id, index) => ({
        ...base,
        id,
        name: `מסלול ${index + 1}`,
        linkedInstitutionIds: ['tau'],
        admissionRequirements: ['כלל שאינו שייך למוסד'],
        institutionDetails: [
          {
            institutionName: 'אוניברסיטת תל אביב',
            specificAdmissionNotes: [
              'ממוצע בגרות 100 לפחות',
              'פסיכומטרי 600 לפחות',
              'מתמטיקה 5 יחידות',
              'תנאי נוסף לבדיקה',
            ],
          },
        ],
      })),
    );
    render(<StudyJourney initialStep="saved" />);
    await screen.findByRole('button', { name: 'מסלול 1 — אוניברסיטת תל אביב' });
    for (const checkbox of screen.getAllByRole('checkbox', { name: 'להשוואה' }))
      fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'השוואת מסלולים' }));
    await screen.findByRole('heading', { name: 'משווים אפשרויות' });
    expect(screen.queryByText('כלל שאינו שייך למוסד')).toBeNull();
    const summaries = screen.getAllByText('תנאים נוספים');
    expect(summaries).toHaveLength(2);
    expect(summaries[0].closest('details')?.open).toBe(false);
    fireEvent.click(summaries[0]);
    expect(summaries[0].closest('details')?.open).toBe(true);
  });

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
    expect(screen.getByText('פסיכומטרי: 700 · סף: 680')).toBeTruthy();
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
