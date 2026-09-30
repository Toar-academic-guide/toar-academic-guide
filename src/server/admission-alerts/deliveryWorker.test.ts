import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import {
  processAdmissionAlertDelivery,
  type AdmissionAlertDeliveryRepository,
  type ClaimedAlertDelivery,
} from './deliveryWorker';

const delivery: ClaimedAlertDelivery = {
  id: 'outbox-1',
  subscriptionId: 'sub-1',
  claimToken: 'token',
  idempotencyKey: 'stable',
  payload: {
    from: 'support@example.org',
    to: 'applicant@example.org',
    subject: 'עדכון',
    html: '<p>עדכון</p>',
    text: 'עדכון',
    reply_to: 'support@example.org',
  },
};
function fixture() {
  const repository = {
    claimNextDelivery: vi.fn<AdmissionAlertDeliveryRepository['claimNextDelivery']>(
      async () => delivery,
    ),
    beginSubmission: vi.fn<AdmissionAlertDeliveryRepository['beginSubmission']>(
      async () => 'ready',
    ),
    recordResult: vi.fn<AdmissionAlertDeliveryRepository['recordResult']>(async () => true),
  };
  const provider = {
    send: vi.fn(async () => ({ status: 'accepted' as const, providerMessageId: 'email-1' })),
  };
  return { repository, provider };
}
describe('admission alert delivery worker', () => {
  it('closes only after provider acceptance using the persisted request and key', async () => {
    const input = fixture();
    expect(await processAdmissionAlertDelivery(input)).toEqual({ status: 'accepted' });
    expect(input.provider.send).toHaveBeenCalledWith({
      idempotencyKey: 'stable',
      payload: delivery.payload,
    });
    expect(input.repository.recordResult).toHaveBeenCalledWith(
      expect.objectContaining({
        result: { status: 'accepted', providerMessageId: 'email-1' },
      }),
    );
  });
  it('does not blindly retry a request whose provider acceptance is unknown', async () => {
    const input = fixture();
    input.provider.send.mockRejectedValue(new Error('private provider response'));
    expect(await processAdmissionAlertDelivery(input)).toEqual({ status: 'acceptance_unknown' });
    expect(input.repository.recordResult).toHaveBeenCalledWith(
      expect.objectContaining({
        result: { status: 'acceptance_unknown' },
      }),
    );
  });
  it.each(['suppressed', 'lease_lost'] as const)(
    'never submits after %s at the consent boundary',
    async (status) => {
      const input = fixture();
      input.repository.beginSubmission.mockResolvedValue(status);
      expect(await processAdmissionAlertDelivery(input)).toEqual({ status });
      expect(input.provider.send).not.toHaveBeenCalled();
    },
  );
  it('rechecks the cycle immediately before submission, including midnight reset', async () => {
    const input = fixture();
    const now = vi
      .fn()
      .mockReturnValueOnce(new Date('2026-09-30T20:59:59Z'))
      .mockReturnValue(new Date('2026-09-30T21:00:00Z'));
    await processAdmissionAlertDelivery({ ...input, now });
    expect(input.repository.claimNextDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ currentCycle: '2026' }),
    );
    expect(input.repository.beginSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ currentCycle: '2027' }),
    );
  });
  it('does not report acceptance when its claim has been replaced', async () => {
    const input = fixture();
    input.repository.recordResult.mockResolvedValue(false);
    expect(await processAdmissionAlertDelivery(input)).toEqual({ status: 'lease_lost' });
  });
});
