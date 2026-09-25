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

  it('passes a comma-separated dispatch target list as repeated safe target arguments', async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain('TARGET_INPUT: ${{ inputs.target }}');
    expect(workflow).toContain('IFS=\',\' read -r -a targets <<< "$TARGET_INPUT"');
    expect(workflow).toContain('args+=(--target "$target")');
  });

  it('sets an explicit bot identity before committing a generated review branch', async () => {
    const workflow = await readWorkflow();

    expect(workflow).toContain('git config user.name "admissions-automation[bot]"');
    expect(workflow).toContain(
      'git config user.email "admissions-automation[bot]@users.noreply.github.com"',
    );
  });

  it('uses the GitHub App token rather than checkout credentials for review branches', async () => {
    const workflow = await readWorkflow();
    const checkout = stepBlock(workflow, 'Checkout repository');
    const appToken = stepBlock(workflow, 'Create GitHub App token');
    const metadata = stepBlock(
      workflow,
      'Load existing review metadata without executing the generated branch',
    );

    expect(checkout).toContain('persist-credentials: false');
    expect(appToken).toContain('uses: actions/create-github-app-token@v2');
    expect(appToken).toContain('id: admissions_app');
    expect(appToken).toContain('if: ${{ !inputs.dry_run }}');
    expect(metadata).toContain(
      'GH_TOKEN: ${{ inputs.dry_run && github.token || steps.admissions_app.outputs.token }}',
    );
    expect(metadata).toContain(
      'git remote set-url origin "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"',
    );
    expect(workflow.indexOf('Create GitHub App token')).toBeLessThan(
      workflow.indexOf('Load existing review metadata without executing the generated branch'),
    );
    expect(metadata.indexOf('git remote set-url origin')).toBeLessThan(
      metadata.indexOf('git fetch origin main'),
    );
    expect(metadata).toContain('git ls-remote --exit-code --heads origin "$REVIEW_BRANCH"');
    expect(metadata).toMatch(
      /else\s+remote_status=\$\?\s+if \[ "\$remote_status" -ne 2 \]; then\s+exit "\$remote_status"\s+fi\s+fi/,
    );
  });
});

function readWorkflow() {
  return readFile(path.join(process.cwd(), '.github/workflows/admissions-freshness.yml'), 'utf8');
}

function stepBlock(workflow: string, stepName: string) {
  const start = workflow.indexOf(`      - name: ${stepName}`);
  const end = workflow.indexOf('\n      - name: ', start + 1);

  return workflow.slice(start, end === -1 ? undefined : end);
}
