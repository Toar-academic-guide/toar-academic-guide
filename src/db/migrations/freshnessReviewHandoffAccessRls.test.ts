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

describe('review resolution automation access migration', () => {
  it('grants only review reads and status/timestamp updates with pending-only transitions', async () => {
    const migration = await readFile(
      'src/db/migrations/0043_grant_admissions_automation_review_resolution.sql',
      'utf8',
    );
    const statements = migration
      .replace(/--[^\n]*/g, '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    expect(statements.filter((s) => s.startsWith('GRANT'))).toEqual([
      'GRANT SELECT ON TABLE "review_items" TO admissions_automation',
      'GRANT UPDATE ("status", "reviewed_at") ON TABLE "review_items" TO admissions_automation',
    ]);
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "review_items_admissions_automation_read" ON "review_items";',
    );
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "review_items_admissions_automation_update" ON "review_items";',
    );
    expect(migration.replace(/\s+/g, ' ')).toContain(
      'CREATE POLICY "review_items_admissions_automation_read" ON "review_items" FOR SELECT TO admissions_automation USING (true);',
    );
    expect(migration.replace(/\s+/g, ' ')).toContain(
      `CREATE POLICY "review_items_admissions_automation_update" ON "review_items" FOR UPDATE TO admissions_automation USING ("status" = 'pending'::"public"."review_item_status") WITH CHECK ("status" IN ('approved'::"public"."review_item_status", 'rejected'::"public"."review_item_status"));`,
    );
    expect(migration).not.toMatch(/GRANT\s+(?:UPDATE\s+ON|DELETE)/i);
    expect(migration).not.toMatch(/app_runtime|ops_readonly|authenticated|anon|service_role/);
    expect(statements).toHaveLength(6);
  });
});
