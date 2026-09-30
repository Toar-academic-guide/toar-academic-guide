import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { liveProofConfiguration } from './admission-alert-live-proof.mjs';

const approved = {
  ALERT_LIVE_PROOF: '1',
  ALERT_DB_INTEGRATION: '1',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/admission_alert_live_proof',
  GITHUB_ACTIONS: 'true',
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_RUN_ATTEMPT: '1',
  ADMISSION_ALERT_RESEND_API_KEY: 're_test',
};

describe('isolated admission-alert live proof', () => {
  it('does not enable live mail for ordinary tests', () => {
    expect(liveProofConfiguration({})).toBeNull();
  });
  it('allows only a manual first attempt on main with the dedicated local database', () => {
    expect(liveProofConfiguration(approved)?.recipient).toBe('amitm1630@gmail.com');
    for (const override of [
      { DATABASE_URL: 'postgresql://postgres:postgres@db.example.org/admission_alert_live_proof' },
      { DATABASE_URL: 'postgresql://postgres:postgres@localhost/production' },
      { ALERT_DB_INTEGRATION: '0' },
      { GITHUB_ACTIONS: 'false' },
      { GITHUB_EVENT_NAME: 'schedule' },
      { GITHUB_REF: 'refs/heads/unreviewed' },
      { GITHUB_RUN_ATTEMPT: '2' },
      { ADMISSION_ALERT_RESEND_API_KEY: '' },
    ]) {
      expect(() => liveProofConfiguration({ ...approved, ...override })).toThrow();
    }
  });
  it('has no schedule or production database credentials', () => {
    const workflow = readFileSync('.github/workflows/admission-alert-live-proof.yml', 'utf8');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: admissions-publication');
    expect(workflow).toContain('ref: main');
    expect(workflow).not.toMatch(
      /schedule:|secrets\.(?:ADMISSION_ALERT_DATABASE_URL|DATABASE_URL)|ADMISSION_ALERT_DELIVERY_ENABLED/,
    );
  });
});
