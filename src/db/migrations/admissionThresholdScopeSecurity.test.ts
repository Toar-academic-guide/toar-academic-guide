import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('admission threshold scope function security repair', () => {
  it('pins a trusted search path without rewriting the original migration', async () => {
    const migration = await readFile(
      path.join(
        process.cwd(),
        'src/db/migrations/0018_secure_admission_threshold_scope_function.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('ALTER FUNCTION "public"."enforce_admission_threshold_scope"()');
    expect(migration).toContain('SET search_path = pg_catalog, public;');
  });
});
