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
  sessionStorage.clear();
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

it.each([true, false])(
  'focuses a requested subject grade, adding its row when absent (existing=%s)',
  async (existing) => {
    const source = response(['physics_grade']).reports.haifa_cs;
    const row = {
      ...source.results[0],
      institution: { id: 'tau', name: 'אוניברסיטת תל אביב', region: 'center' },
      linkedInstitutionId: 'tau',
      kind: 'needs_input',
      capability: 'needs_input',
      decision: 'accepted',
      scoreAssessment: 'meets_threshold',
      threshold: 600,
    };
    fetchMock.mockResolvedValueOnce(
      Response.json({
        data: {
          reports: {
            tau_ee: {
              ...source,
              input: { degreeId: 'tau_ee' },
              program: { id: 'tau_ee', name: 'הנדסת חשמל' },
              results: [row],
            },
          },
          failedDegreeIds: [],
        },
      }),
    );
    render(
      <SekhemCalculator
        offerings={[
          {
            programId: 'tau_ee',
            programName: 'הנדסת חשמל',
            institutionId: 'tau',
            institutionName: 'אוניברסיטת תל אביב',
          },
        ]}
      />,
    );
    examples();
    if (!existing) fireEvent.click(screen.getByRole('button', { name: 'הסרת מקצוע 8' }));
    submit();
    fireEvent.click(await screen.findByRole('button', { name: 'פיזיקה' }));
    const index = existing ? 8 : 9;
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText(`ציון ${index}`)),
    );
    expect(screen.getByLabelText(`מקצוע ${index}`)).toHaveProperty('value', 'פיזיקה');
    expect(screen.getAllByRole('button', { name: /^הסרת מקצוע / })).toHaveLength(9);
    expect(fetchMock.mock.calls.every(([url]) => url === '/api/admissions/evaluate')).toBe(true);
  },
);

it('fills a complete nine-subject example certificate and sends every raw subject and PET section', async () => {
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  const subjects = [
    ['מתמטיקה', 'mathematics', 5, 92],
    ['אנגלית', 'english', 5, 95],
    ['הבעה עברית', 'hebrew_expression', 2, 88],
    ['תנ״ך', 'bible', 2, 85],
    ['ספרות', 'literature', 2, 90],
    ['היסטוריה / תע״י', 'history', 2, 87],
    ['אזרחות', 'civics', 2, 93],
    ['פיזיקה', 'physics', 5, 90],
    ['מדעי המחשב', 'computer_science', 5, 94],
  ] as const;
  expect(screen.getAllByRole('button', { name: /^הסרת מקצוע / })).toHaveLength(9);
  for (const [index, [label, , units, grade]] of subjects.entries()) {
    expect(screen.getByLabelText(`מקצוע ${index + 1}`)).toHaveProperty('value', label);
    expect(screen.getByLabelText(`יחידות ${index + 1}`)).toHaveProperty('value', String(units));
    expect(screen.getByLabelText(`ציון ${index + 1}`)).toHaveProperty('value', String(grade));
  }
  expect(screen.getByLabelText(/פסיכומטרי — ציון כללי/)).toHaveProperty('value', '700');
  for (const [label, value] of [
    ['מילולי', '130'],
    ['כמותי', '140'],
    ['אנגלית', '135'],
  ])
    expect(screen.getByLabelText(label)).toHaveProperty('value', value);
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
  expect(body.psychometric).toBe(700);
  expect(body.extraInputs).toMatchObject({
    psychometricVerbal: 130,
    psychometricMath: 140,
    psychometricEnglish: 135,
  });
  expect(body.extraInputs.bagrutSubjectRecord.subjects).toEqual(
    subjects
      .map(([, subjectId, units, grade]) => ({
        subjectId,
        units,
        grade,
        assessmentKind: 'exam',
      }))
      .sort((a, b) => a.subjectId.localeCompare(b.subjectId)),
  );
  expect(fetchMock.mock.calls.every(([url]) => url === '/api/admissions/evaluate')).toBe(true);
});

it('sends raw rows in batch mode, exposes no composite input and opens the reused enquiry for its actual pair', async () => {
  const { container } = render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
  expect(body.degreeIds).toEqual(['haifa_cs']);
  expect(body.extraInputs.bagrutSubjectRecord.subjects).toHaveLength(9);
  expect(body.extraInputs.bagrutSubjectRecord.subjects).toContainEqual({
    subjectId: 'mathematics',
    units: 5,
    grade: 92,
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

it('qualifies programme options with institution names without changing values or order', () => {
  const choices = [
    offerings[0],
    {
      ...offerings[0],
      programId: 'biu_cs',
      institutionId: 'biu',
      institutionName: 'אוניברסיטת בר-אילן',
    },
    { ...offerings[0], programId: 'other', institutionId: 'other', institutionName: 'מוסד אחר' },
    offerings[0],
  ];
  render(<SekhemCalculator offerings={choices} />);
  expect(
    Array.from(screen.getByLabelText('תוכנית לימודים').querySelectorAll('option'), (option) => [
      option.value,
      option.textContent,
    ]),
  ).toEqual([
    ['', 'כל התוכניות'],
    ['haifa_cs', 'מדעי המחשב · חיפה'],
    ['biu_cs', 'מדעי המחשב · בר־אילן'],
    ['other', 'מדעי המחשב · מוסד אחר'],
  ]);
});

it('restores the complete draft and last results after remount', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ data: response(['haifa_bagrut_average']) }));
  const view = render(<SekhemCalculator offerings={offerings} />);
  examples();
  fireEvent.change(screen.getByLabelText('יחידות 1'), { target: { value: '4' } });
  fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'ערבי' } });
  fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
  fireEvent.change(screen.getByLabelText('תוכנית לימודים'), { target: { value: 'haifa_cs' } });
  submit();
  fireEvent.change(await screen.findByLabelText('ממוצע בגרות בחיפה'), { target: { value: '104' } });
  fetchMock.mockResolvedValueOnce(Response.json({ data: response(['haifa_bagrut_average']) }));
  submit();
  await screen.findByTestId('institution-haifa');
  act(() => window.dispatchEvent(new Event('pagehide')));
  view.unmount();
  render(<SekhemCalculator offerings={offerings} />);
  expect(screen.getByLabelText('ציון 1')).toHaveProperty('value', '92');
  expect(screen.getByLabelText('יחידות 1')).toHaveProperty('value', '4');
  expect(screen.getByLabelText('מגזר')).toHaveProperty('value', 'ערבי');
  expect(screen.getByLabelText('סוג תעודה')).toHaveProperty('value', 'internal');
  expect(screen.getByLabelText('תוכנית לימודים')).toHaveProperty('value', 'haifa_cs');
  for (const [label, value] of [
    ['מילולי', '130'],
    ['כמותי', '140'],
    ['אנגלית', '135'],
    ['פסיכומטרי — ציון כללי', '700'],
    ['ממוצע בגרות בחיפה', '104'],
  ])
    expect(
      screen.getByLabelText(label, { exact: label !== 'פסיכומטרי — ציון כללי' }),
    ).toHaveProperty('value', value);
  expect(screen.getByTestId('institution-haifa')).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('explicit programme prefill overrides an incompatible saved selection', async () => {
  const choices = [...offerings, { ...offerings[0], programId: 'haifa_law' }];
  const view = render(<SekhemCalculator offerings={choices} initialProgramId="haifa_cs" />);
  examples();
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  view.unmount();
  const next = render(<SekhemCalculator offerings={choices} initialProgramId="haifa_law" />);
  expect(screen.getByLabelText('ציון 1')).toHaveProperty('value', '92');
  expect(screen.getByLabelText('תוכנית לימודים')).toHaveProperty('value', 'haifa_law');
  expect(screen.queryByTestId('institution-haifa')).toBeNull();
  next.rerender(<SekhemCalculator offerings={choices} initialProgramId="haifa_cs" />);
  expect(screen.getByLabelText('תוכנית לימודים')).toHaveProperty('value', 'haifa_cs');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('restored input edits clear persisted results', async () => {
  const view = render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  view.unmount();
  const next = render(<SekhemCalculator offerings={offerings} />);
  expect(screen.getByText('הציונים עומדים בתנאי הקבלה')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('ציון 1'), { target: { value: '81' } });
  expect(screen.queryByTestId('institution-haifa')).toBeNull();
  next.unmount();
  render(<SekhemCalculator offerings={offerings} />);
  expect(screen.queryByTestId('institution-haifa')).toBeNull();
  expect(screen.getByLabelText('ציון 1')).toHaveProperty('value', '81');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it.each([
  ['ציון 1', '-1'],
  ['ציון 1', '101'],
  ['יחידות 1', '0'],
  ['יחידות 1', '6'],
  ['ציון 1', '90.5'],
  ['יחידות 1', '4.5'],
])('focuses the first invalid grade or units field without evaluating (%s=%s)', (label, value) => {
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.change(screen.getByLabelText('ציון 2'), { target: { value: '101' } });
  submit();
  const input = screen.getByLabelText(label);
  expect(document.activeElement).toBe(input);
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(document.getElementById(input.getAttribute('aria-describedby')!)?.textContent).toBe(
    label.startsWith('ציון') ? 'ציון בין 0 ל-100' : 'יחידות בין 1 ל-5',
  );
  expect(screen.getByLabelText('ציון 2').getAttribute('aria-invalid')).toBe('true');
  expect(fetchMock).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: label.startsWith('ציון') ? '100' : '5' } });
  expect(input.hasAttribute('aria-invalid')).toBe(false);
});

it('focuses units before grade when both fields in the first row are invalid', () => {
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  for (const label of ['יחידות 1', 'ציון 1'])
    fireEvent.change(screen.getByLabelText(label), { target: { value: '150' } });
  submit();
  expect(document.activeElement).toBe(screen.getByLabelText('יחידות 1'));
  expect(fetchMock).not.toHaveBeenCalled();
});

it.each([
  [0, 1],
  [100, 5],
])('evaluates valid grade/unit boundaries (%s/%s)', async (grade, units) => {
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  fireEvent.change(screen.getByLabelText('ציון 1'), { target: { value: String(grade) } });
  fireEvent.change(screen.getByLabelText('יחידות 1'), { target: { value: String(units) } });
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it.each(['missing', 'duplicate'])('preserves the generic row error for %s rows', (kind) => {
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  fireEvent.change(screen.getByLabelText(kind === 'missing' ? 'ציון 1' : 'מקצוע 2'), {
    target: { value: kind === 'missing' ? '' : 'מתמטיקה' },
  });
  submit();
  expect(screen.getByRole('alert').textContent).toBe(
    'יש להשלים את המקצוע, היחידות והציון בכל שורה ולוודא שאין כפילויות.',
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

it('keeps required fields and answers while persisting cleared results after a required-input edit', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ data: response(['haifa_bagrut_average']) }));
  const view = render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  fireEvent.change(await screen.findByLabelText('ממוצע בגרות בחיפה'), { target: { value: '104' } });
  expect(screen.queryByTestId('institution-haifa')).toBeNull();
  view.unmount();
  render(<SekhemCalculator offerings={offerings} />);
  expect(screen.getByLabelText('ממוצע בגרות בחיפה')).toHaveProperty('value', '104');
  expect(screen.queryByTestId('institution-haifa')).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it('restores failed programme IDs for an explicit retry without evaluating on mount', async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json({ data: { reports: {}, failedDegreeIds: ['haifa_cs'] } }),
  );
  const view = render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  await screen.findByRole('button', { name: 'לנסות שוב' });
  view.unmount();
  render(<SekhemCalculator offerings={offerings} />);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'לנסות שוב' }));
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).degreeIds).toEqual(['haifa_cs']);
});
