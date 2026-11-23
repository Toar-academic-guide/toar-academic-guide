import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THRESHOLD_ALERT_CONSENT } from '@/lib/thresholdAlerts';
import { ENQUIRY_CONSENT, ENQUIRY_PREP_CONSENT } from '@/lib/enquiries';

describe('threshold alert signup migration', () => {
  const sql = readFileSync('src/db/migrations/0045_threshold_alert_signups.sql', 'utf8');

  it('stores the alert consent in an insert-only function and keeps browsers from reading it', () => {
    expect(sql).toContain(THRESHOLD_ALERT_CONSENT);
    expect(sql).not.toContain(ENQUIRY_CONSENT);
    expect(sql).not.toContain(ENQUIRY_PREP_CONSENT);
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain(
      'REVOKE ALL ON TABLE public.threshold_alert_signups FROM PUBLIC, anon, authenticated, app_runtime',
    );
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.store_threshold_alert_signup(jsonb) FROM PUBLIC, anon, authenticated',
    );
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.store_threshold_alert_signup(jsonb) TO app_runtime',
    );
    expect(sql).not.toMatch(/GRANT\s+SELECT[\s\S]*threshold_alert_signups[\s\S]*app_runtime/i);
    expect(sql).toContain('ON CONFLICT (request_id) DO NOTHING');
  });
});
