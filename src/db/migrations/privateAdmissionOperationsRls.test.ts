import { readFile } from 'node:fs/promises';
import path from 'node:path';

const tables = [
  'admission_alternative_paths',
  'admission_facts',
  'admissions_source_candidates',
  'source_freshness_checks',
  'source_freshness_states',
];

describe('private admission operations RLS migration', () => {
  it('denies browser roles and preserves only the server capabilities each table needs', async () => {
    const migration = await readFile(
      path.join(process.cwd(), 'src/db/migrations/0011_private_admission_operations_rls.sql'),
      'utf8',
    );

    for (const table of tables) {
      expect(migration).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      expect(migration).toContain(`"${table}_private_deny_all"`);
      expect(migration).toContain(`"${table}_app_runtime_read"`);
      expect(migration).toContain(`"${table}_ops_readonly_read"`);
    }

    expect(migration).toContain('FROM anon, authenticated;');
    expect(migration).toContain(
      'GRANT INSERT ON TABLE "source_freshness_checks", "source_freshness_states" TO app_runtime;',
    );
    expect(migration).toContain('GRANT UPDATE ON TABLE "source_freshness_states" TO app_runtime;');
    expect(migration).not.toContain('GRANT INSERT ON TABLE "admission_facts"');
    expect(migration).not.toContain('GRANT UPDATE ON TABLE "admission_facts"');
    expect(migration).not.toContain('GRANT DELETE ON TABLE');
  });
});
