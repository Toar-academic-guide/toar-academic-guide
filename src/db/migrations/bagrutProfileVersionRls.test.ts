import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('bagrut profile version migration', () => {
  it('keeps immutable profile history private and grants no update or delete path', async () => {
    const migration = await readFile(
      path.join(
        process.cwd(),
        'src/db/migrations/0010_fearless_maverick.sql',
      ),
      'utf8',
    );

    expect(migration).toContain(
      'ALTER TABLE "bagrut_profile_versions" ENABLE ROW LEVEL SECURITY;',
    );
    expect(migration).toContain(
      'REVOKE ALL ON TABLE "bagrut_profile_versions" FROM anon, authenticated;',
    );
    expect(migration).toContain(
      '"bagrut_profile_versions_private_deny_all"',
    );
    expect(migration).toContain(
      'GRANT SELECT, INSERT ON TABLE "bagrut_profile_versions" TO app_runtime;',
    );
    expect(migration).toContain(
      "IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime')",
    );
    expect(migration).not.toContain(
      'GRANT UPDATE ON TABLE "bagrut_profile_versions"',
    );
    expect(migration).not.toContain(
      'GRANT DELETE ON TABLE "bagrut_profile_versions"',
    );
  });
});
