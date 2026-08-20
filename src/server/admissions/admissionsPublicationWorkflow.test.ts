import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('admissions publication workflow', () => {
  it('keeps write-capable publication in the protected environment and requires manual proof dispatch', async () => {
    const workflow = await readFile(
      path.join(process.cwd(), '.github/workflows/admissions-publication.yml'),
      'utf8',
    );

    expect(workflow).toContain('environment: admissions-publication');
    expect(workflow).toContain('release-intent');
    expect(workflow).toContain("release_kind != 'operational_proof'");
    expect(workflow).toContain('proof_failure_stage');
    expect(workflow).toContain('--proof-failure-stage');
    expect(workflow).toContain('git merge-base --is-ancestor');
  });
});
