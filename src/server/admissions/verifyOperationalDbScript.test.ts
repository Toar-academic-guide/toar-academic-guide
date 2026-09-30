import { spawnSync } from 'node:child_process';

import { describe, expect, it, vi } from 'vitest';

import { closeReviewPreparationResources } from '../../../scripts/prepare-admissions-review.mjs';

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

  it('does not let an unresponsive one-off cleanup hold the workflow open', async () => {
    const closeDb = vi.fn().mockReturnValue(new Promise(() => undefined));
    const vite = {
      ssrLoadModule: vi.fn().mockResolvedValue({ closeDb }),
      close: vi.fn().mockReturnValue(new Promise(() => undefined)),
    };
    const log = { info: vi.fn(), warn: vi.fn() };

    await closeReviewPreparationResources(vite, { operationTimeoutMs: 1, log });

    expect(closeDb).toHaveBeenCalledOnce();
    expect(vite.close).toHaveBeenCalledOnce();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('database_close_incomplete'));
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('vite_close_incomplete'));
  });
});
