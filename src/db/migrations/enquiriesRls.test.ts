import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/pg-core';
import * as schema from '../schema';
describe('enquiries schema and unapplied packet', () => {
  it('defines the private backup schema with request-id deduplication', () => {
    expect(schema).toHaveProperty('enquiries');
    const config = getTableConfig(
      (schema as unknown as { enquiries: Parameters<typeof getTableConfig>[0] }).enquiries,
    );
    expect(config.columns.find((column) => column.name === 'request_id')?.primary).toBe(true);
    expect(config.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        'result_status',
        'bagrut',
        'psychometric',
        'evaluation_input',
        'consent_text',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'referrer',
      ]),
    );
  });
  it('restricts direct access and exposes only a pinned insert function to runtime', () => {
    const migration = readFileSync('src/db/migrations/0041_enquiries.sql', 'utf8');
    expect(migration).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(migration).toMatch(
      /REVOKE ALL ON TABLE public.enquiries FROM PUBLIC, anon, authenticated, app_runtime/,
    );
    expect(migration).toMatch(/GRANT ALL ON TABLE public.enquiries TO service_role/);
    expect(migration).toMatch(/SECURITY DEFINER/);
    expect(migration).toMatch(/SET search_path = ''/);
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public.store_enquiry\(jsonb\) TO app_runtime/,
    );
    expect(migration).toMatch(/ON CONFLICT \(request_id\) DO NOTHING/);
    expect(migration).toMatch(/'accepted', 'below', 'eligible_to_apply', 'unknown'/);
    const packet = readFileSync('supabase/packets/2026-10-24-enquiries-table.sql', 'utf8');
    expect(packet).toContain('BACKUP');
    expect(packet).toContain('ROLLBACK');
    expect(packet).toContain('myway.apply_enquiries');
    expect(packet).toContain('CREATE TABLE IF NOT EXISTS public.enquiries');
    expect(packet).toContain('pg_dump');
  });
});

it('keeps attribution bounded in schema, migration, insert function and idempotent packet upgrades', () => {
  const config = getTableConfig(schema.enquiries);
  const migration = readFileSync('src/db/migrations/0041_enquiries.sql', 'utf8');
  const packet = readFileSync('supabase/packets/2026-10-24-enquiries-table.sql', 'utf8');
  for (const [column, length] of [
    ['utm_source', 100],
    ['utm_medium', 100],
    ['utm_campaign', 100],
    ['referrer', 256],
  ] as const) {
    expect(config.columns.find((entry) => entry.name === column)?.getSQLType()).toBe(
      `varchar(${length})`,
    );
    expect(migration).toContain(`"${column}" varchar(${length})`);
    expect(migration).toContain(`payload->'attribution'->>'${column}'`);
    expect(packet).toContain(`ADD COLUMN IF NOT EXISTS "${column}" varchar(${length})`);
    expect(packet).toContain(`payload->'attribution'->>'${column}'`);
  }
});

it('keeps main 0040 and the regenerated enquiries 0041 in one valid Drizzle lineage', () => {
  const files = readdirSync('src/db/migrations').filter((file) => /^\d{4}_.*\.sql$/.test(file));
  expect(files.filter((file) => file.startsWith('0040_'))).toEqual([
    '0040_fractional_admission_thresholds.sql',
  ]);
  expect(files.filter((file) => file.startsWith('0041_'))).toEqual(['0041_enquiries.sql']);
  const journal = JSON.parse(readFileSync('src/db/migrations/meta/_journal.json', 'utf8'));
  expect(
    journal.entries.slice(-4).map((entry: { idx: number; tag: string }) => [entry.idx, entry.tag]),
  ).toEqual([
    [40, '0040_fractional_admission_thresholds'],
    [41, '0041_enquiries'],
    [42, '0042_store_enquiry_createdat_default'],
    [43, '0043_grant_admissions_automation_review_resolution'],
  ]);
  const previous = JSON.parse(readFileSync('src/db/migrations/meta/0040_snapshot.json', 'utf8'));
  const current = JSON.parse(readFileSync('src/db/migrations/meta/0041_snapshot.json', 'utf8'));
  const next = JSON.parse(readFileSync('src/db/migrations/meta/0042_snapshot.json', 'utf8'));
  const resolution = JSON.parse(readFileSync('src/db/migrations/meta/0043_snapshot.json', 'utf8'));
  expect(resolution.prevId).toBe(next.id);
  expect(resolution.tables).toEqual(next.tables);
  expect(next.prevId).toBe(current.id);
  expect(next.tables).toEqual(current.tables);
  expect(current.prevId).toBe(previous.id);
  expect(previous.tables).not.toHaveProperty('public.enquiries');
  expect(current.tables).toHaveProperty('public.enquiries');
  expect(current.tables['public.admission_thresholds'].columns.threshold_value.type).toBe(
    'numeric',
  );
  expect(readFileSync('supabase/packets/2026-10-24-enquiries-table.sql', 'utf8')).toContain(
    'src/db/migrations/0041_enquiries.sql',
  );
});
