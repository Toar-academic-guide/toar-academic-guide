import { describe, expect, it } from 'vitest';

import { vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { processAdmissionAlertDelivery } from './deliveryWorker';

describe('admission alert delivery worker', () => {
  it('closes a pending subscription only after the provider accepts its stable idempotency key', async () => {
    const calls: string[] = [];
    const result = await processAdmissionAlertDelivery({
      repository: {
        claimNextDelivery: async () => ({
          id: 'outbox-1',
          idempotencyKey: 'admission-alert:stable',
          subscriptionStatus: 'pending_delivery',
        }),
        canAttemptDelivery: async () => true,
        acceptDelivery: async () => {
          calls.push('accepted');
        },
        retryDelivery: async () => {
          calls.push('retry');
        },
      },
      provider: {
        send: async (input) => ({ status: 'accepted', providerMessageId: input.idempotencyKey }),
      },
    });

    expect(result).toEqual({ status: 'accepted', outboxId: 'outbox-1' });
    expect(calls).toEqual(['accepted']);
  });

  it('claims deliveries only for the current admissions cycle', async () => {
    const claimedCycles: string[] = [];

    await processAdmissionAlertDelivery({
      now: new Date('2026-10-01T08:00:00.000Z'),
      repository: {
        claimNextDelivery: async ({ currentCycle }) => {
          claimedCycles.push(currentCycle);
          return null;
        },
        canAttemptDelivery: async () => true,
        acceptDelivery: async () => {},
        retryDelivery: async () => {},
      },
      provider: { send: async () => ({ status: 'retryable' }) },
    });

    expect(claimedCycles).toEqual(['2027']);
  });

  it('does not submit a delivery that became expired after it was claimed', async () => {
    const provider = {
      send: vi.fn(async () => ({ status: 'accepted' as const, providerMessageId: 'id' })),
    };

    const result = await processAdmissionAlertDelivery({
      repository: {
        claimNextDelivery: async () => ({
          id: 'outbox-1',
          idempotencyKey: 'admission-alert:stable',
          subscriptionStatus: 'pending_delivery',
        }),
        canAttemptDelivery: async () => false,
        acceptDelivery: async () => {},
        retryDelivery: async () => {},
      },
      provider,
    });

    expect(result).toEqual({ status: 'idle' });
    expect(provider.send).not.toHaveBeenCalled();
  });
});
