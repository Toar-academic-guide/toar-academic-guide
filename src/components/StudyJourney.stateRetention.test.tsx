// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AcademicScores, BagrutSubjectRecord } from '@/types';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { academicBagrutAverage } from '@/lib/admissionsEvaluationProfile';
import { overallBagrutAverage } from '@/lib/bagrutSubjectRecord';
import { subjectIdForWizardLabel } from '@/utils/bagrutSubjectRecord';

const state = vi.hoisted(() => ({
  programs: vi.fn(),
  institutions: vi.fn(),
  evaluate: vi.fn(),
  scores: {} as AcademicScores,
  user: null as null | { id: string },
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/calculator',
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: state.user, loading: false }) }));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    hydrated: true,
    initialProfileStatus: 'ready',
    profile: { academicScores: state.scores },
    updateProfile: vi.fn().mockResolvedValue(true),
  }),
}));
vi.mock('@/lib/catalogueClient', () => ({
  fetchCataloguePrograms: state.programs,
  fetchCatalogueInstitutions: state.institutions,
}));
vi.mock('@/lib/admissionsEvaluationClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/admissionsEvaluationClient')>()),
  fetchAdmissionsBatch: state.evaluate,
}));

let StudyJourney: typeof import('./StudyJourney').default;
const key = 'myway_study_journey_v2';
const programs = getStaticCataloguePrograms().filter((program) =>
  ['tau_cs', 'tau_law'].includes(program.id),
);
const record: BagrutSubjectRecord = {
  schemaVersion: 2,
  sector: 'jewish',
  certificateType: 'internal',
  complete: false,
  subjects: [
    'bible',
    'civics',
    'english',
    'hebrew_expression',
    'history',
    'literature',
    'mathematics',
    'physics',
    'chemistry',
  ]
    .map((subjectId, index) => ({
      subjectId,
      units: index % 2 ? 3 : 5,
      grade: 70 + index,
      assessmentKind: 'exam' as const,
    }))
    .sort((a, b) => a.subjectId.localeCompare(b.subjectId)),
};
function seed(scores: AcademicScores = {}, gradeMode?: 'quick' | 'exact' | 'none') {
  sessionStorage.setItem(
    key,
    JSON.stringify({
      fields: ['cs', 'law'],
      fieldLabels: { cs: 'מדעי המחשב', law: 'משפטים' },
      locations: ['all'],
      types: ['all'],
      scores,
      gradeMode,
      psyMode: 'none',
    }),
  );
}
const stored = () =>
  JSON.parse(sessionStorage.getItem(key)!) as {
    scores: AcademicScores;
    gradeMode: string;
    fieldLabels: Record<string, string>;
  };
const back = () => fireEvent.click(screen.getByRole('button', { name: 'חזרה' }));
const submit = () =>
  fireEvent.submit(screen.getByRole('button', { name: 'המשך' }).closest('form')!);
const editBagrut = () =>
  fireEvent.click(
    within(screen.getByText('בגרות').closest('.journey-review > div')!).getByRole('button', {
      name: 'עריכה',
    }),
  );
const withoutPsy = () =>
  fireEvent.click(screen.getByRole('button', { name: 'בלי פסיכומטרי כרגע' }));
async function expectRecord() {
  expect((await screen.findByLabelText('סוג תעודה')) as HTMLSelectElement).toHaveProperty(
    'value',
    'internal',
  );
  const subjects = screen
    .getAllByLabelText(/^מקצוע /)
    .filter((element) => element.tagName === 'INPUT') as HTMLInputElement[];
  expect(subjects.map((input) => subjectIdForWizardLabel(input.value))).toEqual(
    record.subjects.map((subject) => subject.subjectId),
  );
  record.subjects.forEach((subject, index) => {
    expect(screen.getByLabelText(`יחידות ${index + 1}`)).toHaveProperty(
      'value',
      String(subject.units),
    );
    expect(screen.getByLabelText(`ציון ${index + 1}`)).toHaveProperty(
      'value',
      String(subject.grade),
    );
  });
}

function fillNineSubjects() {
  fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
  for (const [index, label] of [
    [7, 'פיזיקה'],
    [8, 'כימיה'],
  ] as const) {
    fireEvent.click(screen.getByRole('button', { name: /הוספת מקצוע/ }));
    fireEvent.change(
      screen
        .getAllByLabelText(`מקצוע ${index + 1}`)
        .find((element) => element.tagName === 'INPUT')!,
      {
        target: { value: label },
      },
    );
  }
  const subjects = screen
    .getAllByLabelText(/^מקצוע /)
    .filter((element) => element.tagName === 'INPUT') as HTMLInputElement[];
  subjects.forEach((input, index) => {
    const subject = record.subjects.find(
      (entry) => entry.subjectId === subjectIdForWizardLabel(input.value),
    )!;
    fireEvent.change(screen.getByLabelText(`יחידות ${index + 1}`), {
      target: { value: String(subject.units) },
    });
    fireEvent.change(screen.getByLabelText(`ציון ${index + 1}`), {
      target: { value: String(subject.grade) },
    });
  });
}

beforeEach(async () => {
  vi.resetModules(); // Each test starts with a cold module-level catalogue cache.
  StudyJourney = (await import('./StudyJourney')).default;
  state.scores = {};
  state.user = null;
  state.programs.mockReset().mockResolvedValue(programs);
  state.institutions.mockReset().mockResolvedValue(getStaticCatalogueInstitutions());
  state.evaluate.mockReset().mockResolvedValue({ reports: {}, failedDegreeIds: [] });
  window.history.replaceState(null, '', '/app/calculator');
  sessionStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

describe('summary Bagrut editing and exclusive submissions', () => {
  it('returns directly to every submitted subject, unit, grade and certificate and preserves the round-trip', async () => {
    seed();
    render(<StudyJourney initialStep="grades-exact" />);
    await screen.findByLabelText('סוג תעודה');
    fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
    fillNineSubjects();
    submit();
    withoutPsy();
    const summary = document.querySelector('.journey-review')!.textContent;
    editBagrut();
    await expectRecord();
    submit();
    withoutPsy();
    expect(document.querySelector('.journey-review')!.textContent).toBe(summary);
    expect(stored().scores.bagrut?.subjectRecord).toEqual(record);
  });

  it('restores the exact editor on remount even when its dynamic component is already loaded', async () => {
    seed();
    const first = render(<StudyJourney initialStep="grades-exact" />);
    await screen.findByLabelText('סוג תעודה');
    first.unmount();
    seed({ bagrut: { subjectRecord: record } }, 'exact');
    render(<StudyJourney initialStep="grades-exact" />);
    await expectRecord();
  });

  it('keeps committed subjects and mode through an unsubmitted average detour', async () => {
    seed({ bagrut: { subjectRecord: record } }, 'exact');
    render(<StudyJourney initialStep="review" />);
    editBagrut();
    await expectRecord();
    back();
    fireEvent.click(screen.getByRole('button', { name: /יש לי ממוצע בגרות/ }));
    expect(screen.getByLabelText('ממוצע בגרות')).toHaveProperty('value', '');
    fireEvent.change(screen.getByLabelText('ממוצע בגרות'), { target: { value: '95' } });
    expect(stored().gradeMode).toBe('exact');
    expect(stored().scores.bagrut).toEqual({ subjectRecord: record });
    back();
    fireEvent.click(screen.getByRole('button', { name: /יש לי ציונים לפי מקצוע/ }));
    await expectRecord();
  });

  it('drops a submitted quick average when nine subjects are submitted and evaluates the subject estimate', async () => {
    seed();
    render(<StudyJourney initialStep="grade-mode" />);
    fireEvent.click(screen.getByRole('button', { name: /יש לי ממוצע בגרות/ }));
    fireEvent.change(screen.getByLabelText('ממוצע בגרות'), { target: { value: '110' } });
    submit();
    withoutPsy();
    expect(stored().scores.bagrut).toEqual({ weightedAverage: 110 });
    editBagrut();
    expect(screen.getByLabelText('ממוצע בגרות')).toHaveProperty('value', '110');
    back();
    fireEvent.click(screen.getByRole('button', { name: /יש לי ציונים לפי מקצוע/ }));
    await screen.findByLabelText('סוג תעודה');
    fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
    expect(stored().gradeMode).toBe('quick');
    expect(stored().scores.bagrut).toEqual({ weightedAverage: 110 });
    fillNineSubjects();
    submit();
    withoutPsy();
    expect(stored().gradeMode).toBe('exact');
    expect(stored().scores.bagrut?.weightedAverage).toBeUndefined();
    expect(stored().scores.bagrut?.subjectRecord).toEqual(record);
    expect(academicBagrutAverage(stored().scores)).toBe(overallBagrutAverage(record));
    expect(screen.getByText('9 מקצועות')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'לגלות את האפשרויות שלי' }));
    await waitFor(() => expect(state.evaluate).toHaveBeenCalled());
    for (const [input] of state.evaluate.mock.calls) {
      expect(input.bagrut).toBeUndefined();
      expect(input.extraInputs?.bagrutSubjectRecord).toEqual(record);
    }
    // Exercise the actual client serialization, including its estimated flag.
    const client = await vi.importActual<typeof import('@/lib/admissionsEvaluationClient')>(
      '@/lib/admissionsEvaluationClient',
    );
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { reports: {}, failedDegreeIds: [] } })),
      );
    await client.fetchAdmissionsBatch(state.evaluate.mock.calls[0][0]);
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toMatchObject({
      bagrut: overallBagrutAverage(record),
      bagrutAverageEstimated: true,
    });
  });

  it('drops subjects only when a quick average is submitted and evaluates 95', async () => {
    seed({ bagrut: { subjectRecord: record } }, 'exact');
    render(<StudyJourney initialStep="grades-exact" />);
    await expectRecord();
    submit();
    withoutPsy();
    editBagrut();
    back();
    fireEvent.click(screen.getByRole('button', { name: /יש לי ממוצע בגרות/ }));
    fireEvent.change(screen.getByLabelText('ממוצע בגרות'), { target: { value: '95' } });
    expect(stored().scores.bagrut?.subjectRecord).toEqual(record);
    submit();
    withoutPsy();
    expect(stored().gradeMode).toBe('quick');
    expect(stored().scores.bagrut).toEqual({ weightedAverage: 95 });
    expect(screen.getByText('ממוצע שהזנת: 95')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'לגלות את האפשרויות שלי' }));
    await waitFor(() => expect(state.evaluate).toHaveBeenCalled());
    expect(state.evaluate).toHaveBeenLastCalledWith(expect.objectContaining({ bagrut: 95 }));
    expect(state.evaluate.mock.calls[0][0].extraInputs?.bagrutSubjectRecord).toBeUndefined();
  });

  it.each(['quick', 'exact'] as const)(
    'follows %s mode for legacy coexisting scores without rewriting the imported profile',
    async (mode) => {
      const scores = { bagrut: { weightedAverage: 110, subjectRecord: record } };
      seed(scores, mode);
      render(<StudyJourney initialStep="review" />);
      expect(screen.getByText(mode === 'quick' ? 'ממוצע שהזנת: 110' : '9 מקצועות')).toBeTruthy();
      expect(screen.getByText('הממוצע של כל מוסד מופיע בתוצאות').className).toBe('journey-helper');
      expect(stored().scores).toEqual(scores);
      fireEvent.click(screen.getByRole('button', { name: 'לגלות את האפשרויות שלי' }));
      await waitFor(() => expect(state.evaluate).toHaveBeenCalled());
      const input = state.evaluate.mock.calls[0][0];
      expect(input.bagrut).toBe(mode === 'quick' ? 110 : undefined);
      expect(input.extraInputs?.bagrutSubjectRecord).toEqual(mode === 'exact' ? record : undefined);
    },
  );

  it('evaluates imported coexisting account scores on the exact journey path without rewriting the profile', async () => {
    seed();
    state.user = { id: 'test-account' };
    state.scores = { bagrut: { weightedAverage: 110, subjectRecord: record } };
    render(<StudyJourney initialStep="review" />);
    expect(screen.getByText('9 מקצועות')).toBeTruthy();
    expect(stored().scores).toEqual(state.scores);
    fireEvent.click(screen.getByRole('button', { name: 'לגלות את האפשרויות שלי' }));
    await waitFor(() => expect(state.evaluate).toHaveBeenCalled());
    expect(state.evaluate.mock.calls[0][0]).toMatchObject({
      bagrut: undefined,
      extraInputs: { bagrutSubjectRecord: record },
    });
    expect(state.scores.bagrut?.weightedAverage).toBe(110);
    expect(stored().scores).toEqual(state.scores);
  });

  it('keeps the explicit no-grades choice destructive', () => {
    seed({ bagrut: { subjectRecord: record } }, 'exact');
    render(<StudyJourney initialStep="grade-mode" />);
    fireEvent.click(screen.getByRole('button', { name: /אין לי כרגע ציוני בגרות/ }));
    expect(stored().scores.bagrut).toBeUndefined();
    expect(stored().gradeMode).toBe('none');
    withoutPsy();
    expect(screen.getAllByText('ללא ציון כרגע')).toHaveLength(2);
  });
});

describe('saved field selection before paint', () => {
  it('renders both saved field chips synchronously while a cold catalogue fetch is pending', () => {
    seed();
    state.programs.mockReturnValue(new Promise(() => {}));
    const { container } = render(<StudyJourney initialStep="subjects" />);
    const selected = container.querySelectorAll('button[aria-pressed="true"]');
    expect([...selected].map((chip) => chip.textContent)).toEqual(['מדעי המחשב', 'משפטים']);
  });

  it('reuses the homepage catalogue on remount without a loading state while revalidating', async () => {
    seed();
    const home = render(<StudyJourney />);
    await act(async () => {});
    home.unmount();
    state.programs.mockReturnValue(new Promise(() => {}));
    const { container } = render(<StudyJourney initialStep="subjects" />);
    for (const name of ['מדעי המחשב', 'משפטים']) {
      expect(
        [...container.querySelectorAll('button[aria-pressed="true"]')].some(
          (chip) => chip.textContent === name,
        ),
      ).toBe(true);
    }
    expect(screen.queryByText('טוענים מסלולים…')).toBeNull();
    expect(state.programs).toHaveBeenCalledTimes(2);
  });

  it('retains cached selections on a failed background refresh and keeps retry working', async () => {
    seed();
    const home = render(<StudyJourney />);
    await act(async () => {});
    home.unmount();
    state.programs.mockRejectedValueOnce(new Error('temporary catalogue failure'));
    render(<StudyJourney initialStep="subjects" />);
    await screen.findByRole('alert');
    expect(screen.queryByText('טוענים מסלולים…')).toBeNull();
    for (const name of ['מדעי המחשב', 'משפטים']) {
      expect(
        screen
          .getAllByRole('button', { name })
          .every((chip) => chip.getAttribute('aria-pressed') === 'true'),
      ).toBe(true);
    }
    fireEvent.click(screen.getByRole('button', { name: 'לנסות שוב' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(state.programs).toHaveBeenCalledTimes(3);
  });

  it('saves selected catalogue labels for a subsequent cold load and drops stale labels after loading', async () => {
    seed();
    sessionStorage.setItem(
      key,
      JSON.stringify({
        ...JSON.parse(sessionStorage.getItem(key)!),
        fieldLabels: { cs: 'שם קודם', law: 'משפטים', missing: 'תחום ישן' },
      }),
    );
    render(<StudyJourney initialStep="subjects" />);
    await waitFor(() => expect(stored().fieldLabels).toEqual({ cs: 'מדעי המחשב', law: 'משפטים' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'מדעי המחשב' })[0]);
    expect(stored().fieldLabels).toEqual({ law: 'משפטים' });
  });

  it('restores the hash step synchronously and ignores malformed labels without discarding scores', () => {
    seed({ bagrut: { weightedAverage: 110 } }, 'quick');
    sessionStorage.setItem(
      key,
      JSON.stringify({
        ...JSON.parse(sessionStorage.getItem(key)!),
        fieldLabels: { cs: 42, law: 'משפטים' },
      }),
    );
    window.history.replaceState(null, '', '/app/calculator#review');
    render(<StudyJourney initialStep="subjects" />);
    expect(screen.getByText('ממוצע שהזנת: 110')).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: 'חיפוש תחום לימודים' })).toBeNull();
  });
});

describe('unsubmitted per-subject work survives refresh', () => {
  const field = (label: string) => screen.getByLabelText(label, { selector: 'input' });
  const rowNumber = (label: string) =>
    (
      screen
        .getAllByLabelText(/^מקצוע /)
        .filter((element) => element.tagName === 'INPUT') as HTMLInputElement[]
    ).findIndex((input) => input.value === label) + 1;
  const buffer = () => JSON.parse(sessionStorage.getItem(key)!).exactInProgress;
  const editRows = () => {
    fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
    for (const [label, units, grade] of [
      ['אנגלית', '5', '95'],
      ['מתמטיקה', '4', '88'],
    ]) {
      const index = rowNumber(label);
      fireEvent.change(field(`יחידות ${index}`), { target: { value: units } });
      fireEvent.change(field(`ציון ${index}`), { target: { value: grade } });
    }
  };
  const expectEdits = () => {
    expect(screen.getByLabelText('סוג תעודה')).toHaveProperty('value', 'internal');
    for (const [label, units, grade] of [
      ['אנגלית', '5', '95'],
      ['מתמטיקה', '4', '88'],
    ]) {
      const index = rowNumber(label);
      expect(field(`יחידות ${index}`)).toHaveProperty('value', units);
      expect(field(`ציון ${index}`)).toHaveProperty('value', grade);
    }
  };

  it.each([false, true])(
    'restores every edit immediately after the last keystroke (hash restore: %s)',
    async (hashRestore) => {
      seed();
      const first = render(<StudyJourney initialStep="grades-exact" />);
      await screen.findByLabelText('סוג תעודה');
      editRows();
      // No timer or await between the last edit and the simulated reload.
      fireEvent(window, new Event('pagehide'));
      first.unmount();
      if (hashRestore) window.history.replaceState(null, '', '/app/calculator#grades-exact');
      render(<StudyJourney initialStep={hashRestore ? 'subjects' : 'grades-exact'} />);
      await screen.findByLabelText('סוג תעודה');
      expectEdits();
      expect(stored().scores).toEqual({});
      expect(buffer()).toMatchObject({ certificate: 'internal', imported: false, reviewed: false });
    },
  );

  it('prefers unsubmitted edits over the committed exact record without changing committed scores', async () => {
    seed({ bagrut: { subjectRecord: record } }, 'exact');
    const first = render(<StudyJourney initialStep="grades-exact" />);
    await screen.findByLabelText('סוג תעודה');
    editRows();
    first.unmount();
    render(<StudyJourney initialStep="grades-exact" />);
    await screen.findByLabelText('סוג תעודה');
    expectEdits();
    expect(stored().scores.bagrut).toEqual({ subjectRecord: record });
  });

  it('retains quick 110 for summary and evaluation while restoring unsubmitted subject work', async () => {
    seed({ bagrut: { weightedAverage: 110 } }, 'quick');
    const first = render(<StudyJourney initialStep="grade-mode" />);
    fireEvent.click(screen.getByRole('button', { name: /יש לי ציונים לפי מקצוע/ }));
    await screen.findByLabelText('סוג תעודה');
    editRows();
    first.unmount();
    render(<StudyJourney initialStep="subjects" />);
    await screen.findByLabelText('סוג תעודה');
    expectEdits();
    expect(stored().scores.bagrut).toEqual({ weightedAverage: 110 });
    expect(stored().gradeMode).toBe('quick');
    act(() => {
      window.history.replaceState(null, '', '/app/calculator#review');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByText('ממוצע שהזנת: 110')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'לגלות את האפשרויות שלי' }));
    await waitFor(() => expect(state.evaluate).toHaveBeenCalled());
    expect(state.evaluate).toHaveBeenLastCalledWith(expect.objectContaining({ bagrut: 110 }));
    expect(state.evaluate.mock.calls[0][0].extraInputs?.bagrutSubjectRecord).toBeUndefined();
    expect(buffer()).toBeDefined();
  });

  it.each(['exact', 'quick', 'none'] as const)(
    'clears the buffer on %s submission without mixing the committed paths',
    async (mode) => {
      seed({ bagrut: { weightedAverage: 110 } }, 'quick');
      const first = render(<StudyJourney initialStep="grades-exact" />);
      await screen.findByLabelText('סוג תעודה');
      editRows();
      expect(buffer()).toBeDefined();
      first.unmount();
      render(<StudyJourney initialStep="grades-exact" />);
      await screen.findByLabelText('סוג תעודה');
      expectEdits();
      if (mode === 'exact') {
        submit();
        expect(stored().scores.bagrut?.weightedAverage).toBeUndefined();
        expect(stored().scores.bagrut?.subjectRecord?.subjects).toEqual([
          { subjectId: 'english', units: 5, grade: 95, assessmentKind: 'exam' },
          { subjectId: 'mathematics', units: 4, grade: 88, assessmentKind: 'exam' },
        ]);
      } else {
        back();
        if (mode === 'quick') {
          fireEvent.click(screen.getByRole('button', { name: /יש לי ממוצע בגרות/ }));
          fireEvent.change(screen.getByLabelText('ממוצע בגרות'), { target: { value: '95' } });
          submit();
          expect(stored().scores.bagrut).toEqual({ weightedAverage: 95 });
        } else {
          fireEvent.click(screen.getByRole('button', { name: /אין לי כרגע ציוני בגרות/ }));
          expect(stored().scores.bagrut).toBeUndefined();
        }
      }
      expect(buffer()).toBeUndefined();
    },
  );

  it('restores sector, certificate, complete, assessments and PDF review flags without storing a file', async () => {
    seed();
    const first = render(<StudyJourney initialStep="grades-exact" />);
    await screen.findByLabelText('סוג תעודה');
    fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'ערבי' } });
    editRows();
    fireEvent.click(screen.getByLabelText('הזנתי את כל המקצועות שמופיעים בתעודה'));
    fireEvent.change(screen.getByLabelText('אנגלית', { selector: 'select' }), {
      target: { value: 'combined' },
    });
    first.unmount();
    const saved = JSON.parse(sessionStorage.getItem(key)!);
    expect(saved.exactInProgress).toBeDefined();
    saved.exactInProgress = {
      ...saved.exactInProgress,
      imported: true,
      reviewed: false,
      file: { name: 'never-persist.pdf' },
    };
    sessionStorage.setItem(key, JSON.stringify(saved));
    render(<StudyJourney initialStep="grades-exact" />);
    await screen.findByLabelText('סוג תעודה');
    expectEdits();
    expect(screen.getByLabelText('מגזר')).toHaveProperty('value', 'ערבי');
    expect(screen.getByLabelText('הזנתי את כל המקצועות שמופיעים בתעודה')).toHaveProperty(
      'checked',
      true,
    );
    expect(screen.getByLabelText('אנגלית', { selector: 'select' })).toHaveProperty(
      'value',
      'combined',
    );
    const reviewed = screen.getByLabelText(
      'בדקתי את הציונים שזוהו מול התעודה ותיקנתי או השלמתי את הנדרש',
    );
    expect(reviewed).toHaveProperty('checked', false);
    expect(buffer()).not.toHaveProperty('file');
    fireEvent.click(reviewed);
    expect(buffer().reviewed).toBe(true);
  });

  it.each([
    'corrupt',
    { sector: 'לא מגזר', certificate: 'internal', complete: false, rows: [] },
    { sector: 'יהודי', certificate: 'invalid', complete: false, rows: [] },
    {
      sector: 'יהודי',
      certificate: 'internal',
      complete: false,
      rows: [{ label: 'אנגלית', units: {}, grade: 95 }],
    },
    {
      sector: 'יהודי',
      certificate: 'internal',
      complete: false,
      rows: [{ label: 'אנגלית', units: 5, grade: 95, assessmentKind: 'invalid' }],
    },
  ])(
    'ignores a corrupt buffer and keeps the submitted quick path (%j)',
    async (exactInProgress) => {
      seed({ bagrut: { weightedAverage: 110 } }, 'quick');
      sessionStorage.setItem(
        key,
        JSON.stringify({ ...JSON.parse(sessionStorage.getItem(key)!), exactInProgress }),
      );
      render(<StudyJourney initialStep="grades-exact" />);
      await screen.findByLabelText('סוג תעודה');
      expect(screen.getByLabelText('סוג תעודה')).toHaveProperty('value', '');
      expect(field(`יחידות ${rowNumber('אנגלית')}`)).toHaveProperty('value', '3');
      expect(field(`ציון ${rowNumber('אנגלית')}`)).toHaveProperty('value', '');
      expect(stored().scores.bagrut).toEqual({ weightedAverage: 110 });
    },
  );
});
