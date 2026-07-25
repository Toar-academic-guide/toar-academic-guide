import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

describe('operational database verifier script', () => {
  it('loads the complete TypeScript module graph before validating configuration', () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    delete env.OPS_DATABASE_URL;

    const result = spawnSync(
      process.execPath,
      ['scripts/verify-operational-db.mjs', '--preflight'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env,
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing DATABASE_URL');
    expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(result.stderr).not.toContain('Cannot find module');
  });
});
