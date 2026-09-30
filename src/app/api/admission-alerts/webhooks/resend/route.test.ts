import { randomBytes } from 'node:crypto';
import { Webhook } from 'svix';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/server/admission-alerts/webhookService', async (original) => ({
  ...(await original<typeof import('@/server/admission-alerts/webhookService')>()),
  recordAdmissionAlertWebhook: vi.fn().mockResolvedValue({ status: 'recorded' }),
}));
import { recordAdmissionAlertWebhook } from '@/server/admission-alerts/webhookService';
import { POST } from './route';
const secret = `whsec_${randomBytes(32).toString('base64')}`;
describe('Resend webhook route', () => {
  beforeEach(() => {
    vi.stubEnv('ADMISSION_ALERT_RESEND_WEBHOOK_SECRET', secret);
    vi.clearAllMocks();
  });
  afterEach(() => vi.unstubAllEnvs());
  const request = (signed: boolean) => {
    const body = JSON.stringify({
      type: 'email.sent',
      created_at: new Date().toISOString(),
      data: { email_id: 'email-1' },
    });
    const now = new Date();
    return new Request('https://app.example.org/api/admission-alerts/webhooks/resend', {
      method: 'POST',
      body,
      headers: signed
        ? {
            'svix-id': 'event-1',
            'svix-timestamp': String(Math.floor(now.getTime() / 1000)),
            'svix-signature': new Webhook(secret).sign('event-1', now, body),
          }
        : {},
    });
  };
  it('rejects unsigned requests before accessing persistence', async () => {
    expect((await POST(request(false))).status).toBe(400);
    expect(recordAdmissionAlertWebhook).not.toHaveBeenCalled();
  });
  it('records valid signed events', async () => {
    expect((await POST(request(true))).status).toBe(200);
    expect(recordAdmissionAlertWebhook).toHaveBeenCalledOnce();
  });
  it('returns a retryable failure without leaking database errors', async () => {
    vi.mocked(recordAdmissionAlertWebhook).mockRejectedValueOnce(
      new Error('private recipient token details'),
    );
    const response = await POST(request(true));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private');
  });
  it('stays unavailable until configured', async () => {
    vi.stubEnv('ADMISSION_ALERT_RESEND_WEBHOOK_SECRET', '');
    expect((await POST(request(true))).status).toBe(503);
    expect(recordAdmissionAlertWebhook).not.toHaveBeenCalled();
  });
});
