import { describe, expect, it } from 'vitest';

import { decideAdmissionAlertTransition } from './transitionDecision';

describe('admission alert transition decisions', () => {
  const subscription = {
    status: 'active' as const,
    baselineVerdict: { decision: 'below' as const },
    profileHash: 'sha256:profile-v1',
  };

  it('queues exactly a verified below-to-eligible institution transition', () => {
    expect(
      decideAdmissionAlertTransition({
        subscription,
        evaluatedProfileHash: 'sha256:profile-v1',
        evaluation: { decision: 'eligible', isMathematicallyVerified: true, ruleVersion: 'tau-v2' },
      }),
    ).toEqual({ action: 'queue_delivery', ruleVersion: 'tau-v2' });
  });

  it('advances a still-below baseline without sending an alert', () => {
    expect(
      decideAdmissionAlertTransition({
        subscription,
        evaluatedProfileHash: 'sha256:profile-v1',
        evaluation: { decision: 'below', isMathematicallyVerified: true, ruleVersion: 'tau-v2' },
      }),
    ).toEqual({ action: 'advance_baseline', ruleVersion: 'tau-v2' });
  });

  it('does not queue when a profile changed, verification is unavailable, or the subscription is inactive', () => {
    expect(
      decideAdmissionAlertTransition({
        subscription,
        evaluatedProfileHash: 'sha256:profile-v2',
        evaluation: { decision: 'eligible', isMathematicallyVerified: true, ruleVersion: 'tau-v2' },
      }),
    ).toEqual({ action: 'pause_for_profile_refresh' });

    expect(
      decideAdmissionAlertTransition({
        subscription,
        evaluatedProfileHash: 'sha256:profile-v1',
        evaluation: { decision: 'eligible', isMathematicallyVerified: false, ruleVersion: 'tau-v2' },
      }),
    ).toEqual({ action: 'retry_later', reason: 'evaluation_unavailable' });

    expect(
      decideAdmissionAlertTransition({
        subscription: { ...subscription, status: 'cancelled' },
        evaluatedProfileHash: 'sha256:profile-v1',
        evaluation: { decision: 'eligible', isMathematicallyVerified: true, ruleVersion: 'tau-v2' },
      }),
    ).toEqual({ action: 'skip', reason: 'subscription_not_active' });
  });
});
