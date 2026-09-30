import { randomBytes } from 'node:crypto';
import { Webhook } from 'svix';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { verifyAdmissionAlertWebhook } from './webhookService';
import {
  deriveAdmissionAlertUnsubscribeToken,
  hashAdmissionAlertToken,
} from './unsubscribeService';

describe('verified, privacy-safe admission webhook', () => {
  const secret = `whsec_${randomBytes(32).toString('base64')}`;
  const payload = JSON.stringify({
    type: 'email.delivered',
    created_at: '2026-09-29T12:00:00Z',
    data: {
      email_id: 'provider-1',
      to: ['private@example.org'],
      subject: 'private-subject',
      tags: { admission_alert: 'a'.repeat(64), grades: 'private-grades' },
    },
  });
  function headers(raw = payload, at = new Date()) {
    return new Headers({
      'svix-id': 'event-1',
      'svix-timestamp': String(Math.floor(at.getTime() / 1000)),
      'svix-signature': new Webhook(secret).sign('event-1', at, raw),
    });
  }
  it('verifies raw content and returns only correlation and event facts', () => {
    expect(verifyAdmissionAlertWebhook(payload, headers(), secret)).toEqual({
      id: 'event-1',
      type: 'email.delivered',
      occurredAt: '2026-09-29T12:00:00Z',
      providerMessageId: 'provider-1',
      idempotencyKey: `admission-alert:${'a'.repeat(64)}`,
    });
  });
  it('rejects a forged signature, mutated bytes and stale replay signatures', () => {
    expect(() => verifyAdmissionAlertWebhook(payload, new Headers(), secret)).toThrow();
    expect(() => verifyAdmissionAlertWebhook(`${payload} `, headers(), secret)).toThrow();
    expect(() =>
      verifyAdmissionAlertWebhook(
        payload,
        headers(payload, new Date(Date.now() - 600_000)),
        secret,
      ),
    ).toThrow();
  });
  it('ignores unsupported events only after signature verification', () => {
    const raw = JSON.stringify({ type: 'email.opened', data: { email_id: 'provider-1' } });
    expect(verifyAdmissionAlertWebhook(raw, headers(raw), secret)).toBeNull();
  });
  it('derives stable opaque tokens without storing their plaintext', () => {
    const key = randomBytes(32).toString('base64url');
    const token = deriveAdmissionAlertUnsubscribeToken('random-delivery-1', key);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(deriveAdmissionAlertUnsubscribeToken('random-delivery-1', key)).toBe(token);
    expect(deriveAdmissionAlertUnsubscribeToken('random-delivery-2', key)).not.toBe(token);
    expect(hashAdmissionAlertToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashAdmissionAlertToken(token)).not.toContain(token);
    expect(() => deriveAdmissionAlertUnsubscribeToken('delivery', 'short')).toThrow();
  });
});
