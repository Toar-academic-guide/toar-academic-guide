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

  it('does not let an unavailable subscription block a healthy peer', async () => {
    const repository = new MemoryRepository();
    await processAdmissionAlertTransitionWork({
      repository,
      evaluate: async ({ subscriptionId }) =>
        subscriptionId === 'eligible'
          ? { decision: 'unavailable', isMathematicallyVerified: false, ruleVersion: 'v2' }
          : { decision: 'below', isMathematicallyVerified: true, ruleVersion: 'v2' },
    });

    expect(repository.decisions).toContainEqual(
      expect.objectContaining({ subscriptionId: 'below', action: 'advance_baseline' }),
    );
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

  it('isolates evaluator exceptions and rejects a verdict from the wrong rule version', async () => {
    const repository = new MemoryRepository();
    await processAdmissionAlertTransitionWork({
      repository,
      evaluate: async ({ subscriptionId }) => {
        if (subscriptionId === 'eligible') throw new Error('private academic inputs');
        return {
          decision: 'eligible',
          isMathematicallyVerified: true,
          ruleVersion: 'wrong-version',
        };
      },
    });
    expect(repository.decisions.map((decision) => decision.action)).toEqual([
      'retry_later',
      'retry_later',
    ]);
    expect(JSON.stringify(repository.decisions)).not.toContain('private');
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
      claimToken: 'claim-1',
      transitionId: 'transition-1',
      institutionId: 'tau',
      programId: 'tau_cs',
      afterVersion: 'v2',
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
  async recordDecision(
    input: Parameters<AdmissionAlertTransitionProcessorRepository['recordDecision']>[0],
  ) {
    this.decisions.push({
      transitionId: input.work.transitionId,
      subscriptionId: input.subscription.id,
      ...input.decision,
    });
    return true;
  }
  async finishBatch() {
    return 'completed' as const;
  }
  async releaseWork() {}
}
