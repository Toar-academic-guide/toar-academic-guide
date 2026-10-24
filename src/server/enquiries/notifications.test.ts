vi.mock('server-only', () => ({}));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyEnquiry } from './notifications';
const enquiry = {
  requestId: 'b783a6d4-0428-4ddd-827f-82d33251be52',
  programId: 'bgu_cs',
  institutionId: 'bgu',
  resultStatus: 'accepted' as const,
};
describe('enquiry notifications through existing Slack wiring', () => {
  beforeEach(() => {
    vi.stubEnv('SLACK_BOT_TOKEN', '');
    vi.stubEnv('SLACK_READY_PR_CHANNEL_ID', '');
    vi.stubEnv('SLACK_ADMISSIONS_REVIEW_CHANNEL_ID', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: true, ts: '123' })));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  it('no-ops without existing credentials/channel', async () => {
    await notifyEnquiry(enquiry, null);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['SLACK_READY_PR_CHANNEL_ID', 'SLACK_ADMISSIONS_REVIEW_CHANNEL_ID'])(
    'uses existing %s and sends no contact details',
    async (channel) => {
      vi.stubEnv('SLACK_BOT_TOKEN', 'test-token');
      vi.stubEnv(channel, 'C123');
      await notifyEnquiry(
        { ...enquiry, name: 'private name', phone: '0501234567' } as typeof enquiry,
        '456',
      );
      expect(fetch).toHaveBeenCalledOnce();
      const [url, options] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe('https://slack.com/api/chat.postMessage');
      const message = JSON.parse(options?.body as string);
      expect(message.channel).toBe('C123');
      expect(message.text).toContain('bgu_cs');
      expect(message.text).toContain('accepted');
      expect(message.text).toContain('456');
      expect(options?.body).not.toContain('private name');
      expect(options?.body).not.toContain('0501234567');
    },
  );
  it('logs safe delivery failure without throwing', async () => {
    vi.stubEnv('SLACK_BOT_TOKEN', 'test-token');
    vi.stubEnv('SLACK_READY_PR_CHANNEL_ID', 'C123');
    vi.mocked(fetch).mockRejectedValue(new Error('private provider response'));
    await expect(notifyEnquiry(enquiry, null)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      'private provider response',
    );
  });
});
