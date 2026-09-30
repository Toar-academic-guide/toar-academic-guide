import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('admission review run ledger migration', () => {
  it('keeps weekly review and Slack retry state private while allowing only server operations', async () => {
    const migration = await readFile(
      path.join(process.cwd(), 'src/db/migrations/0016_admission_review_runs.sql'),
      'utf8',
    );

    expect(migration).toContain('ALTER TABLE "admission_review_runs" ENABLE ROW LEVEL SECURITY;');
    expect(migration).toContain('"admission_review_runs_private_deny_all"');
    expect(migration).toContain('"admission_review_runs_app_runtime_read"');
    expect(migration).toContain('"admission_review_runs_app_runtime_insert"');
    expect(migration).toContain('"admission_review_runs_app_runtime_update"');
    expect(migration).toContain('"admission_review_runs_ops_readonly_read"');
    expect(migration).toContain('FROM anon, authenticated;');
    expect(migration).not.toContain('GRANT DELETE ON TABLE');
  });
});
