import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { accountSimulationConfiguration } from './admission-alert-account-simulation.mjs';

const approved = {
  GITHUB_ACTIONS: 'true',
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_RUN_ATTEMPT: '1',
  CONFIRM_SIMULATION: 'true',
  ADMISSION_ALERT_SIMULATION_USER_ID: '11111111-1111-4111-8111-111111111111',
  ADMISSION_ALERT_DATABASE_URL: 'postgresql://unused',
  ADMISSION_ALERT_RESEND_API_KEY: 're_test',
  ADMISSION_ALERT_TOKEN_SECRET: 's'.repeat(43),
};

describe('account-scoped admission-alert simulation', () => {
  it('requires an explicitly approved manual main run with automatic workers off', () => {
    expect(accountSimulationConfiguration(approved).recipient).toBe('amitm1630@gmail.com');
    for (const override of [
      { CONFIRM_SIMULATION: 'false' },
      { GITHUB_EVENT_NAME: 'schedule' },
      { GITHUB_REF: 'refs/heads/unreviewed' },
      { GITHUB_RUN_ATTEMPT: '2' },
      { ADMISSION_ALERT_SIMULATION_USER_ID: '' },
      { ADMISSION_ALERT_PROCESSING_ENABLED: 'true' },
      { ADMISSION_ALERT_DELIVERY_ENABLED: 'true' },
    ])
      expect(() => accountSimulationConfiguration({ ...approved, ...override })).toThrow();
  });

  it('has no schedule, arbitrary recipient, or automatic activation step', () => {
    const workflow = readFileSync(
      '.github/workflows/admission-alert-account-simulation.yml',
      'utf8',
    );
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: admissions-publication');
    expect(workflow).toContain('ref: main');
    expect(workflow).not.toMatch(/schedule:|gh variable set|recipient:/);
  });
});
