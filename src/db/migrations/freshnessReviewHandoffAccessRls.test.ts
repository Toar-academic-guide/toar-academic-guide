import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const handoffTables = ['ingestion_jobs', 'ingestion_payloads', 'review_items'];

describe('freshness review handoff automation access migration', () => {
  it('allows only the inserts required to atomically create a private review handoff', async () => {
    const migration = await readFile(
      path.join(
        process.cwd(),
        'src/db/migrations/0025_grant_admissions_automation_review_handoff.sql',
      ),
      'utf8',
    );

    expect(migration).toContain(
      'GRANT INSERT ON TABLE "ingestion_jobs", "ingestion_payloads", "review_items" TO admissions_automation;',
    );
    for (const table of handoffTables) {
      expect(migration).toContain(`"${table}_admissions_automation_insert"`);
      expect(migration).toContain(`ON "${table}" FOR INSERT TO admissions_automation`);
    }
    expect(migration).not.toContain('GRANT SELECT');
    expect(migration).not.toContain('GRANT UPDATE');
    expect(migration).not.toContain('GRANT DELETE');
    expect(migration).not.toContain('user_profiles');
  });
});
