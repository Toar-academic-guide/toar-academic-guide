import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

// Load the existing ESLint dependency exactly as ci-workflow-contract.test.ts does.
const { load } = createRequire(import.meta.url)('js-yaml') as {
  load: (source: string) => Workflow;
};
type Step = {
  id?: string;
  uses?: string;
  if?: string;
  shell?: string;
  run?: string;
  env?: Record<string, string>;
  with?: Record<string, unknown>;
};
type Job = {
  environment: string;
  env?: Record<string, string>;
  steps: Step[];
};
type Workflow = {
  on: Record<string, { inputs: Record<string, unknown> }>;
  permissions: Record<string, string>;
  concurrency: { group: string; 'cancel-in-progress': boolean };
  jobs: Record<string, Job>;
};
const workflow = (name: string) => load(readFileSync(`.github/workflows/${name}.yml`, 'utf8'));
const resolveWorkflow = () => workflow('admissions-review-resolve');
const resolveJob = () => {
  const jobs = Object.values(resolveWorkflow().jobs);
  expect(jobs).toHaveLength(1);
  return jobs[0];
};
const step = (id: string) => {
  const result = resolveJob().steps.find((entry) => entry.id === id);
  expect(result, `Missing ${id} step`).toBeDefined();
  return result!;
};
const id = '0b38bb88-4c4f-4b4a-a74e-18802ff29961';
const otherId = '4e4b45c6-2a0a-48df-b23a-3821ed235cd8';

describe('admissions review resolution dispatch workflow', () => {
  it('accepts only manual dispatch with the required action, IDs and actor inputs', () => {
    const definition = resolveWorkflow();
    expect(Object.keys(definition.on)).toEqual(['workflow_dispatch']);
    const inputs = definition.on.workflow_dispatch.inputs;
    expect(Object.keys(inputs).sort()).toEqual(['action', 'actor', 'ids']);
    expect(inputs.action).toMatchObject({
      type: 'choice',
      options: ['approve', 'reject'],
      required: true,
    });
    expect(inputs.ids).toMatchObject({ type: 'string', required: true });
    expect(inputs.actor).toMatchObject({ type: 'string', required: true });
  });

  it('keeps read-only permissions and serializes runs without cancellation', () => {
    expect(resolveWorkflow().permissions).toEqual({ contents: 'read' });
    expect(resolveWorkflow().concurrency).toEqual({
      group: 'admissions-review-resolve',
      'cancel-in-progress': false,
    });
  });

  it('uses the publication environment and only its runtime database secret', () => {
    const publication = workflow('admissions-publication').jobs['publish-reviewed-release'];
    const job = resolveJob();
    expect(job.environment).toBe(publication.environment);
    expect(job.environment).toBe('admissions-publication');
    const envs = [job.env, ...job.steps.map((entry) => entry.env)];
    const databaseEnvs = envs.filter((env) => env?.DATABASE_URL !== undefined);
    expect(databaseEnvs).toHaveLength(1);
    expect(databaseEnvs[0]?.DATABASE_URL).toBe(publication.env?.DATABASE_URL);
    expect(databaseEnvs[0]?.DATABASE_URL).toBe('${{ secrets.DATABASE_URL }}');
    const serialized = JSON.stringify(resolveWorkflow());
    expect(serialized.match(/secrets\.[\w]+/g)).toEqual(['secrets.DATABASE_URL']);
    expect(serialized).not.toContain('OPS_DATABASE_URL');
    for (const entry of job.steps) {
      // The secret belongs in env only, never in shell source or printed via its variable.
      expect(entry.run ?? '').not.toMatch(/secrets\.|DATABASE_URL|printenv|\bset\s+-x\b/);
    }
  });

  it('passes dispatch inputs through env rather than interpolating shell source', () => {
    const job = resolveJob();
    for (const entry of job.steps) {
      expect(entry.run ?? '').not.toMatch(/\$\{\{\s*inputs\./);
    }
    for (const name of ['validate', 'resolve']) {
      expect({ ...job.env, ...step(name).env }).toMatchObject({
        ACTION: '${{ inputs.action }}',
        ACTOR: '${{ inputs.actor }}',
      });
    }
    expect({ ...job.env, ...step('validate').env }).toHaveProperty('IDS', '${{ inputs.ids }}');
  });

  it('validates every input before resolution with strict bash and the CLI UUID pattern', () => {
    const steps = resolveJob().steps;
    const validate = step('validate');
    expect(steps.findIndex((entry) => entry.id === 'validate')).toBeLessThan(
      steps.findIndex((entry) => entry.id === 'resolve'),
    );
    expect(validate.shell).toBe('bash');
    expect(validate.run).toContain('set -euo pipefail');
    expect(validate.run).toContain(
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    );
    expect(validate.run).toMatch(/\[\[\s+-n\s+"\$ACTOR"\s+\]\]/);
    expect(validate.run).toContain('approve|reject');
    expect(validate.run).not.toContain('npm run admissions:');
  });

  it('resolves IDs sequentially, keeps stdout separate and preserves failures through tee', () => {
    const resolve = step('resolve');
    expect(resolve.shell).toBe('bash');
    expect(resolve.run).toContain('set -euo pipefail');
    expect(resolve.run).toContain('for id in "${ids[@]}"; do');
    for (const action of ['approve', 'reject']) {
      expect(resolve.run).toContain(
        `npm run admissions:${action}-review -- "$id" --actor "$ACTOR"`,
      );
    }
    expect(resolve.run).toContain('2>&1 1>&3 | tee -a "$audit_file" >&2');
    expect(resolve.run).toContain('3>&1');
    expect(resolve.run).not.toMatch(/\|\|\s*(?:true|:)|&\s*$/m);
    expect(JSON.stringify(resolveWorkflow())).not.toContain('continue-on-error');
  });

  it('loads a non-empty ID array and isolates every CLI invocation from stdin', () => {
    const script = step('resolve').run!;
    expect(script).toContain('mapfile -t ids < scratch/admissions-review-resolve/ids.txt');
    const guard = '[[ "${#ids[@]}" -gt 0 ]]';
    const loop = 'for id in "${ids[@]}"; do';
    expect(script).toContain(guard);
    expect(script).toContain(loop);
    expect(script.indexOf('mapfile -t ids')).toBeLessThan(script.indexOf(guard));
    expect(script.indexOf(guard)).toBeLessThan(script.indexOf(loop));
    expect(script).not.toMatch(/\bwhile\b[^\n]*\bread\b/);
    expect(script).not.toMatch(/\bdone\b[^\n]*<\s*scratch\/admissions-review-resolve\/ids\.txt/);
    const invocations = script.match(/^.*npm run admissions:(?:approve|reject)-review.*$/gm);
    expect(invocations).toHaveLength(2);
    for (const invocation of invocations!) {
      expect(invocation).toContain('--actor "$ACTOR" < /dev/null');
    }
  });

  it('always uploads the audit file and pins every action to a version or SHA', () => {
    const steps = resolveJob().steps;
    const upload = steps.find((entry) => entry.uses?.startsWith('actions/upload-artifact@'));
    expect(upload).toBeDefined();
    expect(upload?.uses).toBe('actions/upload-artifact@v7');
    expect(upload?.if).toBe('always()');
    expect(upload?.with?.path).toBe('scratch/admissions-review-resolve/audit.jsonl');
    expect(['warn', 'ignore']).toContain(upload?.with?.['if-no-files-found']);
    expect(steps.indexOf(upload!)).toBeGreaterThan(
      steps.findIndex((entry) => entry.id === 'resolve'),
    );
    for (const entry of steps.filter((entry) => entry.uses)) {
      expect(entry.uses).toMatch(/@(?:v\d+|[0-9a-f]{40})$/);
    }
    expect(steps.some((entry) => entry.uses === 'actions/checkout@v7')).toBe(true);
    expect(steps.find((entry) => entry.uses === 'actions/setup-node@v7')?.with).toMatchObject({
      'node-version': 24,
      cache: 'npm',
    });
    expect(steps.some((entry) => entry.run === 'npm ci')).toBe(true);
  });

  it('validates before Setup Node, npm ci and every database step', () => {
    const steps = resolveJob().steps;
    const validateIndex = steps.findIndex((entry) => entry.id === 'validate');
    const runtimeSteps = steps.filter(
      (entry) =>
        entry.uses?.startsWith('actions/setup-node@') ||
        entry.run?.includes('npm ci') ||
        entry.env?.DATABASE_URL ||
        entry.id === 'resolve',
    );
    expect(runtimeSteps).toHaveLength(3);
    for (const entry of runtimeSteps) {
      expect(validateIndex).toBeLessThan(steps.indexOf(entry));
    }
  });

  it('passes the GitHub triggering actor through env only to validation and resolution', () => {
    const job = resolveJob();
    for (const name of ['validate', 'resolve']) {
      expect({ ...job.env, ...step(name).env }).toHaveProperty(
        'TRIGGERING_ACTOR',
        '${{ github.triggering_actor }}',
      );
    }
    for (const entry of job.steps) {
      expect(entry.run ?? '').not.toContain('${{');
    }
  });

  it.each(['approve', 'reject'])('passes the triggering actor to the %s CLI', (action) => {
    const invocation = step('resolve')
      .run!.split('\n')
      .find((line) => line.includes(`npm run admissions:${action}-review`));
    expect(invocation).toContain('--triggering-actor "$TRIGGERING_ACTOR"');
  });

  it.each(['mallory', 'Jorje', ' amit2', 'operator'])(
    'rejects non-allowlisted actor %j during validation',
    (actor) => {
      const result = validate({ ACTOR: actor, TRIGGERING_ACTOR: 'github-operator' });
      expect(result.status).toBe(1);
      expect(result.stderr).toMatch(/Actor must be.*jorje.*amit/);
    },
  );

  it.each(['jorje', 'amit', ' \tjorje\n ', ' amit '])(
    'accepts allowlisted actor %j after trimming during validation',
    (actor) => {
      const result = validate({ ACTOR: actor, TRIGGERING_ACTOR: 'github-operator' });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
    },
  );

  it('rejects an empty triggering actor during validation', () => {
    const result = validate({ ACTOR: 'jorje', TRIGGERING_ACTOR: '' });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Triggering actor must be non-empty/);
  });

  function validate(inputs: {
    ACTION?: string;
    IDS?: string;
    ACTOR?: string;
    TRIGGERING_ACTOR?: string;
  }) {
    const script = step('validate').run!;
    const dir = mkdtempSync(path.join(tmpdir(), 'admissions-review-resolve-validation-'));
    try {
      // Run only validation, with no database credentials and no CLI execution.
      return spawnSync('bash', ['-c', script], {
        cwd: dir,
        env: {
          PATH: process.env.PATH,
          NODE_ENV: 'test',
          ACTION: 'reject',
          IDS: id,
          ACTOR: 'operator',
          TRIGGERING_ACTOR: 'github-operator',
          ...inputs,
        },
        encoding: 'utf8',
        timeout: 5000,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it.each([
    { ACTION: '' },
    { ACTION: 'delete' },
    { ACTOR: '' },
    { ACTOR: ' \t\n ' },
    { IDS: '' },
    { IDS: ' , ' },
    { IDS: 'bad-id' },
    { IDS: `${id},bad-id` },
    { IDS: `${id},` },
    { IDS: `,${id}` },
    { IDS: `${id},,${otherId}` },
    { IDS: `${id}\nbad-id` },
  ])('rejects malformed dispatch input %j locally without a database', (inputs) => {
    const result = validate(inputs);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Action must be|Actor must be|IDs must be/);
  });

  it.each(['approve', 'reject'])('accepts trimmed input for %s locally', (action) => {
    const result = validate({
      ACTION: action,
      IDS: ` ${id},\t${otherId.toUpperCase()} `,
      ACTOR: ' operator ',
    });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
