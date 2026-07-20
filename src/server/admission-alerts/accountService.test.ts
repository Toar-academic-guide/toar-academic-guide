import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  cancelAdmissionAlertSubscription,
  type AdmissionAlertAccountRepository,
} from './accountService';

describe('admission alert account service', () => {
  it('cancels only the requesting user subscription and suppresses an unaccepted delivery', async () => {
    const repository = new MemoryRepository();

    await expect(
      cancelAdmissionAlertSubscription({
        userId: 'user-1',
        subscriptionId: 'subscription-1',
        repository,
      }),
    ).resolves.toEqual({ status: 'cancelled', mayStillArrive: false });
    expect(repository.cancelled).toEqual(['subscription-1']);

    await expect(
      cancelAdmissionAlertSubscription({
        userId: 'user-2',
        subscriptionId: 'subscription-1',
        repository,
      }),
    ).resolves.toEqual({ status: 'not_found' });
  });
});

class MemoryRepository implements AdmissionAlertAccountRepository {
  cancelled: string[] = [];

  async cancelSubscription(input: { userId: string; subscriptionId: string }) {
    if (input.userId !== 'user-1' || input.subscriptionId !== 'subscription-1') return null;
    this.cancelled.push(input.subscriptionId);
    return { mayStillArrive: false };
  }
}
