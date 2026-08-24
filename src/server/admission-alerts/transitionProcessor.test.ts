import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  processAdmissionAlertTransitionWork,
  type AdmissionAlertTransitionProcessorRepository,
} from './transitionProcessor';

describe('admission alert transition processor', () => {
  it('queues only a verified newly eligible subscription and advances a verified below baseline', async () => {
    const repository = new MemoryRepository();
    const result = await processAdmissionAlertTransitionWork({
      repository,
      evaluate: async ({ subscriptionId }) =>
        subscriptionId === 'eligible'
          ? { decision: 'eligible', isMathematicallyVerified: true, ruleVersion: 'v2' }
          : { decision: 'below', isMathematicallyVerified: true, ruleVersion: 'v2' },
    });

    expect(result).toEqual({ status: 'completed', processedSubscriptionCount: 2 });
    expect(repository.decisions).toEqual([
      {
        transitionId: 'transition-1',
        subscriptionId: 'eligible',
        action: 'queue_delivery',
        ruleVersion: 'v2',
      },
      {
        transitionId: 'transition-1',
        subscriptionId: 'below',
        action: 'advance_baseline',
        ruleVersion: 'v2',
      },
    ]);
  });

  it('retries the work without persisting a delivery when an evaluator is unavailable', async () => {
    const repository = new MemoryRepository();
    const result = await processAdmissionAlertTransitionWork({
      repository,
      evaluate: async () => ({
        decision: 'unavailable',
        isMathematicallyVerified: false,
        ruleVersion: 'v2',
      }),
    });

    expect(result).toEqual({ status: 'retry_later' });
    expect(repository.decisions).toEqual([]);
  });

  it('claims work only for the current admissions cycle', async () => {
    const repository = new MemoryRepository();

    await processAdmissionAlertTransitionWork({
      repository,
      now: new Date('2026-10-01T08:00:00.000Z'),
      evaluate: async () => ({
        decision: 'below',
        isMathematicallyVerified: true,
        ruleVersion: 'v2',
      }),
    });

    expect(repository.claimedCycles).toEqual(['2027']);
  });
});

class MemoryRepository implements AdmissionAlertTransitionProcessorRepository {
  decisions: Array<{
    transitionId: string;
    subscriptionId: string;
    action: string;
    ruleVersion?: string;
  }> = [];
  claimedCycles: string[] = [];

  async claimNextWork({ currentCycle }: { currentCycle: string }) {
    this.claimedCycles.push(currentCycle);
    return {
      id: 'work-1',
      transitionId: 'transition-1',
      subscriptions: [
        {
          id: 'eligible',
          status: 'active' as const,
          profileHash: 'sha256:a',
          profileVersionId: 'profile-a',
          baselineVerdict: { decision: 'below' },
        },
        {
          id: 'below',
          status: 'active' as const,
          profileHash: 'sha256:b',
          profileVersionId: 'profile-b',
          baselineVerdict: { decision: 'below' },
        },
      ],
    };
  }
  async recordDecision(input: {
    transitionId: string;
    subscriptionId: string;
    action: string;
    ruleVersion?: string;
  }) {
    this.decisions.push(input);
  }
  async completeWork() {}
  async retryWork() {}
}
