import { readFile } from 'node:fs/promises';
import path from 'node:path';

describe('admission threshold scope invariant migration', () => {
  it('repairs mismatched live thresholds and blocks invalid tuples going forward', async () => {
    const migration = await readFile(
      path.join(process.cwd(), 'src/db/migrations/0014_admission_threshold_scope_invariant.sql'),
      'utf8',
    );

    expect(migration).toContain('DELETE FROM "admission_thresholds" AS threshold');
    expect(migration).toContain(
      'threshold."university_id" <> COALESCE(institution."university_id", institution."id")',
    );
    expect(migration).toContain('FROM "program_institutions" AS program_institution');
    expect(migration).toContain('CREATE TRIGGER "admission_threshold_scope_invariant"');
    expect(migration).toContain(
      'BEFORE INSERT OR UPDATE OF "program_id", "institution_id", "university_id"',
    );
  });
});
