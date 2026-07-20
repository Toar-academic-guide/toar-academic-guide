import { describe, expect, it } from 'vitest';

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
      { subscriptionId: 'eligible', action: 'queue_delivery', ruleVersion: 'v2' },
      { subscriptionId: 'below', action: 'advance_baseline', ruleVersion: 'v2' },
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
});

class MemoryRepository implements AdmissionAlertTransitionProcessorRepository {
  decisions: Array<{ subscriptionId: string; action: string; ruleVersion?: string }> = [];

  async claimNextWork() {
    return {
      id: 'work-1',
      subscriptions: [
        {
          id: 'eligible',
          status: 'active' as const,
          profileHash: 'sha256:a',
          baselineVerdict: { decision: 'below' },
        },
        {
          id: 'below',
          status: 'active' as const,
          profileHash: 'sha256:b',
          baselineVerdict: { decision: 'below' },
        },
      ],
    };
  }
  async recordDecision(input: { subscriptionId: string; action: string; ruleVersion?: string }) {
    this.decisions.push(input);
  }
  async completeWork() {}
  async retryWork() {}
}
