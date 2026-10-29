// @vitest-environment jsdom
import { FORMULA_BACKED_VERIFICATION_LEDGER } from '@/data/admissions/formulaBackedVerificationLedger';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcademicScores } from '@/types';
import { getStaticCataloguePrograms, getStaticCatalogueInstitutions } from '@/lib/catalogueStatic';
import baselineLaw from '../../docs/ui-verification/2026-10-23-requirement-tiles/baseline-law_low.json';
import qaReplay from '../../docs/admissions-verification/evidence/2026-10-29-haifa-qa-replay.json';
import type {
  AdmissionsEvaluationInput as AdmissionsEvaluationRequest,
  AdmissionsEvaluationResult,
} from '@/types/admissionsEvaluation';
import { resultLabel, studyFields } from '@/lib/studyJourney';

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
vi.mock('server-only', () => ({}));
import { evaluateAdmissionsForProgram } from '@/server/admissions/evaluator';
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

  // Replay the synthetic profile/result captured by QA on PR #318 at 7e84aff.
  it.each(
    (['results', 'detail'] as const).flatMap((surface) =>
      (
        [
          ['haifa', 'authority_unavailable', true],
          ['haifa', 'tracked_missing_rule', true],
          ['bgu', 'authority_unavailable', true],
          ['bgu', 'tracked_missing_rule', true],
          ['bgu', 'authority_unavailable', false],
          ['bgu', 'tracked_missing_rule', false],
        ] as const
      ).map(([institutionId, kind, hasSources]) => ({ surface, institutionId, kind, hasSources })),
    ),
  )(
    'H1 $surface preserves $institutionId $kind explanation and links (sources=$hasSources)',
    async ({ surface, institutionId, kind, hasSources }) => {
      const captured = institutionId === 'haifa' ? qaReplay.h1.result : qaReplay.h1.bgu.result;
      const apiResult = {
        ...captured,
        kind,
        capability: kind,
        officialUrls: hasSources ? captured.officialUrls : [],
      } as AdmissionsEvaluationResult;
      const programId = institutionId === 'haifa' ? 'haifa_psychology' : qaReplay.h1.bgu.programId;
      const program = getStaticCataloguePrograms().find((p) => p.id === programId)!;
      const institution = getStaticCatalogueInstitutions().find((i) => i.id === institutionId)!;
      state.fetchPrograms.mockResolvedValue([program]);
      state.fetchInstitutions.mockResolvedValue([institution]);
      state.evaluate.mockResolvedValue({
        reports: { [programId]: { results: [apiResult] } },
        failedDegreeIds: [],
      });
      window.sessionStorage.setItem(
        'myway_study_journey_v2',
        JSON.stringify({
          fields: [studyFields([program])[0].id],
          locations: ['all'],
          types: ['all'],
          selectedRowId: `${programId}:${institutionId}`,
          scores: {
            bagrut: { weightedAverage: qaReplay.h1.request.bagrut },
            psychometric: { overall: 700 },
          },
        }),
      );
      const { container } = render(<StudyJourney initialStep={surface} />);
      await waitFor(() =>
        expect(container.querySelector('.journey-status')?.textContent).toBe(
          resultLabel(apiResult, false, false, programId).label,
        ),
      );
      const scope = within(
        container.querySelector(
          surface === 'results' ? '.journey-result-row' : '.journey-detail',
        ) ?? container,
      );
      expect(scope.getByText(apiResult.explanation, { exact: true })).toBeTruthy();
      if (hasSources) {
        for (const source of captured.officialUrls) {
          const expected = new URL(source);
          const link = scope.getAllByRole('link').find((element) => {
            const actual = new URL(element.getAttribute('href')!, window.location.origin);
            return actual.origin === expected.origin && actual.pathname === expected.pathname;
          });
          expect(link, source).toBeTruthy();
          expect(new URL(link!.getAttribute('href')!).searchParams.get('utm_source')).toBe('myway');
        }
        expect(scope.queryByRole('link', { name: 'לאתר המוסד' })).toBeNull();
      } else {
        expect(scope.getByRole('link', { name: 'לאתר המוסד' }).getAttribute('href')).toMatch(
          /^https:\/\//,
        );
      }
    },
  );

  it.each(
    (['results', 'detail'] as const).flatMap((surface) =>
      (
        [
          ['medicine', 'tau', 'authority_unavailable'],
          ['tau_medicine', 'tau', 'authority_unavailable'],
          ['physiotherapy', 'tau', 'authority_unavailable'],
          ['colmgmt_cs', 'colman', 'authority_unavailable'],
          ['colmgmt_cs', 'colman', 'tracked_missing_rule'],
        ] as const
      ).map(([programId, institutionId, kind]) => ({ surface, programId, institutionId, kind })),
    ),
  )(
    'H1 Latin fallback on $surface for $programId ($kind) retains official links',
    async ({ surface, programId, institutionId, kind }) => {
      const program = getStaticCataloguePrograms().find((p) => p.id === programId)!;
      const institution = getStaticCatalogueInstitutions().find((i) => i.id === institutionId)!;
      const evaluation = await evaluateAdmissionsForProgram({
        program: { ...program, linkedInstitutionIds: [institutionId] },
        institutions: [institution],
        input: {
          ...qaReplay.h1.request,
          degreeId: programId,
        } as unknown as AdmissionsEvaluationRequest,
        freshnessStatesBySourceId: new Map(),
        fetcher: vi
          .fn<typeof fetch>()
          .mockRejectedValue(new Error('No live requests in H1 regression')),
        now: new Date('2026-10-29T00:00:00Z'),
      });
      // The named routes currently hit earlier Hebrew requirements/policy gates.
      // Retain the evaluator's result shape and real links; replay the existing English
      // ledger note as an unavailable API result, without inventing prose or live evidence.
      const apiResult: AdmissionsEvaluationResult = {
        ...evaluation.results[0],
        kind,
        capability: kind,
        degradationReason: undefined,
        officialUrls: evaluation.results[0].officialUrls ?? [
          FORMULA_BACKED_VERIFICATION_LEDGER.find(
            (row) => row.pairId === `${programId}__${institutionId}`,
          )!.sourceUrl,
        ],
        explanation: FORMULA_BACKED_VERIFICATION_LEDGER.find(
          (row) => row.pairId === `${programId}__${institutionId}`,
        )!.reason,
      };
      expect(apiResult.kind).toBe(kind);
      expect(apiResult.explanation).toMatch(/[a-zA-Z]/);
      expect(apiResult.officialUrls?.length).toBeGreaterThan(0);
      const generic =
        kind === 'authority_unavailable'
          ? 'נתוני הקבלה הדרושים לחישוב אינם זמינים כרגע. אפשר לבדוק ישירות באתר המוסד.'
          : 'אין כרגע חישוב קבלה מאומת למסלול הזה. אפשר לבדוק את התנאים העדכניים באתר המוסד.';

      state.fetchPrograms.mockResolvedValue([program]);
      state.fetchInstitutions.mockResolvedValue([institution]);
      state.evaluate.mockResolvedValue({
        reports: { [programId]: { results: [apiResult] } },
        failedDegreeIds: [],
      });
      window.sessionStorage.setItem(
        'myway_study_journey_v2',
        JSON.stringify({
          fields: [studyFields([program])[0].id],
          locations: ['all'],
          types: ['all'],
          selectedRowId: `${programId}:${institutionId}`,
          scores: { bagrut: { weightedAverage: 86 }, psychometric: { overall: 700 } },
        }),
      );
      const { container } = render(<StudyJourney initialStep={surface} />);
      await waitFor(() =>
        expect(container.querySelector('.journey-status')?.textContent).toBe(
          resultLabel(apiResult, false, false, programId).label,
        ),
      );
      expect(screen.getByText(generic, { exact: true })).toBeTruthy();
      expect(screen.queryByText(apiResult.explanation, { exact: true })).toBeNull();
      for (const source of apiResult.officialUrls!) {
        const expected = new URL(source);
        expect(
          screen.getAllByRole('link').some((element) => {
            const actual = new URL(element.getAttribute('href')!, window.location.origin);
            return actual.origin === expected.origin && actual.pathname === expected.pathname;
          }),
          source,
        ).toBe(true);
      }
    },
  );
  it('keeps the entered average when completing subject grades', async () => {
    render(<StudyJourney initialStep="grades-exact" />);
    await screen.findByLabelText('סוג תעודה');
    fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
    const subjects = screen
      .getAllByLabelText(/^מקצוע /)
      .filter((element) => element.tagName === 'INPUT') as HTMLInputElement[];
    for (const label of ['מתמטיקה', 'אנגלית']) {
      const index = subjects.findIndex((input) => input.value === label) + 1;
      fireEvent.change(screen.getByLabelText(`יחידות ${index}`), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText(`ציון ${index}`), { target: { value: '90' } });
    }
    fireEvent.submit(screen.getByRole('button', { name: 'המשך' }).closest('form')!);
    await waitFor(() => {
      const draft = JSON.parse(window.sessionStorage.getItem('myway_study_journey_v2')!);
      expect(draft.scores.bagrut.weightedAverage).toBe(95);
      expect(draft.scores.bagrut.subjectRecord.subjects).toHaveLength(2);
    });
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

  // Amit ruling 2026-10-25 07:30 via Jorje
  it.each([
    // Approved test update, Jorje 2026-10-29
    [95, 'ציון הקבלה שלך 95, מעל סף הזימון המשוער (92)', 'text-green-700'],
    // Approved test update, Jorje 2026-10-29
    [84.5, 'ציון הקבלה שלך 84.5, מתחת לסף הזימון המשוער (92)', 'text-slate-500'],
    // Approved test update, Jorje 2026-10-28
    // Approved test update, Jorje 2026-10-29
    [92, 'ציון הקבלה שלך 92, בסף הזימון המשוער (92)', 'text-green-700'],
    // Approved test update, Jorje 2026-10-29
    [95.125, 'ציון הקבלה שלך 95.13, מעל סף הזימון המשוער (92)', 'text-green-700'],
  ] as const)('shows one medicine comparison for sekem %s', async (score, comparison, color) => {
    const program = getStaticCataloguePrograms().find((p) => p.id === 'technion_medicine')!;
    const institution = getStaticCatalogueInstitutions().find((i) => i.id === 'technion')!;
    state.fetchPrograms.mockResolvedValue([program]);
    state.fetchInstitutions.mockResolvedValue([institution]);
    state.evaluate.mockResolvedValue({
      reports: {
        technion_medicine: {
          results: [
            {
              institution,
              linkedInstitutionId: 'technion',
              capability: 'score_only',
              kind: 'exact',
              decision: 'unknown',
              confidence: 'medium',
              score,
              scoreLabel: 'סכם',
              sourceLabel: 'סכם לרפואה',
              explanation:
                'סף זימון משוער למבחן המו"ר: 92 (הערכה). זהו סף זימון משוער בלבד, ולא סף קבלה לרפואה.',
              officialUrls: ['https://admissions.technion.ac.il/calculator/'],
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
        selectedRowId: 'technion_medicine:technion',
        scores: { bagrut: { weightedAverage: 110 }, psychometric: { overall: 720 } },
      }),
    );
    render(<StudyJourney initialStep="detail" />);
    expect(await screen.findByText('קבלה דרך מבחני מו"ר')).toBeTruthy();
    // Amit ruling 2026-10-25 08:01 via Jorje
    const chip = screen.getByText('קבלה דרך מבחני מו"ר');
    expect(chip.className).toBe('journey-status status-match');
    expect(chip.className).not.toMatch(/status-explore|violet|purple/);
    const batch = await state.evaluate.mock.results[0].value;
    expect(
      resultLabel(batch.reports.technion_medicine.results[0], false, false, program.id).group,
    ).toBe('explore');
    expect(screen.queryByText('אין הכרעת קבלה')).toBeNull();
    const line = screen.getByText(comparison, { exact: true });
    expect(line.classList.contains(color)).toBe(true);
    expect(line.className).not.toMatch(/red|rose|amber|yellow|danger|warning/);
    // Approved test update, Jorje 2026-10-29
    expect(screen.getAllByText(/ציון הקבלה שלך/)).toHaveLength(1);
    expect(screen.queryByText(/סף זימון משוער למבחן המו"ר/)).toBeNull();
    expect(screen.queryByText(/^סכם:/)).toBeNull();
    expect(screen.getByRole('button', { name: 'יצירת קשר' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'שמירה לרשימה' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'לאתר המוסד' }).getAttribute('href')).toBe(
      'https://www.technion.ac.il/?utm_source=myway&utm_medium=referral',
    );
    fireEvent.click(screen.getByRole('button', { name: 'חזרה' }));
    const listChip = await screen.findByText('קבלה דרך מבחני מו"ר');
    expect(listChip.className).toBe('journey-status status-match');
  });

  // Samuel QA A1 2026-10-25
  it.each([
    // Approved test update, Jorje 2026-10-29
    [98.9, 'ציון הקבלה שלך 98.9, מעל סף הזימון המשוער (92)', 'text-green-700', 'status-match'],
    // Approved test update, Jorje 2026-10-28
    // Approved test update, Jorje 2026-10-29
    [92, 'ציון הקבלה שלך 92, בסף הזימון המשוער (92)', 'text-green-700', 'status-match'],
    // Approved test update, Jorje 2026-10-29
    [73.9, 'ציון הקבלה שלך 73.9, מתחת לסף הזימון המשוער (92)', 'text-slate-500', 'status-match'],
  ] as const)(
    'shows one comparison directly under the medicine list chip for sekem %s',
    async (score, text, color, badge) => {
      const program = getStaticCataloguePrograms().find((p) => p.id === 'technion_medicine')!;
      const institution = getStaticCatalogueInstitutions().find((i) => i.id === 'technion')!;
      state.fetchPrograms.mockResolvedValue([program]);
      state.fetchInstitutions.mockResolvedValue([institution]);
      state.evaluate.mockResolvedValue({
        reports: {
          technion_medicine: {
            results: [
              {
                institution,
                linkedInstitutionId: 'technion',
                kind: 'exact',
                decision: 'unknown',
                score,
              },
            ],
          },
        },
        failedDegreeIds: [],
      });
      window.sessionStorage.setItem(
        'myway_study_journey_v2',
        JSON.stringify({
          fields: ['medicine'],
          locations: ['all'],
          types: ['all'],
          scores: { bagrut: { weightedAverage: 110 }, psychometric: { overall: 720 } },
        }),
      );
      render(<StudyJourney initialStep="results" />);
      const chip = await screen.findByText('קבלה דרך מבחני מו"ר');
      const row = within(chip.closest('article')!);
      const line = row.getByText(text, { exact: true });
      // Approved test update, Jorje 2026-10-29
      expect(row.getAllByText(/ציון הקבלה שלך/)).toHaveLength(1);
      // Approved test update, Jorje 2026-10-29
      expect(screen.getAllByText(/ציון הקבלה שלך/)).toHaveLength(1);
      expect(chip.nextElementSibling).toBe(line);
      expect(line.classList.contains(color)).toBe(true);
      expect(line.className).not.toMatch(/red|rose|amber|yellow|danger|warning/);
      expect(chip.className).toBe(`journey-status ${badge}`);
      expect(chip.classList.contains('status-match')).toBe(badge === 'status-match');
      expect(row.queryByText('אין הכרעת קבלה')).toBeNull();
      expect(row.queryByText(/סף זימון משוער למבחן המו"ר|סכם:|שיפור/)).toBeNull();
      fireEvent.click(row.getByRole('button', { name: /פרטים על רפואה/ }));
      const detailLine = await screen.findByText(text, { exact: true });
      // Approved test update, Jorje 2026-10-29
      expect(screen.getAllByText(/ציון הקבלה שלך/)).toHaveLength(1);
      expect(detailLine.className).toBe(line.className);
      expect(detailLine.classList.contains(color)).toBe(true);
    },
  );

  // Amit ruling 2026-10-25 08:01 via Jorje
  it('keeps Haifa pending chip in its existing no-verdict style', async () => {
    const program = getStaticCataloguePrograms().find((p) => p.id === 'haifa_sociology')!;
    const institution = getStaticCatalogueInstitutions().find((i) => i.id === 'haifa')!;
    state.fetchPrograms.mockResolvedValue([program]);
    state.fetchInstitutions.mockResolvedValue([institution]);
    state.evaluate.mockResolvedValue({
      reports: {
        haifa_sociology: {
          results: [
            {
              institution,
              linkedInstitutionId: 'haifa',
              capability: 'exact',
              kind: 'exact',
              decision: 'pending',
              score: 520,
              explanation: 'הסכם נמצא בטווח ההמתנה.',
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
        selectedRowId: 'haifa_sociology:haifa',
      }),
    );
    render(<StudyJourney initialStep="detail" />);
    const chip = await screen.findByText('אין הכרעת קבלה');
    expect(chip.className).toBe('journey-status status-explore');
    expect(chip.classList.contains('status-match')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'חזרה' }));
    const listChip = await screen.findByText('אין הכרעת קבלה');
    expect(listChip.className).toBe('journey-status status-explore');
  });

  it('preserves the medicine result explanation when no sekem is available', async () => {
    const program = getStaticCataloguePrograms().find((p) => p.id === 'technion_medicine')!;
    const institution = getStaticCatalogueInstitutions().find((i) => i.id === 'technion')!;
    const explanation = 'סף זימון משוער למבחן המו"ר: 92 (הערכה). נדרשים פרטי מקצועות הבגרות.';
    state.fetchPrograms.mockResolvedValue([program]);
    state.fetchInstitutions.mockResolvedValue([institution]);
    state.evaluate.mockResolvedValue({
      reports: {
        technion_medicine: {
          results: [
            {
              institution,
              linkedInstitutionId: 'technion',
              capability: 'needs_input',
              kind: 'needs_input',
              decision: 'unknown',
              explanation,
              requiredInputs: ['bagrut_subject_record'],
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
        selectedRowId: 'technion_medicine:technion',
      }),
    );
    render(<StudyJourney initialStep="detail" />);
    expect(await screen.findByText('חסרים פרטים לחישוב')).toBeTruthy();
    expect(screen.getByText(explanation)).toBeTruthy();
    expect(screen.queryByText('קבלה דרך מבחני מו"ר')).toBeNull();
    // Approved test update, Jorje 2026-10-29
    expect(screen.queryByText(/ציון הקבלה שלך/)).toBeNull();
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

  it.each([
    {
      estimated: true,
      estimationReason: 'הממוצע הכללי 70 משמש אומדן לממוצע המוסדי.',
      expected:
        'הערכה: חישבנו לפי הממוצע הכללי שהזנת, לא לפי ממוצע המוסד. להערכה מדויקת יותר, הזינו ציונים לפי מקצוע.',
    },
    { estimated: false, estimationReason: undefined, expected: undefined },
    { estimated: undefined, estimationReason: undefined, expected: undefined },
    {
      estimated: true,
      estimationReason: 'שנת הבגרות לא נמסרה; החישוב מניח את מחזור 2026.',
      expected:
        'הערכה: שנת הבגרות לא נמסרה; החישוב מניח את מחזור 2026. להערכה מדויקת יותר, הזינו את שנת הבחינה בפועל.',
    },
  ])(
    'discloses the actual estimate provenance in the journey detail: %j',
    async ({ estimated, estimationReason, expected }) => {
      const program = getStaticCataloguePrograms().find((p) => p.id === 'colmgmt_economics')!;
      const institution = getStaticCatalogueInstitutions().find((i) => i.id === 'colman')!;
      state.fetchPrograms.mockResolvedValue([program]);
      state.fetchInstitutions.mockResolvedValue([institution]);
      state.evaluate.mockResolvedValue({
        reports: {
          [program.id]: {
            results: [
              {
                linkedInstitutionId: institution.id,
                kind: 'manual_gate',
                decision: 'below',
                explanation: 'מסלול בגרות: הממוצע נמוך מ־85.',
                estimated,
                estimationReason,
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
          selectedRowId: `${program.id}:${institution.id}`,
          scores: { bagrut: { weightedAverage: 70 }, psychometric: { overall: 420 } },
        }),
      );
      const { container } = render(<StudyJourney initialStep="detail" />);
      await screen.findByText('מסלול בגרות: הממוצע נמוך מ־85.');
      if (expected) {
        const notice = screen.getByText(expected);
        expect(notice.getAttribute('dir')).toBe('rtl');
        expect(notice.className).toContain('text-right');
        if (estimationReason?.startsWith('שנת'))
          expect(notice.textContent).not.toContain('הממוצע הכללי');
      } else expect(container.querySelector('.admission-estimate')).toBeNull();
    },
  );

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
