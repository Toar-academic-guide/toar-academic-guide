import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { sendEnquiryToMonday } from './monday';
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
    sourcePath: '/#inquiry',
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
    createdAt: new Date(),
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
    referrer: 'https://example.com/' + 'x'.repeat(236),
    result_status: 'accepted',
    bagrut: 105.5,
    psychometric: 680,
    evaluation_input: { extraInputs: { bguBagrutAverage: 112, psychometricMath: 135 } },
  });
});
