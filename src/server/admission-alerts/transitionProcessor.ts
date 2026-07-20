import { decideAdmissionAlertTransition, type AlertTransitionDecision } from './transitionDecision';

export interface AdmissionAlertTransitionProcessorRepository {
  claimNextWork(): Promise<{
    id: string;
    subscriptions: Array<{
      id: string;
      status:
        | 'active'
        | 'needs_profile_refresh'
        | 'pending_delivery'
        | 'notified'
        | 'cancelled'
        | 'expired'
        | 'delivery_failed';
      profileHash: string;
      baselineVerdict: { decision?: unknown };
    }>;
  } | null>;
  recordDecision(input: {
    subscriptionId: string;
    action: string;
    ruleVersion?: string;
  }): Promise<void>;
  completeWork(workId: string): Promise<void>;
  retryWork(workId: string): Promise<void>;
}

export async function processAdmissionAlertTransitionWork(input: {
  repository: AdmissionAlertTransitionProcessorRepository;
  evaluate: (subscription: { subscriptionId: string; profileHash: string }) => Promise<{
    decision: 'below' | 'eligible' | 'unavailable';
    isMathematicallyVerified: boolean;
    ruleVersion: string;
  }>;
}): Promise<
  | { status: 'idle' }
  | { status: 'retry_later' }
  | { status: 'completed'; processedSubscriptionCount: number }
> {
  const work = await input.repository.claimNextWork();
  if (!work) return { status: 'idle' };

  const decisions: Array<{ subscriptionId: string; decision: AlertTransitionDecision }> = [];
  for (const subscription of work.subscriptions) {
    const evaluation = await input.evaluate({
      subscriptionId: subscription.id,
      profileHash: subscription.profileHash,
    });
    const decision = decideAdmissionAlertTransition({
      subscription,
      evaluatedProfileHash: subscription.profileHash,
      evaluation,
    });
    if (decision.action === 'retry_later') {
      await input.repository.retryWork(work.id);
      return { status: 'retry_later' };
    }
    decisions.push({ subscriptionId: subscription.id, decision });
  }

  for (const item of decisions) {
    if (item.decision.action === 'queue_delivery' || item.decision.action === 'advance_baseline') {
      await input.repository.recordDecision({
        subscriptionId: item.subscriptionId,
        action: item.decision.action,
        ruleVersion: item.decision.ruleVersion,
      });
    }
  }
  await input.repository.completeWork(work.id);
  return { status: 'completed', processedSubscriptionCount: work.subscriptions.length };
}
