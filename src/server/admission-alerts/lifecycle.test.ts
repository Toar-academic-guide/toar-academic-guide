import { describe, expect, it } from 'vitest';

import {
  acceptAlertDelivery,
  canAttemptAlertDelivery,
  cancelAlertSubscription,
  queueAlertDelivery,
} from './lifecycle';

describe('admission alert lifecycle', () => {
  it('queues one pending delivery only from an active subscription', () => {
    expect(queueAlertDelivery('active', null)).toEqual({ status: 'queued' });
    expect(queueAlertDelivery('needs_profile_refresh', null)).toEqual({
      status: 'not_queueable',
    });
    expect(queueAlertDelivery('active', 'accepted')).toEqual({ status: 'already_queued' });
  });

  it('suppresses a queued delivery when the applicant cancels before provider acceptance', () => {
    expect(cancelAlertSubscription('active', 'pending')).toEqual({
      subscriptionStatus: 'cancelled',
      outboxStatus: 'suppressed',
      mayStillArrive: false,
    });
    expect(canAttemptAlertDelivery('cancelled', 'pending')).toBe(false);
  });

  it('closes the subscription only after provider acceptance', () => {
    expect(acceptAlertDelivery('pending_delivery', 'processing')).toEqual({
      subscriptionStatus: 'notified',
      outboxStatus: 'accepted',
    });
    expect(cancelAlertSubscription('pending_delivery', 'acceptance_unknown')).toMatchObject({
      subscriptionStatus: 'cancelled',
      mayStillArrive: true,
    });
  });
});
