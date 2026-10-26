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
    // Approved test update, Jorje 2026-10-26: 0040 leaves the last four journal entries.
    [41, '0041_enquiries'],
    [42, '0042_store_enquiry_createdat_default'],
    [43, '0043_grant_admissions_automation_review_resolution'],
    [44, '0044_enquiries_prep_consent'], // Approved test update, Jorje 2026-10-26
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

it('adds independent optional prep consent and preserves the insert-only 0042 function contract', () => {
  const migration = readFileSync('src/db/migrations/0044_enquiries_prep_consent.sql', 'utf8');
  const previous = readFileSync(
    'src/db/migrations/0042_store_enquiry_createdat_default.sql',
    'utf8',
  );
  expect(migration).toContain('"prep_consent" boolean DEFAULT false NOT NULL');
  expect(migration).toContain('"prep_consent_text" text');
  expect(migration).toContain('"prep_consent_at" timestamp with time zone');
  for (const clause of [
    'SECURITY DEFINER',
    "SET search_path = ''",
    'ON CONFLICT (request_id) DO NOTHING',
    "COALESCE((payload->>'createdAt')::timestamptz, now())",
  ]) {
    expect(previous).toContain(clause);
    expect(migration).toContain(clause);
  }
  expect(migration).toContain("COALESCE((payload->>'prepConsent')::boolean, false)");
  expect(migration).toContain("payload->>'prepConsentText'");
  expect(migration).toContain("payload->>'prepConsentAt'");
  expect(migration).not.toMatch(/DROP|UPDATE public\.enquiries|ALTER COLUMN|GRANT/i);
});

it('provides an explicitly guarded, idempotent packet with a verbatim pre-0044 restore before column drops', () => {
  const packet = readFileSync('supabase/packets/2026-10-26-enquiries-prep-consent.sql', 'utf8');
  const previous = readFileSync(
    'src/db/migrations/0042_store_enquiry_createdat_default.sql',
    'utf8',
  ).split('CREATE OR REPLACE FUNCTION')[1];
  expect(packet).toContain('GUARDED SQL: Jorje applies after merge');
  expect(packet).toContain('BACKUP');
  expect(packet).toContain('PREFLIGHT');
  expect(packet).toContain('sha256sum');
  expect(packet).toContain('myway.apply_enquiries_prep_consent');
  expect(packet).toContain('myway.rollback_enquiries_prep_consent');
  expect(packet).toContain('CREATE OR REPLACE FUNCTION' + previous);
  expect(packet.match(/ADD COLUMN IF NOT EXISTS/g)).toHaveLength(3);
  const rollback = packet.slice(packet.indexOf('-- ROLLBACK'));
  expect(rollback.indexOf('CREATE OR REPLACE FUNCTION')).toBeLessThan(
    rollback.indexOf('DROP COLUMN'),
  );
  expect(rollback.match(/DROP COLUMN/g)).toHaveLength(3);
});

it('defines prep columns without granting direct contact access or adding an age field', () => {
  const columns = getTableConfig(schema.enquiries).columns;
  expect(columns.find((column) => column.name === 'prep_consent')).toMatchObject({
    notNull: true,
    default: false,
  });
  expect(columns.find((column) => column.name === 'prep_consent_text')).toMatchObject({
    notNull: false,
  });
  expect(columns.find((column) => column.name === 'prep_consent_at')?.getSQLType()).toBe(
    'timestamp with time zone',
  );
  expect(columns.some((column) => /age|is_adult/.test(column.name))).toBe(false);
  const migration = readFileSync('src/db/migrations/0044_enquiries_prep_consent.sql', 'utf8');
  expect(migration).not.toMatch(/GRANT|CREATE POLICY/);
});

it('keeps the rollback definition byte-identical to 0042 and pins its recorded SHA256', async () => {
  const { createHash } = await import('node:crypto');
  const packet = readFileSync('supabase/packets/2026-10-26-enquiries-prep-consent.sql', 'utf8');
  const old = readFileSync('src/db/migrations/0042_store_enquiry_createdat_default.sql', 'utf8');
  const definition = old.slice(old.indexOf('CREATE OR REPLACE FUNCTION'));
  const embedded = packet
    .split('-- BEGIN VERBATIM PRE-0044 DEFINITION (0042; hashed bytes start next line)\n')[1]
    .split('-- END VERBATIM PRE-0044 DEFINITION')[0];
  expect(embedded).toBe(definition);
  expect(packet).toContain(
    `-- PRE-0044 SHA256: ${createHash('sha256').update(definition).digest('hex')}`,
  );
});

it('requires the packet EXECUTE allowlist and names every disallowed grantee', () => {
  const packet = readFileSync('supabase/packets/2026-10-26-enquiries-prep-consent.sql', 'utf8');
  const preflight = packet.slice(
    packet.indexOf('DO $preflight$'),
    packet.indexOf('END $preflight$;'),
  );
  expect(preflight).toContain("aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner)))");
  expect(preflight).toMatch(
    /CASE WHEN a\.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid\(a\.grantee\) END/,
  );
  expect(preflight).toContain("grantee_name NOT IN ('postgres', 'service_role', 'app_runtime')");
  expect(preflight).toMatch(
    /IF disallowed_grantees IS NOT NULL THEN\s+RAISE EXCEPTION 'Unexpected store_enquiry EXECUTE grantees: %', disallowed_grantees;/,
  );
  expect(preflight).toContain(
    "IF NOT has_function_privilege('app_runtime', 'public.store_enquiry(jsonb)', 'EXECUTE') THEN",
  );
  expect(preflight).toContain('relrowsecurity');
  expect(preflight).toContain('pg_policy');
  expect(packet).toContain('AS execute_allowlist_ok');
});

it('requires a private consent export and app rollback before the SQL rollback block', () => {
  const packet = readFileSync('supabase/packets/2026-10-26-enquiries-prep-consent.sql', 'utf8');
  const rollback = packet.slice(
    packet.indexOf('-- ROLLBACK'),
    packet.indexOf('/*', packet.indexOf('-- ROLLBACK')),
  );
  expect(rollback).toContain('revert the R7e app code first');
  expect(rollback).toContain('PRIVATE operator file');
  expect(rollback).toContain('never commit or share');
  expect(rollback).toContain(
    "\\copy (SELECT request_id, prep_consent, prep_consent_text, prep_consent_at FROM public.enquiries WHERE prep_consent OR prep_consent_text IS NOT NULL OR prep_consent_at IS NOT NULL) TO 'enquiries-prep-consent-before-rollback.csv' CSV HEADER",
  );
});

it('retains inherited anon/authenticated EXECUTE checks after the direct ACL allowlist', () => {
  const packet = readFileSync('supabase/packets/2026-10-26-enquiries-prep-consent.sql', 'utf8');
  const preflight = packet.slice(
    packet.indexOf('DO $preflight$'),
    packet.indexOf('END $preflight$;'),
  );
  expect(preflight).toMatch(
    /IF has_function_privilege\('anon', 'public\.store_enquiry\(jsonb\)', 'EXECUTE'\)\s+OR has_function_privilege\('authenticated', 'public\.store_enquiry\(jsonb\)', 'EXECUTE'\) THEN\s+RAISE EXCEPTION 'anon\/authenticated must not be able to EXECUTE public\.store_enquiry\(jsonb\) \(direct or inherited\)';\s+END IF;/,
  );
  expect(preflight).toContain("grantee_name NOT IN ('postgres', 'service_role', 'app_runtime')");
  expect(preflight.indexOf("IF has_function_privilege('anon'")).toBeGreaterThan(
    preflight.indexOf("RAISE EXCEPTION 'Unexpected store_enquiry EXECUTE grantees: %'"),
  );
});
