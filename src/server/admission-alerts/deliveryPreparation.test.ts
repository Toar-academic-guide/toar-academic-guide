import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { freezeAlertPayload, materializeAlertPayload } from './deliveryPreparation';
import {
  deriveAdmissionAlertUnsubscribeToken,
  hashAdmissionAlertToken,
} from './unsubscribeService';

describe('private alert request snapshots', () => {
  const secret = 's'.repeat(43);
  const token = deriveAdmissionAlertUnsubscribeToken('delivery-id', secret);
  const payload = {
    from: 'alerts@example.org',
    to: 'user@example.org',
    reply_to: 'support@example.org',
    subject: 'Update',
    html: `<a href="https://example.org/admission-alerts/unsubscribe#token=${token}">Remove</a>`,
    text: `Remove: https://example.org/admission-alerts/unsubscribe#token=${token}`,
  };
  it('stores only a placeholder and reconstructs an identical request for retry', () => {
    const frozen = freezeAlertPayload(payload, token);
    expect(JSON.stringify(frozen)).not.toContain(token);
    expect(
      materializeAlertPayload(frozen, 'delivery-id', hashAdmissionAlertToken(token), secret),
    ).toEqual(payload);
  });
  it('refuses a rotated secret rather than changing an idempotent request', () => {
    expect(() =>
      materializeAlertPayload(
        freezeAlertPayload(payload, token),
        'delivery-id',
        hashAdmissionAlertToken(token),
        't'.repeat(43),
      ),
    ).toThrow('secret');
  });
});
