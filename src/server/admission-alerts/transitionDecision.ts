export interface AlertTransitionSubscription {
  status:
    | 'active'
    | 'needs_profile_refresh'
    | 'pending_delivery'
    | 'notified'
    | 'cancelled'
    | 'expired'
    | 'delivery_failed';
  baselineVerdict: { decision?: unknown };
  profileHash: string;
}

export interface AlertTransitionEvaluation {
  decision: 'below' | 'eligible' | 'unavailable';
  isMathematicallyVerified: boolean;
  ruleVersion: string;
}

export type AlertTransitionDecision =
  | { action: 'queue_delivery'; ruleVersion: string }
  | { action: 'advance_baseline'; ruleVersion: string }
  | { action: 'pause_for_profile_refresh' }
  | { action: 'retry_later'; reason: 'evaluation_unavailable' }
  | { action: 'skip'; reason: 'subscription_not_active' | 'baseline_not_below' };

export function decideAdmissionAlertTransition(input: {
  subscription: AlertTransitionSubscription;
  evaluatedProfileHash: string;
  evaluation: AlertTransitionEvaluation;
}): AlertTransitionDecision {
  if (input.subscription.status !== 'active') {
    return { action: 'skip', reason: 'subscription_not_active' };
  }
  if (input.subscription.profileHash !== input.evaluatedProfileHash) {
    return { action: 'pause_for_profile_refresh' };
  }
  if (input.subscription.baselineVerdict.decision !== 'below') {
    return { action: 'skip', reason: 'baseline_not_below' };
  }
  if (!input.evaluation.isMathematicallyVerified || input.evaluation.decision === 'unavailable') {
    return { action: 'retry_later', reason: 'evaluation_unavailable' };
  }
  if (input.evaluation.decision === 'eligible') {
    return { action: 'queue_delivery', ruleVersion: input.evaluation.ruleVersion };
  }
  return { action: 'advance_baseline', ruleVersion: input.evaluation.ruleVersion };
}
