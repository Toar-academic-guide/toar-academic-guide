vi.mock('server-only', () => ({}));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyEnquiry } from './notifications';
import * as notifications from './notifications';
import * as slackDelivery from '@/server/automation/admissionsReviewSlack';

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

describe('PII-free Hebrew lead pings', () => {
  const privateEnquiry = {
    ...enquiry,
    name: 'ישראל ישראלי',
    phone: '050-123-4567',
    age: 23,
    bagrut: 105.5,
    psychometric: 680,
    sourcePath: '/private-student-path',
    prepConsent: true,
    prepConsentText: 'PRIVATE_CONSENT_TEXT',
    prepConsentAt: new Date('2026-10-26T10:00:00Z'),
  };
  const boardUrl = 'https://malichi-hub.monday.com/boards/18436300533';
  const expected = (firstLine: string, consent: string, url: string) =>
    [
      firstLine,
      `מזהה פנייה: ${privateEnquiry.requestId}`,
      `הסכמה להעברה לחברת הכנה: ${consent}`,
      `קישור במאנדיי: ${url}`,
    ].join('\n');

  beforeEach(() => {
    vi.stubEnv('SLACK_BOT_TOKEN', ' test-token ');
    vi.stubEnv('SLACK_LEADS_CHANNEL_ID', ' C_LEADS ');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: true, ts: '123' })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    { itemId: '456', prepConsent: true, institutionName: enquiry.institutionName },
    { itemId: null, prepConsent: false, institutionName: enquiry.institutionName },
    { itemId: null, prepConsent: undefined, institutionName: '' },
  ])('posts exactly the whitelist for %j', async ({ itemId, prepConsent, institutionName }) => {
    const fixture = { ...privateEnquiry, prepConsent, institutionName };
    await notifyEnquiry(fixture, itemId);
    expect(fetch).toHaveBeenCalledOnce();
    const serialized = vi.mocked(fetch).mock.calls[0][1]?.body as string;
    const payload = JSON.parse(serialized);
    expect(payload).toEqual({
      channel: 'C_LEADS',
      text: expected(
        `פנייה חדשה: ${fixture.programName}${institutionName ? ` · ${institutionName}` : ''}`,
        prepConsent === true ? 'כן' : 'לא',
        itemId ? `${boardUrl}/pulses/${itemId}` : boardUrl,
      ),
      blocks: [],
      unfurl_links: false,
      unfurl_media: false,
    });
    for (const privateValue of [
      fixture.name,
      fixture.phone,
      '0501234567',
      fixture.email,
      fixture.message,
      String(fixture.bagrut),
      String(fixture.psychometric),
      '105–109',
      '650–699',
      fixture.programId,
      fixture.institutionId,
      fixture.resultStatus,
      fixture.sourcePath,
      fixture.prepConsentText,
      fixture.prepConsentAt.toISOString(),
      ...Object.values(fixture.attribution),
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
  });

  it('builds the pure payload from only catalogue names, request id and prep consent', () => {
    expect(
      notifications.buildEnquirySlackMessage(
        {
          programName: enquiry.programName,
          institutionName: enquiry.institutionName,
          requestId: enquiry.requestId,
          prepConsent: true,
        },
        '456',
      ),
    ).toEqual({
      text: expected(
        `פנייה חדשה: ${enquiry.programName} · ${enquiry.institutionName}`,
        'כן',
        mondayUrl,
      ),
      blocks: [],
    });
  });

  it('escapes Slack control characters in both catalogue names', async () => {
    const fixture = {
      ...privateEnquiry,
      programName: 'מדעים & <מחשב>',
      institutionName: 'מוסד > & <לימודים>',
    };
    const text = expected(
      'פנייה חדשה: מדעים &amp; &lt;מחשב&gt; · מוסד &gt; &amp; &lt;לימודים&gt;',
      'כן',
      boardUrl,
    );
    expect(notifications.buildEnquirySlackMessage(fixture, null)).toEqual({ text, blocks: [] });
    await notifyEnquiry(fixture, null);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string).text).toBe(text);
  });

  it.each(['SLACK_BOT_TOKEN', 'SLACK_LEADS_CHANNEL_ID'])(
    'warns exactly once without fetching when %s is missing or blank',
    async (key) => {
      for (const value of [undefined, '', '   ']) {
        vi.stubEnv(key, value);
        vi.mocked(console.warn).mockClear();
        await notifyEnquiry(privateEnquiry, '456');
        expect(fetch).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledExactlyOnceWith(
          '[enquiries] slack lead ping not configured',
          { requestId: privateEnquiry.requestId },
        );
        expect(console.error).not.toHaveBeenCalled();
      }
    },
  );

  it.each(['network', 'http', 'provider', 'unacknowledged', 'helper throws'])(
    'contains %s failure and logs only the request id',
    async (failure) => {
      const privateError = `${privateEnquiry.name} ${privateEnquiry.phone} 0501234567`;
      if (failure === 'network') vi.mocked(fetch).mockRejectedValue(new Error(privateError));
      if (failure === 'http')
        vi.mocked(fetch).mockResolvedValue(new Response(privateError, { status: 500 }));
      if (failure === 'provider')
        vi.mocked(fetch).mockResolvedValue(Response.json({ ok: false, error: privateError }));
      if (failure === 'unacknowledged')
        vi.mocked(fetch).mockResolvedValue(new Response('invalid JSON'));
      if (failure === 'helper throws')
        vi.spyOn(slackDelivery, 'postAdmissionsReviewSlackMessage').mockRejectedValue(
          new Error(privateError),
        );
      await expect(notifyEnquiry(privateEnquiry, null)).resolves.toBeUndefined();
      expect(console.error).toHaveBeenCalledExactlyOnceWith('[enquiries] slack lead ping failed', {
        requestId: privateEnquiry.requestId,
      });
      expect(console.warn).not.toHaveBeenCalled();
    },
  );
});
