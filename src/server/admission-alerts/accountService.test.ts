import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  cancelAdmissionAlertSubscription,
  listAdmissionAlertSubscriptions,
  type AdmissionAlertAccountRepository,
} from './accountService';

describe('admission alert account service', () => {
  it('lists only the requesting user subscriptions', async () => {
    const repository = new MemoryRepository();

    await expect(
      listAdmissionAlertSubscriptions({ userId: 'user-1', repository }),
    ).resolves.toEqual([
      {
        id: 'subscription-1',
        institutionId: 'tau',
        programId: 'tau_cs',
        cycle: '2027',
        status: 'active',
      },
    ]);
  });

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

  async listSubscriptions(userId: string) {
    return userId === 'user-1'
      ? [
          {
            id: 'subscription-1',
            institutionId: 'tau',
            programId: 'tau_cs',
            cycle: '2027',
            status: 'active' as const,
          },
        ]
      : [];
  }
}
