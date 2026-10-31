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
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 28)
  fireEvent.click(screen.getByRole('button', { name: 'חשבו את הסכם שלי' }));
}

async function answerHaifaFollowUps() {
  fetchMock.mockResolvedValueOnce(
    Response.json({
      data: response([
        'haifa_psychometric_month',
        'haifa_psychometric_year',
        'haifa_hebrew_qualification',
        'haifa_science_units',
      ]),
    }),
  );
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  fireEvent.change(await screen.findByLabelText('חודש הבחינה הפסיכומטרית לחיפה'), {
    target: { value: '4' },
  });
  for (const [label, value] of [
    ['שנת הפסיכומטרי', '2025'],
    ['מספר היחידות המדעיות לסיעוד בחיפה', '10'],
    ['הבסיס לעמידה בדרישת העברית בחיפה', 'hebrew_school'],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

it('submits the answered sitting year when the API only requests the psychometric month', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ data: response(['haifa_psychometric_month']) }));
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  fireEvent.change(await screen.findByLabelText('חודש הבחינה הפסיכומטרית לחיפה'), {
    target: { value: '4' },
  });
  fireEvent.change(screen.getByLabelText('שנת הפסיכומטרי'), { target: { value: '2025' } });
  submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).extraInputs).toMatchObject({
    haifaPsychometricYear: 2025,
    haifaPsychometricMonth: 4,
  });
});

it.each([
  ['ציון 1', '91'],
  ['מגזר', 'ערבי'],
  ['סוג תעודה', 'internal'],
])(
  'keeps Haifa sitting answers after unrelated %s edits and clears derived bagrut answers',
  async (label, value) => {
    await answerHaifaFollowUps();
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
    expect(screen.getByLabelText('חודש הבחינה הפסיכומטרית לחיפה')).toHaveProperty('value', '4');
    expect(screen.getByLabelText('שנת הפסיכומטרי')).toHaveProperty('value', '2025');
    expect(screen.getByLabelText('מספר היחידות המדעיות לסיעוד בחיפה')).toHaveProperty('value', '');
    submit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).extraInputs).toMatchObject({
      haifaPsychometricMonth: 4,
      haifaPsychometricYear: 2025,
      haifaHebrewQualification: 'hebrew_school',
    });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).extraInputs).not.toHaveProperty(
      'haifaScienceUnits',
    );
  },
);

it.each([
  ['פסיכומטרי — ציון כללי', '701'],
  ['מילולי', '131'],
  ['כמותי', '141'],
  ['אנגלית', '136'],
])('clears only Haifa sitting answers when %s changes', async (label, value) => {
  await answerHaifaFollowUps();
  fireEvent.change(screen.getByLabelText(label, { exact: label !== 'פסיכומטרי — ציון כללי' }), {
    target: { value },
  });
  expect(screen.getByLabelText('חודש הבחינה הפסיכומטרית לחיפה')).toHaveProperty('value', '');
  expect(screen.getByLabelText('שנת הפסיכומטרי')).toHaveProperty('value', '');
  expect(screen.getByLabelText('מספר היחידות המדעיות לסיעוד בחיפה')).toHaveProperty('value', '10');
  submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  const extras = JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).extraInputs;
  expect(extras.haifaPsychometricMonth).toBeUndefined();
  expect(extras.haifaPsychometricYear).toBeUndefined();
  expect(extras.haifaHebrewQualification).toBe('hebrew_school');
  expect(extras.haifaScienceUnits).toBe(10);
});

it('asks the infosystems track once and retains answered keys through later follow-ups and recalculation', async () => {
  const requestedTracks: boolean[] = [];
  fetchMock.mockImplementation(async (_url, init) => {
    const { extraInputs } = JSON.parse(String(init?.body));
    const missing: AdmissionsRequiredInput[] = !extraInputs.haifaInformationSystemsTrack
      ? ['haifa_information_systems_track']
      : extraInputs.haifaInformationSystemsPartnerRequirementsConfirmed === undefined
        ? ['haifa_information_systems_partner_requirements']
        : !extraInputs.haifaHebrewQualification
          ? ['haifa_hebrew_qualification']
          : [];
    requestedTracks.push(missing.includes('haifa_information_systems_track'));
    const data = response(missing);
    const report = data.reports.haifa_cs;
    report.input.degreeId = 'haifa_infosystems';
    report.program.id = 'haifa_infosystems';
    data.reports = { haifa_infosystems: report };
    return Response.json({ data });
  });
  render(
    <SekhemCalculator
      offerings={[{ ...offerings[0], programId: 'haifa_infosystems', programName: 'מערכות מידע' }]}
    />,
  );
  examples();
  submit();
  fireEvent.change(await screen.findByLabelText('מסלול מערכות מידע בחיפה'), {
    target: { value: 'dual_major' },
  });
  submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'חשבו את הסכם שלי' })).toHaveProperty(
      'disabled',
      false,
    ),
  );
  fireEvent.change(screen.getByLabelText('האם אתם עומדים בתנאי הקבלה של החוג השני?'), {
    target: { value: 'true' },
  });
  submit();
  fireEvent.change(await screen.findByLabelText('הבסיס לעמידה בדרישת העברית בחיפה'), {
    target: { value: 'hebrew_school' },
  });
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  expect(requestedTracks).toEqual([true, false, false, false, false]);
  expect(JSON.parse(String(fetchMock.mock.calls[4][1]?.body)).extraInputs).toMatchObject({
    haifaInformationSystemsTrack: 'dual_major',
    haifaInformationSystemsPartnerRequirementsConfirmed: true,
    haifaHebrewQualification: 'hebrew_school',
  });
});

it('submits the infosystems partner answer revealed by the track before the API requests it', async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json({ data: response(['haifa_information_systems_track']) }),
  );
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  fireEvent.change(await screen.findByLabelText('מסלול מערכות מידע בחיפה'), {
    target: { value: 'dual_major' },
  });
  fireEvent.change(screen.getByLabelText('האם אתם עומדים בתנאי הקבלה של החוג השני?'), {
    target: { value: 'true' },
  });
  submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).extraInputs).toMatchObject({
    haifaInformationSystemsTrack: 'dual_major',
    haifaInformationSystemsPartnerRequirementsConfirmed: true,
  });
});

// Invalid select values can only arrive from a restored record, not from its options.
function restoreUnits(units: number, grade = 92) {
  sessionStorage.setItem(
    'myway:sekhem-calculator:v1',
    JSON.stringify({
      version: 1,
      rows: [
        { label: 'מתמטיקה', units, grade, assessmentKind: 'exam' },
        { label: 'אנגלית', units: 5, grade: 95, assessmentKind: 'exam' },
      ],
      sector: 'יהודי',
      certificate: 'internal',
      psychometric: '700',
      verbal: '130',
      quantitative: '140',
      english: '135',
      programId: '',
      requiredKeys: [],
      haifaValues: {},
      reports: [],
      failedIds: [],
    }),
  );
}

it('uses the selected sector for compulsory subject unit options', () => {
  render(<SekhemCalculator offerings={offerings} />);
  fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'ערבי' } });
  fireEvent.change(screen.getByLabelText('מקצוע 1'), { target: { value: 'עברית' } });
  expect(
    Array.from(
      screen.getByLabelText('יחידות 1').querySelectorAll('option'),
      (option) => option.textContent,
    ),
  ).toEqual(['בחירה', '3', '4', '5']);
});

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
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 16)
  fireEvent.click(screen.getByRole('button', { name: 'קבלו שיחה מהמוסד' }));
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
  // Approved test update, Jorje 2026-10-31
  fetchMock.mockResolvedValueOnce(
    Response.json({ data: response(['haifa_science_units', 'haifa_psychometric_month']) }),
  );
  render(<SekhemCalculator offerings={offerings} />);
  expect(screen.queryByLabelText('מספר היחידות המדעיות לסיעוד בחיפה')).toBeNull();
  examples();
  submit();
  fireEvent.change(await screen.findByLabelText('מספר היחידות המדעיות לסיעוד בחיפה'), {
    target: { value: '10' },
  });
  fireEvent.change(screen.getByLabelText('חודש הבחינה הפסיכומטרית לחיפה'), {
    target: { value: '4' },
  });
  fireEvent.change(screen.getByLabelText('שנת הפסיכומטרי'), { target: { value: '2025' } });
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  for (const index of [1, 2])
    expect(JSON.parse(String(fetchMock.mock.calls[index][1]?.body)).extraInputs).toMatchObject({
      haifaScienceUnits: 10,
      haifaPsychometricMonth: 4,
      haifaPsychometricYear: 2025,
    });
  fireEvent.change(screen.getByLabelText('ציון 1'), { target: { value: '91' } });
  expect(screen.getByLabelText('מספר היחידות המדעיות לסיעוד בחיפה')).toHaveProperty('value', '');
  expect(screen.getByLabelText('חודש הבחינה הפסיכומטרית לחיפה')).toHaveProperty('value', '4');
  expect(screen.getByLabelText('שנת הפסיכומטרי')).toHaveProperty('value', '2025');
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  expect(
    JSON.parse(String(fetchMock.mock.calls[3][1]?.body)).extraInputs.haifaScienceUnits,
  ).toBeUndefined();
  fireEvent.change(screen.getByLabelText('פסיכומטרי — ציון כללי', { exact: false }), {
    target: { value: '701' },
  });
  expect(screen.getByLabelText('חודש הבחינה הפסיכומטרית לחיפה')).toHaveProperty('value', '');
  expect(screen.getByLabelText('שנת הפסיכומטרי')).toHaveProperty('value', '');
  submit();
  await screen.findByText('הציונים עומדים בתנאי הקבלה');
  const extras = JSON.parse(String(fetchMock.mock.calls[4][1]?.body)).extraInputs;
  expect(extras.haifaPsychometricMonth).toBeUndefined();
  expect(extras.haifaPsychometricYear).toBeUndefined();
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
  // Approved test update, Jorje 2026-10-31: persist a Hebrew qualification instead of the removed Haifa average field.
  fetchMock.mockResolvedValueOnce(
    Response.json({ data: response(['haifa_bagrut_average', 'haifa_hebrew_qualification']) }),
  );
  const view = render(<SekhemCalculator offerings={offerings} />);
  examples();
  fireEvent.change(screen.getByLabelText('יחידות 1'), { target: { value: '4' } });
  fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'ערבי' } });
  fireEvent.change(screen.getByLabelText('סוג תעודה'), { target: { value: 'internal' } });
  fireEvent.change(screen.getByLabelText('תוכנית לימודים'), { target: { value: 'haifa_cs' } });
  submit();
  fireEvent.change(await screen.findByLabelText('הבסיס לעמידה בדרישת העברית בחיפה'), {
    target: { value: 'hebrew_school' },
  });
  fetchMock.mockResolvedValueOnce(
    Response.json({ data: response(['haifa_bagrut_average', 'haifa_hebrew_qualification']) }),
  );
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
    ['הבסיס לעמידה בדרישת העברית בחיפה', 'hebrew_school'],
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
  if (label.startsWith('יחידות')) restoreUnits(Number(value));
  render(<SekhemCalculator offerings={offerings} />);
  if (label.startsWith('ציון')) {
    examples();
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
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
  restoreUnits(150, 150);
  render(<SekhemCalculator offerings={offerings} />);
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
  if (units === 1)
    fireEvent.change(screen.getByLabelText('מקצוע 1'), { target: { value: 'כימיה' } });
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
  // Approved test update, Jorje 2026-10-31: edit a Hebrew qualification instead of the removed Haifa average field.
  fetchMock.mockResolvedValueOnce(
    Response.json({ data: response(['haifa_bagrut_average', 'haifa_hebrew_qualification']) }),
  );
  const view = render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  fireEvent.change(await screen.findByLabelText('הבסיס לעמידה בדרישת העברית בחיפה'), {
    target: { value: 'hebrew_school' },
  });
  expect(screen.queryByTestId('institution-haifa')).toBeNull();
  view.unmount();
  render(<SekhemCalculator offerings={offerings} />);
  expect(screen.getByLabelText('הבסיס לעמידה בדרישת העברית בחיפה')).toHaveProperty(
    'value',
    'hebrew_school',
  );
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

it('keeps the free-use line directly after the action without the removed estimate block', () => {
  const { container } = render(<SekhemCalculator offerings={offerings} />);
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 27, 28)
  const button = screen.getByRole('button', { name: 'חשבו את הסכם שלי' });
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 27, 28)
  expect(button.nextElementSibling?.textContent).toBe('חינם, בלי הרשמה');
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 27)
  expect(container.textContent).not.toContain('ממוצע הבגרות מחושב לפי כללי המוסד כשאפשר');
  // Approved copy update, Amit via Jorje 2026-10-29 (sales-copy rows 27)
  expect([...container.querySelectorAll('p')].every((p) => p.textContent?.trim())).toBe(true);
});

it('new-row defaults: starts math/English at 3, electives at 2 and strips UI fields from session and evaluation', async () => {
  render(<SekhemCalculator offerings={offerings} />);
  for (const [index, units] of [
    [1, '3'],
    [2, '3'],
    [3, '2'],
    [4, '2'],
  ]) {
    expect(screen.getByLabelText(`יחידות ${index}`)).toHaveProperty('value', units);
    fireEvent.change(screen.getByLabelText(`ציון ${index}`), { target: { value: '90' } });
  }
  const saved = JSON.parse(sessionStorage.getItem('myway:sekhem-calculator:v1')!);
  for (const row of saved.rows)
    expect(Object.keys(row).sort()).toEqual(['assessmentKind', 'grade', 'label', 'units']);
  fireEvent.change(screen.getByLabelText(/פסיכומטרי — ציון כללי/), { target: { value: '700' } });
  submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
  expect(body.extraInputs.bagrutSubjectRecord.subjects).toEqual([
    { subjectId: 'computer_science', units: 2, grade: 90, assessmentKind: 'exam' },
    { subjectId: 'english', units: 3, grade: 90, assessmentKind: 'exam' },
    { subjectId: 'mathematics', units: 3, grade: 90, assessmentKind: 'exam' },
    { subjectId: 'physics', units: 2, grade: 90, assessmentKind: 'exam' },
  ]);
});

it.each(['ערבי', 'דרוזי'])(
  'new-row defaults: recomputes Hebrew in %s and on subsequent sector switches',
  (sector) => {
    render(<SekhemCalculator offerings={offerings} />);
    fireEvent.change(screen.getByLabelText('מקצוע 3'), { target: { value: 'עברית' } });
    expect(screen.getByLabelText('יחידות 3')).toHaveProperty('value', '2');
    fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: sector } });
    expect(screen.getByLabelText('יחידות 3')).toHaveProperty('value', '3');
    fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'יהודי' } });
    expect(screen.getByLabelText('יחידות 3')).toHaveProperty('value', '2');
  },
);

it.each(['4', ''])(
  'new-row defaults: preserves picked units %j across label and sector changes',
  (value) => {
    render(<SekhemCalculator offerings={offerings} />);
    fireEvent.change(screen.getByLabelText('יחידות 3'), { target: { value } });
    fireEvent.change(screen.getByLabelText('מקצוע 3'), { target: { value: 'עברית' } });
    fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'ערבי' } });
    expect(screen.getByLabelText('יחידות 3')).toHaveProperty('value', value);
  },
);

it.each([2, 4])(
  'new-row defaults: preserves saved session units %s across label and sector changes',
  (units) => {
    restoreUnits(units);
    render(<SekhemCalculator offerings={offerings} />);
    fireEvent.change(screen.getByLabelText('מקצוע 1'), { target: { value: 'עברית' } });
    fireEvent.change(screen.getByLabelText('מגזר'), { target: { value: 'ערבי' } });
    expect(screen.getByLabelText('יחידות 1')).toHaveProperty('value', String(units));
    const saved = JSON.parse(sessionStorage.getItem('myway:sekhem-calculator:v1')!);
    expect(saved.rows[0]).toEqual({ label: 'עברית', units, grade: 92, assessmentKind: 'exam' });
  },
);

it('never submits a legacy Haifa average restored from calculator storage', async () => {
  restoreUnits(5);
  const saved = JSON.parse(sessionStorage.getItem('myway:sekhem-calculator:v1')!);
  saved.requiredKeys = ['haifaBagrutAverage'];
  saved.haifaValues = { haifaBagrutAverage: '104' };
  sessionStorage.setItem('myway:sekhem-calculator:v1', JSON.stringify(saved));
  render(<SekhemCalculator offerings={offerings} />);
  submit();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).extraInputs).not.toHaveProperty(
    'haifaBagrutAverage',
  );
});

it('routes a missing Haifa average to bagrut rows when the certificate cannot be calculated', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ data: response(['haifa_bagrut_average']) }));
  render(<SekhemCalculator offerings={offerings} />);
  for (let index = 1; index <= 4; index++)
    fireEvent.change(screen.getByLabelText(`ציון ${index}`), { target: { value: '90' } });
  fireEvent.change(screen.getByLabelText(/פסיכומטרי — ציון כללי/), { target: { value: '700' } });
  submit();
  fireEvent.click(await screen.findByRole('button', { name: 'השלימו ציוני בגרות' }));
  expect(document.activeElement).toBe(document.getElementById('sekhem-bagrut-subjects'));
  expect(screen.queryByLabelText('ממוצע בגרות בחיפה')).toBeNull();
});

it('ignores an average request when complete subject rows already produce the Haifa average', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ data: response(['haifa_bagrut_average']) }));
  render(<SekhemCalculator offerings={offerings} />);
  examples();
  submit();
  await screen.findByTestId('institution-haifa');
  expect(screen.queryByLabelText('ממוצע בגרות בחיפה')).toBeNull();
  expect(screen.queryByRole('button', { name: 'השלימו ציוני בגרות' })).toBeNull();
});
