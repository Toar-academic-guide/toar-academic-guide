import { readFile } from 'node:fs/promises';
import path from 'node:path';

describe('operational proof access hardening migration', () => {
  it('removes inherited API and runtime grants from the isolated proof lane', async () => {
    const migration = await readFile(
      path.join(process.cwd(), 'src/db/migrations/0022_secure_operational_proof_access.sql'),
      'utf8',
    );

    expect(migration).toContain(
      'REVOKE ALL PRIVILEGES ON TABLE "admission_operational_proof_values" FROM PUBLIC;',
    );
    expect(migration).toContain('FROM anon, authenticated;');
    expect(migration).toContain('FROM app_runtime;');
    expect(migration).toContain('FROM ops_readonly;');
    expect(migration).toContain('"admission_operational_proof_values_private_deny_all"');
    expect(migration).not.toContain('GRANT ');
    expect(migration).not.toContain('admission_thresholds');
  });
});
