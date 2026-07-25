import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('weekly admissions freshness workflow', () => {
  it('keeps schedules disabled unless explicitly enabled while preserving manual runs', async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain(
      "if: ${{ github.event_name == 'workflow_dispatch' || vars.ADMISSIONS_WEEKLY_ENABLED == 'true' }}",
    );
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('dry_run:');
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
      'SLACK_ADMISSIONS_REVIEW_CHANNEL_ID',
    ]) {
      expect(workflow).toContain(`test -n "$${configurationName}"`);
    }
  });
});

function readWorkflow() {
  return readFile(path.join(process.cwd(), '.github/workflows/admissions-freshness.yml'), 'utf8');
}
