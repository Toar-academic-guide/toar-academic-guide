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
});
