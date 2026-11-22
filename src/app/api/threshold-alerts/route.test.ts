import { THRESHOLD_ALERT_CONSENT, THRESHOLD_ALERT_COPY } from '@/lib/thresholdAlerts';
vi.mock('server-only', () => ({}));
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { save, capture, flush, after } = vi.hoisted(() => ({
  save: vi.fn(),
  capture: vi.fn(),
  flush: vi.fn(),
  after: vi.fn(),
}));
vi.mock('@/server/threshold-alerts/repository', () => ({ saveThresholdAlertSignup: save }));
vi.mock('next/server', () => ({ after }));
vi.mock('posthog-node', () => ({
  PostHog: class {
    capture = capture;
    flush = flush;
  },
}));
import { POST } from './route';

const body = {
  requestId: 'b783a6d4-0428-4ddd-827f-82d33251be52',
  institutions: ['tau', 'technion'],
  degrees: ['cs'],
  email: 'Student@Example.com',
  phone: '0501234567',
  consent: true,
  sourcePath: '/threshold-alerts?institution=tau',
};

function request(overrides: Record<string, unknown> = {}, origin = 'https://myway.example') {
  return new Request('https://myway.example/api/threshold-alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ ...body, ...overrides }),
  });
}

describe('threshold alert signup API', () => {
  beforeEach(() => {
    save.mockReset().mockResolvedValue(undefined);
    capture.mockReset();
    flush.mockReset().mockResolvedValue(undefined);
    after.mockReset().mockImplementation((task: () => Promise<void>) => task());
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'test-analytics-token');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('stores a normalized signup and records counts without the contact', async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: body.requestId,
        email: 'student@example.com',
        phone: '+972501234567',
        institutions: ['tau', 'technion'],
        degrees: ['cs'],
        cycle: '2027',
        consentText: THRESHOLD_ALERT_CONSENT,
        sourcePath: '/threshold-alerts',
      }),
    );
    expect(capture).toHaveBeenCalledWith({
      distinctId: body.requestId,
      event: 'server_threshold_alert_signup_created',
      properties: expect.objectContaining({
        institution_count: 2,
        degree_count: 1,
        contact_channel: 'email_and_whatsapp',
        source_path: '/threshold-alerts',
        cycle: '2027',
      }),
    });
    const recorded = JSON.stringify(capture.mock.calls);
    expect(recorded).not.toContain('student@example.com');
    expect(recorded).not.toContain('0501234567');
    expect(recorded).not.toContain('+972501234567');
    expect(recorded).not.toContain(THRESHOLD_ALERT_CONSENT);
  });

  it('rejects a college institution and a missing contact before writing', async () => {
    expect((await POST(request({ institutions: ['afeka'], degrees: [] }))).status).toBe(400);
    expect((await POST(request({ email: '', phone: '' }))).status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not accept a signup posted from another site', async () => {
    const response = await POST(request({}, 'https://elsewhere.example'));
    expect(response.status).toBe(403);
    expect(save).not.toHaveBeenCalled();
  });

  it('keeps the form retryable when storage fails', async () => {
    save.mockRejectedValue(new Error('db down'));
    const response = await POST(request());
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: { message: THRESHOLD_ALERT_COPY.serverError },
    });
  });
});
