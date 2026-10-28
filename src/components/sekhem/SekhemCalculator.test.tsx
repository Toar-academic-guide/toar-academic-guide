// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import SekhemCalculator from './SekhemCalculator';
import { ENQUIRY_COPY } from '@/lib/enquiries';
import type { AdmissionsBatchReport, AdmissionsRequiredInput } from '@/types/admissionsEvaluation';

vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
const offerings = [
  {
    programId: 'haifa_cs',
    programName: 'מדעי המחשב',
    institutionId: 'haifa',
    institutionName: 'אוניברסיטת חיפה',
  },
];
const response = (requiredInputs: AdmissionsRequiredInput[] = []): AdmissionsBatchReport => ({
  reports: {
    haifa_cs: {
      generatedAt: '2026-10-28',
      evaluatorVersion: 'test',
      inputDigest: 'test',
      input: { degreeId: 'haifa_cs' },
      program: { id: 'haifa_cs', name: 'מדעי המחשב' },
      results: [
        {
          institution: { id: 'haifa', name: 'אוניברסיטת חיפה', region: 'north' },
          linkedInstitutionId: 'haifa',
          kind: requiredInputs.length ? 'needs_input' : 'exact',
          capability: requiredInputs.length ? 'needs_input' : 'exact',
          decision: requiredInputs.length ? 'unknown' : 'accepted',
          requiredInputs,
          score: requiredInputs.length ? undefined : 706,
          threshold: requiredInputs.length ? undefined : 700,
          scoreLabel: 'סכם',
          confidence: 'high',
          sourceLabel: 'מקור רשמי',
          explanation: '',
          nextAction: '',
        },
      ],
    },
  } as AdmissionsBatchReport['reports'],
  failedDegreeIds: [],
});
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url) => {
    if (url === '/api/enquiries') return Response.json({ data: { received: true } });
    return Response.json({ data: response() });
  });
});
function examples() {
  fireEvent.click(screen.getByRole('button', { name: 'ערכים לדוגמה' }));
}
function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'לחשב את הסכם' }));
}

it('sends raw rows in batch mode, exposes no composite input and opens the reused enquiry for its actual pair', async () => {
  const { container } = render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
  expect(body.degreeIds).toEqual(['haifa_cs']);
  expect(body.extraInputs.bagrutSubjectRecord.subjects).toHaveLength(4);
  expect(body.extraInputs.bagrutSubjectRecord.subjects).toContainEqual({
    subjectId: 'mathematics',
    units: 5,
    grade: 90,
    assessmentKind: 'exam',
  });
  expect(body.extraInputs.haifaBagrutAverage).toBeUndefined();
  expect(JSON.stringify(body)).not.toMatch(
    /sekhem|mutam|composite|weightedScore|institution_weighted_score/i,
  );
  for (const input of container.querySelectorAll('input,select')) {
    const name = [
      input.getAttribute('name'),
      input.getAttribute('aria-label'),
      ...(input instanceof HTMLInputElement || input instanceof HTMLSelectElement
        ? Array.from(input.labels ?? []).map((label) => label.textContent)
        : []),
    ].join(' ');
    expect(name).not.toMatch(/סכם|מתואם|מצרף|ציון משוקלל/);
  }
  fireEvent.click(screen.getByRole('button', { name: 'קבלת מידע על התוכנית' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog.textContent).toContain('אוניברסיטת חיפה');
  expect(screen.getByRole('checkbox')).toHaveProperty('checked', false);
  fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.nameLabel), {
    target: { value: 'בדיקת מחשבון' },
  });
  fireEvent.change(screen.getByLabelText(ENQUIRY_COPY.phoneLabel), {
    target: { value: '0501234567' },
  });
  fireEvent.submit(dialog.querySelector('form')!);
  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/enquiries')).toBe(true),
  );
  const enquiry = JSON.parse(
    String(fetchMock.mock.calls.find(([url]) => url === '/api/enquiries')?.[1]?.body),
  );
  expect(enquiry).toMatchObject({
    programId: 'haifa_cs',
    institutionId: 'haifa',
    consent: true,
    prepConsent: false,
  });
});

it('shows optional Haifa fields only when requested, then removes them and their old overrides automatically', async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json({ data: response(['haifa_bagrut_average', 'haifa_hebrew_qualification']) }),
  );
  render(<SekhemCalculator offerings={offerings} />);
  expect(screen.queryByLabelText('ממוצע בגרות בחיפה')).toBeNull();
  examples();
  submit();
  const average = await screen.findByLabelText('ממוצע בגרות בחיפה');
  expect(average.hasAttribute('required')).toBe(false);
  fireEvent.change(average, { target: { value: '105' } });
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  expect(screen.queryByLabelText('ממוצע בגרות בחיפה')).toBeNull();
  expect(screen.queryByLabelText('הבסיס לעמידה בדרישת העברית בחיפה')).toBeNull();
  submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).extraInputs.haifaBagrutAverage).toBe(
    105,
  );
  expect(
    JSON.parse(String(fetchMock.mock.calls[2][1]?.body)).extraInputs.haifaBagrutAverage,
  ).toBeUndefined();
});

it('invalidates old results when grades change and reports request failure honestly', async () => {
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  fireEvent.change(screen.getByLabelText('ציון 1'), { target: { value: '80' } });
  expect(screen.queryByText('הציונים עומדים בתנאי הקבלה')).toBeNull();
  fetchMock.mockRejectedValueOnce(new Error('offline'));
  submit();
  expect((await screen.findByRole('alert')).textContent).toContain('לא הצלחנו לחשב כרגע');
});

it('serializes a response-requested Haifa yes/no answer as a boolean', async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json({ data: response(['haifa_ot_unjustified_absence']) }),
  );
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  fireEvent.change(
    await screen.findByLabelText('היעדרות מריאיון בריפוי בעיסוק בחיפה ללא הצדקה וללא הודעה'),
    { target: { value: 'false' } },
  );
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  expect(
    JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).extraInputs.haifaOtUnjustifiedAbsence,
  ).toBe(false);
});

it('ignores an in-flight response after the student changes a grade', async () => {
  let finish!: (value: Response) => void;
  fetchMock.mockReturnValueOnce(
    new Promise<Response>((resolve) => {
      finish = resolve;
    }),
  );
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  fireEvent.change(screen.getByLabelText('ציון 1'), { target: { value: '80' } });
  await act(async () => finish(Response.json({ data: response() })));
  expect(screen.queryByText('הציונים עומדים בתנאי הקבלה')).toBeNull();
  expect(screen.queryByRole('button', { name: 'מחשבים…' })).toBeNull();
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  const body = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
  expect(
    body.extraInputs.bagrutSubjectRecord.subjects.find(
      (row: { subjectId: string }) => row.subjectId === 'mathematics',
    ).grade,
  ).toBe(80);
});

it('batches at fifty, preserves completed results, and retries failed programmes only after an explicit action', async () => {
  const many = Array.from({ length: 51 }, (_, index) => ({
    ...offerings[0],
    programId: `program_${index}`,
    programName: `תוכנית ${index}`,
  }));
  let attempt = 0;
  fetchMock.mockImplementation(async (url, init) => {
    if (url === '/api/enquiries') return Response.json({ data: { received: true } });
    const { degreeIds } = JSON.parse(String(init?.body)) as { degreeIds: string[] };
    attempt++;
    if (attempt === 2) return Response.json({ data: { reports: {}, failedDegreeIds: degreeIds } });
    if (attempt === 3) return Response.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 });
    const reports = Object.fromEntries(
      degreeIds.map((id) => [
        id,
        { ...response().reports.haifa_cs, input: { degreeId: id }, program: { id, name: id } },
      ]),
    );
    return Response.json({ data: { reports, failedDegreeIds: [] } });
  });
  render(<SekhemCalculator offerings={many} />);
  examples();
  submit();
  await screen.findByText('חלק מהתוכניות לא חושבו. אפשר לנסות שוב.');
  expect(screen.getByText('הציונים עומדים בתנאי הקבלה')).toBeTruthy();
  expect(
    fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).degreeIds.length),
  ).toEqual([50, 1]);
  fireEvent.click(screen.getByRole('button', { name: 'לנסות שוב' }));
  await screen.findByText('לא הצלחנו לחשב כרגע. אפשר לנסות שוב.');
  expect(screen.getByText('הציונים עומדים בתנאי הקבלה')).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(3);
  fireEvent.click(screen.getByRole('button', { name: 'לנסות שוב' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(
    screen.getByRole('combobox', { name: 'בחירת תוכנית' }).querySelectorAll('option'),
  ).toHaveLength(51);
  for (const [, init] of fetchMock.mock.calls.slice(1))
    expect(JSON.parse(String(init?.body)).degreeIds).toEqual(['program_50']);
});

it('keeps an HTTP service failure visible and retries the failed programmes', async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json({ error: { code: 'UNAVAILABLE' } }, { status: 503 }),
  );
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  expect((await screen.findByRole('alert')).textContent).toBe(
    'לא הצלחנו לחשב כרגע. אפשר לנסות שוב.',
  );
  fireEvent.click(screen.getByRole('button', { name: 'לנסות שוב' }));
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).degreeIds)).toEqual([
    ['haifa_cs'],
    ['haifa_cs'],
  ]);
});
