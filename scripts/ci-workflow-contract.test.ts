import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

// js-yaml is already installed (ESLint's dependency); no new dependency needed.
const { load } = createRequire(import.meta.url)('js-yaml') as {
  load: (source: string) => Workflow;
};
type Step = {
  name?: string;
  id?: string;
  if?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, string>;
};
type Job = {
  name: string;
  needs?: string | string[];
  if?: string;
  concurrency?: { group: string; 'cancel-in-progress': boolean };
  outputs?: Record<string, string>;
  services?: Record<string, { image: string }>;
  steps: Step[];
};
type Workflow = {
  on: Record<string, unknown> & { schedule?: { cron: string }[] };
  concurrency: { group: string; 'cancel-in-progress': string | boolean };
  jobs: Record<string, Job>;
};
const workflow = (name: string) => load(readFileSync(`.github/workflows/${name}.yml`, 'utf8'));
const ci = workflow('ci');
const fullGuard =
  "github.event_name != 'pull_request' || needs.production-sensitive-paths.outputs.docs_only != 'true'";
const skipGuard =
  "github.event_name == 'pull_request' && needs.production-sensitive-paths.outputs.docs_only == 'true'";
const guardedJobs = [
  'test',
  'db-migrations-and-seed',
  'admissions-verify',
  'build',
  'e2e-pr',
  'internal-data-health-smoke',
];

describe('CI minutes and gate contracts', () => {
  it('keeps every CI check name stable', () => {
    expect(Object.fromEntries(Object.entries(ci.jobs).map(([id, job]) => [id, job.name]))).toEqual({
      'production-sensitive-paths': 'Classify production-sensitive changes',
      quality: 'Lint, typecheck & security',
      'operational-schema': 'Production operational schema preflight',
      'operational-schema-gate': 'Production operational schema gate',
      test: 'Unit tests & coverage',
      'db-migrations-and-seed': 'Disposable Postgres migration and seed',
      'admissions-verify': 'Admissions evidence gates',
      build: 'Build application',
      'e2e-pr': 'Playwright PR smoke',
      'internal-data-health-smoke': 'Internal data-health smoke',
      e2e: 'E2E smoke tests',
      'db-seed-verify': 'DB-backed catalogue verification',
      'db-operational-verify': 'Operational DB verification',
      'pr-gate-integrity': 'PR gate integrity',
    });
    expect(ci.on).toHaveProperty('pull_request');
    expect(JSON.stringify(ci.on)).not.toContain('paths-ignore');
  });

  it('cancels PR refs only, preserving every main push preflight', () => {
    expect(ci.concurrency).toEqual({
      group:
        "ci-${{ github.workflow }}-${{ github.event_name == 'pull_request' && github.ref || github.sha }}",
      'cancel-in-progress': "${{ github.event_name == 'pull_request' }}",
    });
  });

  it.each(guardedJobs)('guards every step of %s (including future steps)', (id) => {
    const job = ci.jobs[id];
    expect(job.needs).toContain('production-sensitive-paths');
    const [notice, ...heavySteps] = job.steps;
    expect(notice.if).toBe(`\${{ ${skipGuard} }}`);
    expect(notice.run).toContain('echo ');
    expect(notice.with).toBeUndefined();
    expect(heavySteps.length).toBeGreaterThan(0);
    for (const step of heavySteps) {
      expect(step.if, `${id}: ${step.name}`).toBe(
        step.name?.startsWith('Upload ')
          ? `\${{ failure() && (${fullGuard}) }}`
          : `\${{ ${fullGuard} }}`,
      );
    }
    // Docs-only jobs must be scheduled, rather than skipped at job level.
    expect(job.if ?? '').not.toContain('docs_only');
  });

  it('disables disposable Postgres only on positively classified docs PRs', () => {
    expect(ci.jobs['db-migrations-and-seed'].services?.postgres.image).toBe(
      `\${{ (${fullGuard}) && 'postgres:16' || '' }}`,
    );
    expect(ci.jobs['production-sensitive-paths'].outputs?.docs_only).toBe(
      '${{ steps.classify.outputs.docs_only }}',
    );
    expect(ci.jobs.quality.if).toBeUndefined();
    expect(ci.jobs.quality.steps.every((step) => step.if === undefined)).toBe(true);
  });

  it('blocks a failed classifier, skipped build, or either unsuccessful smoke', () => {
    const gate = ci.jobs['pr-gate-integrity'];
    expect(gate.if).toBe("${{ always() && github.event_name == 'pull_request' }}");
    expect(gate.needs).toEqual([
      'production-sensitive-paths',
      'build',
      'e2e-pr',
      'internal-data-health-smoke',
    ]);
    const step = gate.steps[0];
    expect(step.env).toEqual({
      CLASSIFY_RESULT: '${{ needs.production-sensitive-paths.result }}',
      BUILD_RESULT: '${{ needs.build.result }}',
      PLAYWRIGHT_RESULT: '${{ needs.e2e-pr.result }}',
      DATA_HEALTH_RESULT: '${{ needs.internal-data-health-smoke.result }}',
    });
    const success = Object.fromEntries(Object.keys(step.env!).map((key) => [key, 'success']));
    execFileSync('bash', ['-c', step.run!], { env: { ...process.env, ...success } });
    for (const key of Object.keys(success)) {
      for (const result of ['failure', 'skipped', 'cancelled', '']) {
        expect(() =>
          execFileSync('bash', ['-c', step.run!], {
            env: { ...process.env, ...success, [key]: result },
            stdio: 'pipe',
          }),
        ).toThrow();
      }
    }
  });
});

describe('Preview minutes contracts', () => {
  const preview = workflow('playwright-preview');
  const job = preview.jobs['playwright-preview'];
  it('rejects foreign hosts before entering the branch cancellation group', () => {
    expect(preview.concurrency).toEqual({
      group: 'playwright-preview-${{ github.event.deployment.id }}',
      'cancel-in-progress': false,
    });
    expect(job.concurrency).toEqual({
      group: 'playwright-preview-${{ github.ref_name || github.event.deployment.sha }}',
      'cancel-in-progress': true,
    });
    for (const filter of [
      "github.event.deployment_status.state == 'success'",
      "github.event.deployment_status.environment == 'Preview – toar-academic-guide'",
      "github.event.deployment_status.target_url != ''",
      "contains(github.event.deployment_status.target_url, 'toar-academic-guide')",
      "contains(github.event.deployment_status.target_url, '.vercel.app')",
      "startsWith(github.event.deployment_status.target_url, 'https://toar-academic-guide-')",
      "endsWith(github.event.deployment_status.target_url, '-amitm1630-6681s-projects.vercel.app')",
    ])
      expect(job.if).toContain(filter);
    expect(job.steps[0].env).toEqual({
      PREVIEW_GITHUB_REF: '${{ github.ref }}',
      PREVIEW_GITHUB_REF_NAME: '${{ github.ref_name }}',
      DEPLOYMENT_SHA: '${{ github.event.deployment.sha }}',
      DEPLOYMENT_REF: '${{ github.event.deployment.ref }}',
    });
  });
  it('classifies the deployed SHA with full history and guards every heavy step', () => {
    expect(job.steps[1].with).toEqual({
      ref: '${{ github.event.deployment.sha }}',
      'fetch-depth': 0,
    });
    const classify = job.steps[2];
    expect(classify.id).toBe('classify');
    expect(classify.run).toContain('git show origin/main:scripts/production-sensitive-paths.mjs');
    expect(classify.run).toContain('git diff --name-only "origin/main...$DEPLOYED_SHA"');
    expect(job.steps[3].if).toBe("${{ steps.classify.outputs.docs_only == 'true' }}");
    for (const step of job.steps.slice(4)) {
      expect(step.if).toBe(
        step.name?.startsWith('Upload ')
          ? "${{ failure() && steps.classify.outputs.docs_only != 'true' }}"
          : "${{ steps.classify.outputs.docs_only != 'true' }}",
      );
    }
  });
  it.each(['docs_only=true', 'docs_only=false', '', 'error', 'diff-error', 'show-error'])(
    'fails open when the base classifier/diff returns %s',
    (result) => {
      const dir = mkdtempSync(path.join(tmpdir(), 'preview-classification-'));
      try {
        // Stub git only; execute the actual workflow shell and actual Node runtime.
        writeFileSync(
          path.join(dir, 'git'),
          `#!/bin/bash\nif [[ "$1" == "show" ]]; then\n  ${result === 'show-error' ? 'exit 1' : `printf '%s\\n' '${result === 'error' ? 'throw new Error("broken classifier")' : `process.stdout.write(${JSON.stringify(result + '\n')})`}'`}\nelse\n  ${result === 'diff-error' ? 'exit 1' : 'echo README.md'}\nfi\n`,
          { mode: 0o755 },
        );
        const output = path.join(dir, 'output');
        execFileSync('bash', ['-e', '-o', 'pipefail', '-c', job.steps[2].run!], {
          env: {
            ...process.env,
            PATH: `${dir}:${process.env.PATH}`,
            RUNNER_TEMP: dir,
            GITHUB_OUTPUT: output,
            DEPLOYED_SHA: 'test-sha',
          },
          stdio: 'pipe',
        });
        const flags = readFileSync(output, 'utf8').trim().split('\n');
        expect(flags.at(-1)).toBe(
          result === 'docs_only=true' ? 'docs_only=true' : 'docs_only=false',
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );
});

describe('alert cron and operations documentation contracts', () => {
  it.each(['processing', 'delivery', 'cycle-reset'])(
    '%s keeps dispatch and hourly-or-less schedules',
    (name) => {
      const alert = workflow(`admission-alert-${name}`);
      expect(alert.on).toHaveProperty('workflow_dispatch');
      for (const { cron } of alert.on.schedule!) {
        expect(cron).toMatch(/^\d+ (?:\*|\d+) \* \* \*$/);
      }
      if (name === 'processing') expect(alert.on).toHaveProperty('workflow_call');
      if (name !== 'cycle-reset') {
        expect(Object.values(alert.jobs)[0].if).toBe(
          `\${{ vars.ADMISSION_ALERT_${name.toUpperCase()}_ENABLED == 'true' || github.event_name == 'workflow_dispatch' }}`,
        );
      }
    },
  );
  it('runs retention daily even with both pipelines disabled', () => {
    const reset = workflow('admission-alert-cycle-reset');
    expect(reset.on.schedule).toEqual([{ cron: '23 * * * *' }, { cron: '41 1 * * *' }]);
    expect(reset.jobs['expire-prior-cycles'].if).toBe(
      "github.event_name == 'workflow_dispatch' || github.event.schedule == '41 1 * * *' || (github.event.schedule == '23 * * * *' &&\n  (vars.ADMISSION_ALERT_PROCESSING_ENABLED == 'true' || vars.ADMISSION_ALERT_DELIVERY_ENABLED == 'true'))",
    );
    expect(reset.jobs['expire-prior-cycles'].steps.at(-1)?.run).toBe('npm run admissions:expire');
    expect(readFileSync('scripts/expire-admission-alerts.mjs', 'utf8')).toContain(
      'prune_retained_data',
    );
  });
  it('publishes no raw IPv4 addresses in WAF evidence', () => {
    expect(readFileSync('docs/ops/vercel-waf-rate-limits.md', 'utf8')).not.toMatch(
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
    );
  });
});
