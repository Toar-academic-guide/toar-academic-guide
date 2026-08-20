import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('weekly admissions freshness workflow', () => {
  it('gates scheduled writes while preserving manual dry runs and explicit modes', async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain("cron: '0 3 * * 0'");
    expect(workflow).toContain("vars.ADMISSIONS_WEEKLY_ENABLED == 'true'");
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('dry_run:');
    expect(workflow).toContain('operational_proof');
    expect(workflow).toContain('--mode "$ADMISSIONS_MODE"');
    expect(workflow).toContain('environment: admissions-publication');
    expect(workflow).toContain(
      'DATABASE_URL: ${{ inputs.dry_run && secrets.OPS_DATABASE_URL || secrets.DATABASE_URL }}',
    );
  });

  it('validates required configuration by presence before a write-capable run', async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain('name: Validate weekly admissions configuration');
    for (const configurationName of [
      'DATABASE_URL',
      'ADMISSIONS_GITHUB_APP_ID',
      'ADMISSIONS_GITHUB_APP_PRIVATE_KEY',
      'ADMISSIONS_CYCLE',
      'SLACK_BOT_TOKEN',
      'SLACK_READY_PR_CHANNEL_ID',
    ]) {
      expect(workflow).toContain(`test -n "$${configurationName}"`);
    }
    expect(workflow).toContain('npm run admissions:slack-preflight');
  });
});

function readWorkflow() {
  return readFile(path.join(process.cwd(), '.github/workflows/admissions-freshness.yml'), 'utf8');
}
