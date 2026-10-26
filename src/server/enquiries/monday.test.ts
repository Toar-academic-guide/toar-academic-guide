import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { sendEnquiryToMonday } from './monday';
import * as monday from './monday';
import type { EnquiryRecord } from '@/lib/enquiries';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('keeps required context within the Monday 2000-character long-text limit with an exact subject record', async () => {
  vi.stubEnv('MONDAY_API_TOKEN', 'test-token');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ data: { create_item: { id: '123' } } })),
  );
  const enquiry = {
    requestId: 'b783a6d4-0428-4ddd-827f-82d33251be52',
    name: 'בדיקת MyWay',
    phone: '0501234567',
    programId: 'bgu_cs',
    institutionId: 'bgu',
    programName: 'CS',
    institutionName: 'BGU',
    sourcePath: '/',
    consent: true,
    resultStatus: 'accepted',
    bagrut: 105.5,
    psychometric: 680,
    attribution: {
      utm_source: 'x'.repeat(100),
      utm_medium: 'x'.repeat(100),
      utm_campaign: 'x'.repeat(100),
      referrer: 'https://example.com/' + 'x'.repeat(236),
    },
    createdAt: new Date('2026-10-24T12:00:00Z'),
    evaluationInput: {
      degreeId: 'bgu_cs',
      bagrut: 105.5,
      psychometric: 680,
      extraInputs: {
        bguBagrutAverage: 112,
        psychometricMath: 135,
        bagrutSubjectRecord: {
          subjects: Array.from({ length: 50 }, () => ({
            subjectId: 'mathematics',
            units: 5,
            grade: 95,
          })),
        },
      },
    },
  } as unknown as EnquiryRecord;
  await sendEnquiryToMonday(enquiry);
  const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
  const text = JSON.parse(body.variables.columns).long_text_mm8ay37r.text;
  expect(text.length).toBeLessThanOrEqual(2000);
  const context = JSON.parse(text.split('\n\nLead context:\n')[1]);
  expect(context).toMatchObject({
    utm_source: 'x'.repeat(100),
    utm_medium: 'x'.repeat(100),
    utm_campaign: 'x'.repeat(100),
    referrer: 'https://example.com',
    result_status: 'accepted',
    bagrut_band: '105–109',
    psychometric_band: '650–699',
  });
  expect(context).not.toHaveProperty('evaluation_input');
  for (const score of ['105.5', '680', '112', '135']) {
    expect(JSON.stringify(body)).not.toContain(score);
  }
});

it('sends bands only across the entire Monday payload, including a crafted source and extra attribution', async () => {
  vi.stubEnv('MONDAY_API_TOKEN', 'test-token');
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ data: { create_item: { id: '123' } } })),
  );
  const enquiry = {
    requestId: 'b783a6d4-0428-4ddd-827f-82d33251be52',
    name: 'בדיקת MyWay',
    phone: '0501234567',
    programId: 'bgu_cs',
    institutionId: 'bgu',
    programName: 'CS',
    institutionName: 'BGU',
    sourcePath: '/680?bagrut=105.5#what_if_750',
    consent: true,
    resultStatus: 'accepted',
    bagrut: 105.5,
    psychometric: 680,
    evaluationInput: { degreeId: 'bgu_cs', bagrut: 105.5, psychometric: 750 },
    attribution: { utm_source: 'instagram', utm_campaign: 'autumn', what_if_score: 750 },
    createdAt: new Date('2026-10-24T12:00:00Z'),
  } as EnquiryRecord;
  await sendEnquiryToMonday(enquiry);
  const serialized = vi.mocked(fetch).mock.calls[0][1]?.body as string;
  // Inspect the full GraphQL body, including item name and every nested column.
  for (const exactScore of ['105.5', '680', '750']) expect(serialized).not.toContain(exactScore);
  const body = JSON.parse(serialized);
  const columns = JSON.parse(body.variables.columns);
  expect(columns.text_mm8am52m).toBe('/');
  expect(body.variables.name).toBe(enquiry.name);
  const context = JSON.parse(columns.long_text_mm8ay37r.text.split('\n\nLead context:\n')[1]);
  expect(context).toMatchObject({
    bagrut_band: '105–109',
    psychometric_band: '650–699',
    utm_source: 'instagram',
  });
  expect(context).not.toHaveProperty('what_if_score');
});

const failureEnquiry: EnquiryRecord = {
  requestId: 'b783a6d4-0428-4ddd-827f-82d33251be52',
  name: 'ישראל ישראלי',
  phone: '0501234567',
  programId: 'bgu_cs',
  institutionId: 'bgu',
  programName: 'מדעי המחשב',
  institutionName: 'אוניברסיטת בן גוריון',
  sourcePath: '/',
  consent: true,
  resultStatus: 'accepted',
  bagrut: 105.5,
  psychometric: 680,
  createdAt: new Date('2026-10-26T10:00:00Z'),
};

it.each([undefined, '', '   '])(
  'rejects missing Monday token %s with a safe typed not_configured reason',
  async (token) => {
    vi.stubEnv('MONDAY_API_TOKEN', token);
    vi.stubGlobal('fetch', vi.fn());
    const error = await sendEnquiryToMonday(failureEnquiry).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(monday.MondayEnquiryError);
    expect(error).toMatchObject({ reason: 'not_configured' });
    expect(fetch).not.toHaveBeenCalled();
  },
);

it.each([
  { failure: 'http', reason: 'http_error' },
  { failure: 'http invalid JSON', reason: 'http_error' },
  { failure: 'graphql', reason: 'not_acknowledged' },
  { failure: 'missing item', reason: 'not_acknowledged' },
  { failure: 'TimeoutError', reason: 'timeout' },
  { failure: 'AbortError', reason: 'timeout' },
  { failure: 'body timeout', reason: 'timeout' },
  { failure: 'network', reason: 'unknown' },
  { failure: 'invalid JSON', reason: 'unknown' },
  { failure: 'invalid record', reason: 'unknown' },
])('reports a safe typed $reason for $failure', async ({ failure, reason }) => {
  vi.stubEnv('MONDAY_API_TOKEN', 'test-token');
  const privateText = `${failureEnquiry.name} 050-123-4567 ${failureEnquiry.phone}`;
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  if (failure === 'http')
    fetchMock.mockResolvedValue(
      Response.json({ errors: [{ message: privateText }] }, { status: 503 }),
    );
  if (failure === 'http invalid JSON')
    fetchMock.mockResolvedValue(new Response(privateText, { status: 502 }));
  if (failure === 'graphql')
    fetchMock.mockResolvedValue(Response.json({ errors: [{ message: privateText }] }));
  if (failure === 'missing item') fetchMock.mockResolvedValue(Response.json({ data: {} }));
  if (failure === 'TimeoutError' || failure === 'AbortError')
    fetchMock.mockRejectedValue(new DOMException(privateText, failure));
  if (failure === 'body timeout')
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new DOMException(privateText, 'TimeoutError')),
    });
  if (failure === 'network') fetchMock.mockRejectedValue(new Error(privateText));
  if (failure === 'invalid JSON') fetchMock.mockResolvedValue(new Response(privateText));
  const fixture =
    failure === 'invalid record'
      ? { ...failureEnquiry, createdAt: new Date('invalid') }
      : failureEnquiry;
  const error = await sendEnquiryToMonday(fixture).catch((error: unknown) => error);
  expect(error).toBeInstanceOf(monday.MondayEnquiryError);
  expect(error).toMatchObject({ reason });
  const serialized = `${String(error)} ${JSON.stringify(error)}`;
  for (const privateValue of [failureEnquiry.name, '050-123-4567', failureEnquiry.phone])
    expect(serialized).not.toContain(privateValue);
  expect(error).not.toHaveProperty('cause');
});
