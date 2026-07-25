import { readFile } from 'node:fs/promises';
import path from 'node:path';

const tables = [
  'admission_publication_attempts',
  'admission_release_items',
  'admission_releases',
  'admission_target_transitions',
];

describe('admission release ledger migration', () => {
  it('keeps release history private while granting only required server operations', async () => {
    const migration = await readFile(
      path.join(process.cwd(), 'src/db/migrations/0012_greedy_meteorite.sql'),
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
      'GRANT UPDATE ON TABLE "admission_publication_attempts", "admission_releases" TO app_runtime;',
    );
    expect(migration).not.toContain('GRANT UPDATE ON TABLE "admission_release_items"');
    expect(migration).not.toContain('GRANT UPDATE ON TABLE "admission_target_transitions"');
    expect(migration).not.toContain('GRANT DELETE ON TABLE');
  });
});
