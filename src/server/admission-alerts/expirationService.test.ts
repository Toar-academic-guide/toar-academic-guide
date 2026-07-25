import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  expirePriorAdmissionAlertSubscriptions,
  type AdmissionAlertExpirationRepository,
} from './expirationService';

describe('admission alert expiration', () => {
  it('expires every prior cycle after a missed maintenance run without touching closed subscriptions', async () => {
    const repository = new MemoryRepository();

    const result = await expirePriorAdmissionAlertSubscriptions({
      repository,
      now: new Date('2026-10-01T08:00:00.000Z'),
    });

    expect(result).toEqual({ currentCycle: '2027', expiredSubscriptionCount: 2 });
    expect(repository.calls).toEqual([{ currentCycle: '2027' }]);
  });

  it('is idempotent when the scheduled job is rerun', async () => {
    const repository = new MemoryRepository(0);

    const result = await expirePriorAdmissionAlertSubscriptions({
      repository,
      now: new Date('2026-10-01T08:00:00.000Z'),
    });

    expect(result).toEqual({ currentCycle: '2027', expiredSubscriptionCount: 0 });
  });
});

class MemoryRepository implements AdmissionAlertExpirationRepository {
  calls: Array<{ currentCycle: string }> = [];

  constructor(private readonly expiredSubscriptionCount = 2) {}

  async expirePriorCycles(input: { currentCycle: string }) {
    this.calls.push(input);
    return this.expiredSubscriptionCount;
  }
}
