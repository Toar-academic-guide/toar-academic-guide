import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createAdmissionAlertSubscription,
  type AdmissionAlertSubscriptionRepository,
} from './subscriptionService';

const completeProfile = {
  profileVersionId: 'profile-v1',
  profileHash: 'sha256:profile',
  psychometric: 680,
  bagrutAverage: 108,
  hasStructuredBagrut: true,
  subjects: [
    { subjectId: 'mathematics', units: 5, grade: 90 },
    { subjectId: 'physics', units: 5, grade: 80 },
  ],
};

describe('admission alert subscriptions', () => {
  it('creates a baseline only for a supported, complete, below-threshold target', async () => {
    const repository = new MemoryRepository();
    const result = await createAdmissionAlertSubscription(
      { institutionId: 'tau', programId: 'tau_cs' },
      {
        userId: 'user-1',
        repository,
        evaluate: async () => ({ decision: 'below', ruleVersion: 'v1' }),
        now: new Date('2026-10-01T08:00:00.000Z'),
      },
    );

    expect(result.status).toBe('created');
    expect(repository.subscriptions).toHaveLength(1);
    expect(repository.subscriptions[0]).toMatchObject({ userId: 'user-1', cycle: '2027' });
  });

  it('rejects incomplete, eligible, and unsupported targets without creating a subscription', async () => {
    const repository = new MemoryRepository({
      profile: { ...completeProfile, hasStructuredBagrut: false },
    });
    await expect(
      createAdmissionAlertSubscription(
        { institutionId: 'tau', programId: 'tau_cs' },
        {
          userId: 'user-1',
          repository,
          evaluate: async () => ({ decision: 'below', ruleVersion: 'v1' }),
          now: new Date('2026-10-01T08:00:00.000Z'),
        },
      ),
    ).resolves.toEqual({ status: 'profile_incomplete' });

    await expect(
      createAdmissionAlertSubscription(
        { institutionId: 'tau', programId: 'unknown' },
        {
          userId: 'user-1',
          repository,
          evaluate: async () => ({ decision: 'below', ruleVersion: 'v1' }),
          now: new Date('2026-10-01T08:00:00.000Z'),
        },
      ),
    ).resolves.toEqual({ status: 'unsupported' });
  });

  it('returns the existing active subscription for a duplicate request', async () => {
    const repository = new MemoryRepository();
    repository.subscriptions.push({
      id: 'sub-1',
      userId: 'user-1',
      institutionId: 'tau',
      programId: 'tau_cs',
      cycle: '2027',
    });

    await expect(
      createAdmissionAlertSubscription(
        { institutionId: 'tau', programId: 'tau_cs' },
        {
          userId: 'user-1',
          repository,
          evaluate: async () => ({ decision: 'below', ruleVersion: 'v1' }),
          now: new Date('2026-10-01T08:00:00.000Z'),
        },
      ),
    ).resolves.toEqual({ status: 'existing', subscriptionId: 'sub-1' });
  });

  it('returns the database-conflicting active subscription after a concurrent activation', async () => {
    const repository = new MemoryRepository({ concurrentDuplicate: true });

    await expect(
      createAdmissionAlertSubscription(
        { institutionId: 'tau', programId: 'tau_cs' },
        {
          userId: 'user-1',
          repository,
          evaluate: async () => ({ decision: 'below', ruleVersion: 'v1' }),
          now: new Date('2026-10-01T08:00:00.000Z'),
        },
      ),
    ).resolves.toEqual({ status: 'existing', subscriptionId: 'sub-concurrent' });
  });
});

class MemoryRepository implements AdmissionAlertSubscriptionRepository {
  subscriptions: Array<{
    id: string;
    userId: string;
    institutionId: string;
    programId: string;
    cycle: string;
  }> = [];

  constructor(
    private readonly options: {
      profile?: typeof completeProfile;
      concurrentDuplicate?: boolean;
    } = {},
  ) {}

  async getProfile() {
    return this.options.profile ?? completeProfile;
  }

  async findActiveSubscription(input: {
    userId: string;
    institutionId: string;
    programId: string;
    cycle: string;
  }) {
    return (
      this.subscriptions.find((subscription) =>
        Object.entries(input).every(
          ([key, value]) => subscription[key as keyof typeof subscription] === value,
        ),
      ) ?? null
    );
  }

  async createSubscription(input: {
    userId: string;
    institutionId: string;
    programId: string;
    cycle: string;
  }) {
    if (this.options.concurrentDuplicate) {
      return { id: 'sub-concurrent', created: false };
    }
    const subscription = { id: `sub-${this.subscriptions.length + 1}`, ...input };
    this.subscriptions.push(subscription);
    return { id: subscription.id, created: true };
  }
}
