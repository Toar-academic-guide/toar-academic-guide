import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { admissionAlertDeliveryConfiguration } from './deliveryRuntime';
import { parseAlertDeliveryArguments } from '../../../scripts/deliver-admission-alerts.mjs';
describe('protected admission alert delivery', () => {
  it('requires explicit activation and a scoped sending key', () => {
    expect(() => admissionAlertDeliveryConfiguration({})).toThrow('disabled');
    expect(() =>
      admissionAlertDeliveryConfiguration({ ADMISSION_ALERT_DELIVERY_ENABLED: 'true' }),
    ).toThrow('key');
    expect(
      admissionAlertDeliveryConfiguration({
        ADMISSION_ALERT_DELIVERY_ENABLED: 'true',
        ADMISSION_ALERT_RESEND_API_KEY: 're_test',
      }),
    ).toEqual({ apiKey: 're_test' });
  });
  it('requires an explicit CLI mode and defaults the protected workflow to dry-run', () => {
    expect(parseAlertDeliveryArguments(['--dry-run'])).toEqual({ dryRun: true });
    expect(parseAlertDeliveryArguments(['--send'])).toEqual({ dryRun: false });
    expect(() => parseAlertDeliveryArguments([])).toThrow();
    expect(() => parseAlertDeliveryArguments(['--recipient', 'someone@example.org'])).toThrow();
    const workflow = readFileSync('.github/workflows/admission-alert-delivery.yml', 'utf8');
    for (const value of [
      'environment: admissions-publication',
      'default: true',
      'ref: main',
      'group: admission-alert-delivery',
      'ADMISSION_ALERT_DELIVERY_ENABLED',
      'ADMISSION_ALERT_DATABASE_URL',
    ])
      expect(workflow).toContain(value);
  });
});
