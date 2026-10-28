// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
