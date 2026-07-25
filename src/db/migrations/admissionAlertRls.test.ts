import { readFile } from 'node:fs/promises';
import path from 'node:path';

const tables = [
  'admission_alert_baseline_history',
  'admission_alert_email_preferences',
  'admission_alert_outbox',
  'admission_alert_subscriptions',
  'admission_alert_transition_work',
  'admission_alert_webhook_events',
];

describe('admission alert persistence migration', () => {
  it('keeps alert state private and gives browser roles no direct access', async () => {
    const migration = await readFile(
      path.join(process.cwd(), 'src/db/migrations/0013_funny_multiple_man.sql'),
      'utf8',
    );

    for (const table of tables) {
      expect(migration).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      expect(migration).toContain(`'${table}'`);
      expect(migration).toContain('REVOKE ALL ON TABLE %I FROM anon, authenticated');
      expect(migration).toContain('GRANT SELECT, INSERT, UPDATE ON TABLE %I TO app_runtime');
    }

    expect(migration).not.toContain('GRANT DELETE ON TABLE');
  });
});
