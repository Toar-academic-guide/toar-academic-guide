import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('bagrut profile version operations repair', () => {
  it('adds only the missing readonly operations surface', async () => {
    const migration = await readFile(
      path.join(
        process.cwd(),
        'src/db/migrations/0017_grant_ops_readonly_bagrut_profile_versions.sql',
      ),
      'utf8',
    );

    expect(migration).toContain(
      "IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ops_readonly')",
    );
    expect(migration).toContain('GRANT SELECT ON TABLE "bagrut_profile_versions" TO ops_readonly;');
    expect(migration).toContain('"bagrut_profile_versions_ops_readonly_read"');
    expect(migration).not.toContain('GRANT INSERT');
    expect(migration).not.toContain('GRANT UPDATE');
    expect(migration).not.toContain('GRANT DELETE');
  });
});
