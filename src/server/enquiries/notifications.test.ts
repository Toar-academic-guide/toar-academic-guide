vi.mock('server-only', () => ({}));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyEnquiry } from './notifications';

const enquiry = {
  requestId: 'b783a6d4-0428-4ddd-827f-82d33251be52',
  name: 'Private Student Name',
  phone: '0501234567',
  email: 'private.student@example.com',
  message: 'PRIVATE_STUDENT_MESSAGE',
  programId: 'bgu_cs',
  programName: 'מדעי המחשב',
  institutionId: 'bgu',
  institutionName: 'אוניברסיטת בן גוריון',
  resultStatus: 'accepted' as const,
  attribution: {
    utm_source: 'tiktok',
    utm_medium: 'social',
    utm_campaign: 'PRIVATE_CAMPAIGN',
    referrer: 'https://example.com/private-referrer',
  },
};
const mondayUrl = 'https://malichi-hub.monday.com/boards/18436300533/pulses/456';
const expectedText = [
  `program_id: ${enquiry.programId}`,
  `program_name: ${enquiry.programName}`,
  `institution_id: ${enquiry.institutionId}`,
  `institution_name: ${enquiry.institutionName}`,
  `result_status: ${enquiry.resultStatus}`,
  `utm_source: ${enquiry.attribution.utm_source}`,
].join('\n');

describe('private enquiry Slack notifications', () => {
  beforeEach(() => {
    vi.stubEnv('SLACK_BOT_TOKEN', 'test-token');
    vi.stubEnv('SLACK_LEADS_CHANNEL_ID', 'C_LEADS');
    vi.stubEnv('SLACK_READY_PR_CHANNEL_ID', 'C_DEV');
    vi.stubEnv('SLACK_ADMISSIONS_REVIEW_CHANNEL_ID', 'C_ADMISSIONS');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: true, ts: '123' })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('sends only the allowed catalogue, status, source and Monday link fields to the leads channel', async () => {
    await notifyEnquiry(enquiry, '456');
    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    expect(options?.headers).toMatchObject({ Authorization: 'Bearer test-token' });
    const serialized = options?.body as string;
    expect(JSON.parse(serialized)).toEqual({
      channel: 'C_LEADS',
      text: `${expectedText}\n${mondayUrl}`,
      blocks: [],
      unfurl_links: false,
      unfurl_media: false,
    });
    for (const privateValue of [
      enquiry.name,
      enquiry.phone,
      enquiry.email,
      enquiry.message,
      enquiry.requestId,
      enquiry.attribution.utm_medium,
      enquiry.attribution.utm_campaign,
      enquiry.attribution.referrer,
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
    expect(serialized).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(serialized).not.toMatch(/(?:\+972[-\s]?|(?<!\d)0)[2-9](?:[-\s]?\d){7,8}(?!\d)/);
  });

  it.each([undefined, '', '   '])(
    'no-ops when the leads channel is %s, even with development channels configured',
    async (channel) => {
      vi.stubEnv('SLACK_LEADS_CHANNEL_ID', channel);
      await notifyEnquiry(enquiry, '456');
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('no-ops when the bot token is missing', async () => {
    vi.stubEnv('SLACK_BOT_TOKEN', '');
    await notifyEnquiry(enquiry, '456');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps DB-only notifications within the same field allowlist', async () => {
    await notifyEnquiry(enquiry, null);
    const options = vi.mocked(fetch).mock.calls[0][1];
    expect(JSON.parse(options?.body as string).text).toBe(expectedText);
  });

  it('omits absent optional attribution without adding student fields', async () => {
    await notifyEnquiry({ ...enquiry, attribution: undefined }, '456');
    const options = vi.mocked(fetch).mock.calls[0][1];
    expect(JSON.parse(options?.body as string).text).toBe(
      `${expectedText.replace('\nutm_source: tiktok', '')}\n${mondayUrl}`,
    );
  });

  it('logs safe delivery failure without throwing', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('private provider response'));
    await expect(notifyEnquiry(enquiry, null)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'private provider response',
    );
  });
});
