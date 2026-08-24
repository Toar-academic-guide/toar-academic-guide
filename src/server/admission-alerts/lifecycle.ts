export type AdmissionAlertSubscriptionStatus =
  | 'active'
  | 'needs_profile_refresh'
  | 'pending_delivery'
  | 'notified'
  | 'cancelled'
  | 'expired'
  | 'delivery_failed';

export type AdmissionAlertOutboxStatus =
  | 'pending'
  | 'processing'
  | 'accepted'
  | 'acceptance_unknown'
  | 'retryable'
  | 'failed'
  | 'suppressed';

export function queueAlertDelivery(
  subscriptionStatus: AdmissionAlertSubscriptionStatus,
  existingOutboxStatus: AdmissionAlertOutboxStatus | null,
): { status: 'queued' | 'not_queueable' | 'already_queued' } {
  if (existingOutboxStatus !== null) {
    return { status: 'already_queued' };
  }

  return subscriptionStatus === 'active' ? { status: 'queued' } : { status: 'not_queueable' };
}

export function canAttemptAlertDelivery(
  subscriptionStatus: AdmissionAlertSubscriptionStatus,
  outboxStatus: AdmissionAlertOutboxStatus,
): boolean {
  return (
    subscriptionStatus === 'pending_delivery' &&
    (outboxStatus === 'pending' || outboxStatus === 'retryable')
  );
}

export function cancelAlertSubscription(
  subscriptionStatus: AdmissionAlertSubscriptionStatus,
  outboxStatus: AdmissionAlertOutboxStatus | null,
): {
  subscriptionStatus: 'cancelled';
  outboxStatus: AdmissionAlertOutboxStatus | null;
  mayStillArrive: boolean;
} {
  if (subscriptionStatus === 'notified' || outboxStatus === 'accepted') {
    return { subscriptionStatus: 'cancelled', outboxStatus, mayStillArrive: true };
  }

  if (outboxStatus === 'processing' || outboxStatus === 'acceptance_unknown') {
    return { subscriptionStatus: 'cancelled', outboxStatus, mayStillArrive: true };
  }

  return {
    subscriptionStatus: 'cancelled',
    outboxStatus: outboxStatus ? 'suppressed' : null,
    mayStillArrive: false,
  };
}

export function acceptAlertDelivery(
  subscriptionStatus: AdmissionAlertSubscriptionStatus,
  outboxStatus: AdmissionAlertOutboxStatus,
): {
  subscriptionStatus: 'notified' | AdmissionAlertSubscriptionStatus;
  outboxStatus: AdmissionAlertOutboxStatus;
} {
  if (subscriptionStatus !== 'pending_delivery' || outboxStatus === 'suppressed') {
    return { subscriptionStatus, outboxStatus };
  }

  return { subscriptionStatus: 'notified', outboxStatus: 'accepted' };
}
