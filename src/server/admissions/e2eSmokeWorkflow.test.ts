import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
function smokeJob(id: string) {
  const job = workflow.split(`  ${id}:\n`)[1]?.split(/\n {2}[\w-]+:\n/)[0];
  expect(job).toBeDefined();
  return job!;
}

describe('main and PR smoke isolation', () => {
  it('keeps both smoke job environments identical and the real request limit active', () => {
    const envs = ['e2e', 'e2e-pr'].map((id) => {
      const job = smokeJob(id);
      const env = job.match(/^ {4}env:\n((?: {6}.*\n)+)/m)?.[1];
      expect(env).toBeDefined();
      expect(env).toContain('CI: true');
      expect(env).toContain('CATALOGUE_SOURCE_MODE: static');
      expect(env).toContain("ADMISSIONS_EVALUATION_E2E_ISOLATION: '1'");
      expect(job).not.toContain('ADMISSIONS_EVALUATION_CI_MAX_REQUESTS_PER_WINDOW');
      expect(job).toContain('npm run test:e2e');
      return env;
    });
    expect(envs[0]).toBe(envs[1]);
  });

  it('routes every smoke spec through the shared per-test header fixture', () => {
    for (const file of readdirSync('e2e').filter((name) => name.endsWith('.spec.ts'))) {
      expect(readFileSync(`e2e/${file}`, 'utf8'), file).toContain("from './fixtures'");
      expect(readFileSync(`e2e/${file}`, 'utf8'), file).not.toContain("from '@playwright/test'");
    }
  });
});
