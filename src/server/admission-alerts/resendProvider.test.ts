import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createResendAdmissionAlertProvider } from './resendProvider';
const payload = {
  from: 'support@example.org',
  to: 'recipient@example.org',
  subject: 'עדכון',
  html: '<p>עדכון</p>',
  text: 'עדכון',
  reply_to: 'support@example.org',
};
describe('Resend admission-alert adapter', () => {
  it('attaches only the opaque delivery correlation tag', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: 'email-1' }));
    await createResendAdmissionAlertProvider({ apiKey: 're_test', fetcher }).send({
      idempotencyKey: `admission-alert:${'a'.repeat(64)}`,
      payload,
    });
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({
      ...payload,
      tags: [{ name: 'admission_alert', value: 'a'.repeat(64) }],
    });
  });
  it.each([
    [200, { id: 'email-1' }, { status: 'accepted', providerMessageId: 'email-1' }],
    [429, { message: 'private' }, { status: 'retryable' }],
    [422, { message: 'private' }, { status: 'permanent' }],
    [403, {}, { status: 'permanent' }],
    [409, { name: 'invalid_idempotent_request' }, { status: 'acceptance_unknown' }],
    [409, { name: 'concurrent_idempotent_requests' }, { status: 'acceptance_unknown' }],
    [500, {}, { status: 'acceptance_unknown' }],
    [200, {}, { status: 'acceptance_unknown' }],
  ])('classifies HTTP %s without retaining raw provider content', async (status, body, result) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));
    const provider = createResendAdmissionAlertProvider({ apiKey: 're_test', fetcher });
    expect(await provider.send({ idempotencyKey: 'stable', payload })).toEqual(result);
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        body: JSON.stringify(payload),
        headers: expect.objectContaining({ 'Idempotency-Key': 'stable' }),
      }),
    );
  });
  it('classifies timeout before or after acceptance as unknown, never a safe retry', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('recipient@example.org'));
    const provider = createResendAdmissionAlertProvider({ apiKey: 're_test', fetcher });
    expect(await provider.send({ idempotencyKey: 'stable', payload })).toEqual({
      status: 'acceptance_unknown',
    });
  });
});
