import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/server/admission-alerts/unsubscribeService', () => ({
  unsubscribeAdmissionAlerts: vi.fn(),
  getAdmissionAlertUnsubscribeStatus: vi.fn(),
}));
import {
  unsubscribeAdmissionAlerts,
  getAdmissionAlertUnsubscribeStatus,
} from '@/server/admission-alerts/unsubscribeService';
import { POST } from './route';
import { GET } from '@/app/admission-alerts/unsubscribe/route';
const token = 'a'.repeat(43);
const request = (value: string) =>
  new Request('https://app.example.org/api/admission-alerts/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ token: value }),
  });
describe('unsubscribe HTTP boundary', () => {
  beforeEach(() => vi.clearAllMocks());
  it('checks saved state without performing unsubscribe', async () => {
    vi.mocked(getAdmissionAlertUnsubscribeStatus).mockResolvedValueOnce({ status: 'unsubscribed' });
    const response = await POST(
      new Request('https://app.example.org/api/admission-alerts/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ token, action: 'status' }),
      }),
    );
    expect(await response.json()).toEqual({ data: { status: 'unsubscribed' } });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(unsubscribeAdmissionAlerts).not.toHaveBeenCalled();
  });
  it('rejects malformed tokens without reading the database', async () => {
    expect((await POST(request('bad'))).status).toBe(400);
    expect(unsubscribeAdmissionAlerts).not.toHaveBeenCalled();
  });
  it('returns 410 for an invalid or cycle-expired link', async () => {
    vi.mocked(unsubscribeAdmissionAlerts).mockResolvedValueOnce({ status: 'invalid' });
    expect((await POST(request(token))).status).toBe(410);
  });
  it('returns uncertainty accurately and never exposes raw errors', async () => {
    vi.mocked(unsubscribeAdmissionAlerts).mockResolvedValueOnce({
      status: 'unsubscribed',
      mayStillArrive: true,
    });
    expect(await (await POST(request(token))).json()).toEqual({
      data: { status: 'unsubscribed', mayStillArrive: true },
    });
    vi.mocked(unsubscribeAdmissionAlerts).mockRejectedValueOnce(new Error('private token'));
    expect(await (await POST(request(token))).text()).not.toContain('private');
  });
  it('GET only shows confirmation; no analytics or third-party scripts receive the fragment', async () => {
    const response = GET();
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    const html = await response.text();
    expect(html).toContain('history.replaceState');
    expect(html).toContain('הסרה מכל התראות הקבלה');
    expect(html).not.toContain('posthog');
    expect(unsubscribeAdmissionAlerts).not.toHaveBeenCalled();
  });
});
