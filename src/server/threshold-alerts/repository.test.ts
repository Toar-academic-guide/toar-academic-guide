import { THRESHOLD_ALERT_CONSENT } from '@/lib/thresholdAlerts';
vi.mock('server-only', () => ({}));
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { saveThresholdAlertSignup, unsubscribeThresholdAlerts } from './repository';

const { execute, transaction, getDb } = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn(),
  getDb: vi.fn(),
}));
vi.mock('@/db/client', () => ({ getDb }));

const signup = {
  requestId: 'b783a6d4-0428-4ddd-827f-82d33251be52',
  email: 'student@example.com',
  phone: '+972501234567',
  institutions: ['tau', 'technion'] as const,
  degrees: ['cs'] as const,
  cycle: '2027' as const,
  consent: true as const,
  consentText: THRESHOLD_ALERT_CONSENT,
  sourcePath: '/threshold-alerts?institution=tau',
  attribution: {
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: 'thresholds_2027',
    referrer: 'https://example.com/article?phone=0501234567',
  },
};

describe('threshold alert signup storage', () => {
  beforeEach(() => {
    execute.mockReset().mockResolvedValue({ rows: [] });
    transaction.mockReset().mockImplementation((fn) => fn({ execute }));
    getDb.mockReturnValue({ transaction });
  });

  it('stores the signup through the insert-only function without putting the phone in SQL text', async () => {
    await saveThresholdAlertSignup({
      ...signup,
      institutions: [...signup.institutions],
      degrees: [...signup.degrees],
    });
    const queries = execute.mock.calls.map(([query]) => new PgDialect().sqlToQuery(query));
    expect(queries[0].sql).toMatch(/statement_timeout/);
    expect(queries[1].sql).toContain('public.store_threshold_alert_signup');
    expect(queries[1].sql).not.toContain(signup.phone);
    expect(queries[1].sql).not.toContain(signup.email);
    const payload = JSON.parse(queries[1].params[0] as string);
    expect(payload).toMatchObject({
      requestId: signup.requestId,
      email: signup.email,
      phone: signup.phone,
      institutions: ['tau', 'technion'],
      degrees: ['cs'],
      cycle: '2027',
      consent: true,
      consentText: THRESHOLD_ALERT_CONSENT,
      sourcePath: '/threshold-alerts',
    });
    expect(payload.attribution.referrer).toBe('https://example.com');
    expect(JSON.stringify(payload)).not.toContain('0501234567');
    expect(payload).not.toHaveProperty('prepConsent');
  });
});

// The production pg adapter returns { rows }; isolated postgres.js fixtures return an array.
it.each([{ rows: [{ removed: true }] }, [{ removed: true }]])(
  'reads suppression result from either supported adapter',
  async (result) => {
    execute.mockReset().mockResolvedValueOnce(undefined).mockResolvedValueOnce(result);
    transaction.mockImplementation((fn) => fn({ execute }));
    getDb.mockReturnValue({ transaction });
    expect(await unsubscribeThresholdAlerts('2468beac-1c33-4d4f-941a-4deed2cdd47d')).toBe(true);
    const query = new PgDialect().sqlToQuery(execute.mock.calls[1][0]);
    expect(query.sql).toContain('unsubscribe_threshold_alert_signup');
    expect(query.sql).not.toContain('2468beac');
  },
);
