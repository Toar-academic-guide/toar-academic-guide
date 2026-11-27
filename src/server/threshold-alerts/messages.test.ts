import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { buildThresholdAlertMessages } from './messages';
const signup = {
  unsubscribeToken: '2468beac-1c33-4d4f-941a-4deed2cdd47d',
  unsubscribedAt: null,
  notifiedAt: null,
};
const update = { institution: 'אוניברסיטה', degree: 'לימודים <script>' };
it('includes the same contact-free unsubscribe in email HTML/text and WhatsApp', () => {
  const result = buildThresholdAlertMessages(signup, update);
  for (const body of [result.email.text, result.email.html, result.whatsapp.text]) {
    expect(body).toContain(`/threshold-alerts/unsubscribe#token=${signup.unsubscribeToken}`);
    expect(body).toContain('2027');
  }
  expect(result.email.html).not.toContain('<script>');
  expect(result.email.html).toContain('&lt;script&gt;');
});
describe('suppression', () => {
  it.each([{ unsubscribedAt: new Date() }, { notifiedAt: new Date() }])(
    'rejects inactive or already notified contacts',
    (override) => {
      expect(() => buildThresholdAlertMessages({ ...signup, ...override }, update)).toThrow();
    },
  );
  it('rejects missing suppression state and invalid tokens', () => {
    expect(() =>
      buildThresholdAlertMessages({ ...signup, unsubscribeToken: 'bad' }, update),
    ).toThrow();
    // Runtime exporter mismatch must fail closed rather than send.
    expect(() =>
      buildThresholdAlertMessages({ ...signup, unsubscribedAt: undefined } as never, update),
    ).toThrow();
  });
});
