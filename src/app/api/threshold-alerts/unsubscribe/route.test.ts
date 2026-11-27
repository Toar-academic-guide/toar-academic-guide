import { beforeEach, expect, it, vi } from 'vitest';
const remove = vi.hoisted(() => vi.fn());
vi.mock('@/server/threshold-alerts/repository', () => ({ unsubscribeThresholdAlerts: remove }));
import { POST } from './route';
const token = '2468beac-1c33-4d4f-941a-4deed2cdd47d';
function request(body: string, origin = 'https://findmyway.co.il') {
  return new Request('https://findmyway.co.il/api/threshold-alerts/unsubscribe', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body,
  });
}
beforeEach(() => {
  remove.mockReset();
});
it('suppresses with a body-only token and returns a noncached confirmation', async () => {
  remove.mockResolvedValue(true);
  const response = await POST(request(JSON.stringify({ token })));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(remove).toHaveBeenCalledWith(token);
  expect(await response.json()).toEqual({ data: { unsubscribed: true } });
});
it.each(['{}', '{', JSON.stringify({ token: 'bad' }), 'x'.repeat(1025)])(
  'rejects malformed input without DB work',
  async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(remove).not.toHaveBeenCalled();
  },
);
it('distinguishes invalid token from unavailable storage without leaking errors', async () => {
  remove.mockResolvedValue(false);
  expect((await POST(request(JSON.stringify({ token })))).status).toBe(410);
  remove.mockRejectedValue(new Error('private database detail'));
  const response = await POST(request(JSON.stringify({ token })));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('private database');
});
