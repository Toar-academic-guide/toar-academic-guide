import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { renderAdmissionAlertEmail, readAdmissionAlertEmailConfig } from './emailTemplate';
import { createResendAdmissionAlertProvider } from './resendProvider';

const config = {
  origin: 'https://myway.example.org',
  from: 'alerts@example.org',
  supportEmail: 'support@example.org',
};
const input = {
  recipient: 'verified@example.org',
  institutionName: 'אוניברסיטת תל אביב',
  programName: 'מדעי המחשב',
  reviewedAt: new Date('2026-09-29T12:00:00Z'),
  cycle: '2026',
  unsubscribeToken: 'a'.repeat(43),
};

describe('admission-alert Hebrew email', () => {
  it.each(['אוניברסיטת תל אביב', 'אוניברסיטת בן-גוריון בנגב'])(
    'renders %s in RTL with cautious copy and every control',
    async (institutionName) => {
      const payload = await renderAdmissionAlertEmail({ ...input, institutionName }, config);
      expect(payload.html).toContain('lang="he" dir="rtl"');
      for (const content of [institutionName, input.programName, '29.09.2026', '2026']) {
        expect(payload.html).toContain(content);
        expect(payload.text).toContain(content);
      }
      for (const url of [
        `${config.origin}/app/calculator`,
        `${config.origin}/app/profile#admission-alerts`,
        `${config.origin}/admission-alerts/unsubscribe#token=${input.unsubscribeToken}`,
      ]) {
        expect(payload.html).toContain(url);
        expect(payload.text).toContain(url);
      }
      expect(payload.html).toContain(`mailto:${config.supportEmail}`);
      expect(payload.text).toContain(config.supportEmail);
      expect(payload.text).toContain('אינה הבטחת קבלה');
      expect(payload.text).toContain('ייתכן שהמסלול שבחרת נמצא כעת בהישג יד');
      expect(payload.reply_to).toBe(config.supportEmail);
    },
  );

  it('escapes names and excludes academic inputs and recipient from message content', async () => {
    const privateInput = {
      ...input,
      programName: '<script>alert("unsafe")</script>',
      grades: 'private-grade-99',
      psychometricScore: 'private-score-799',
      profileHash: 'private-profile-hash',
      profile: { name: 'private-person-name' },
    };
    const payload = await renderAdmissionAlertEmail(privateInput, config);
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).toContain('&lt;script&gt;');
    for (const privateValue of [
      'private-grade-99',
      'private-score-799',
      'private-profile-hash',
      'private-person-name',
      input.recipient,
    ]) {
      expect(payload.html + payload.text).not.toContain(privateValue);
    }
    expect(Object.keys(payload).sort()).toEqual([
      'from',
      'html',
      'reply_to',
      'subject',
      'text',
      'to',
    ]);
  });

  it('renders deterministically for the same frozen delivery context', async () => {
    expect(await renderAdmissionAlertEmail(input, config)).toEqual(
      await renderAdmissionAlertEmail(input, config),
    );
  });

  it('sends only the rendered whitelist to the provider', async () => {
    const payload = await renderAdmissionAlertEmail(input, config);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: 'test-email' }));
    const extendedPayload = { ...payload, profileHash: 'must-not-leave-server' };
    await createResendAdmissionAlertProvider({ apiKey: 're_test', fetcher }).send({
      idempotencyKey: 'same-logical-delivery',
      payload: extendedPayload,
    });
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual(payload);
  });

  it('requires sender, support and an HTTPS application origin', () => {
    const env = {
      ADMISSION_ALERT_FROM_EMAIL: config.from,
      ADMISSION_ALERT_SUPPORT_EMAIL: config.supportEmail,
      ADMISSION_ALERT_APP_ORIGIN: config.origin,
    };
    expect(readAdmissionAlertEmailConfig(env)).toEqual(config);
    for (const key of Object.keys(env)) {
      expect(() => readAdmissionAlertEmailConfig({ ...env, [key]: '' })).toThrow();
    }
    for (const origin of [
      'http://example.org',
      'https://user:pass@example.org',
      'https://example.org/path',
      'https://example.org?q=x',
    ]) {
      expect(() =>
        readAdmissionAlertEmailConfig({ ...env, ADMISSION_ALERT_APP_ORIGIN: origin }),
      ).toThrow();
    }
    expect(() =>
      readAdmissionAlertEmailConfig({ ...env, ADMISSION_ALERT_FROM_EMAIL: 'not-a-mailbox' }),
    ).toThrow();
  });
});
