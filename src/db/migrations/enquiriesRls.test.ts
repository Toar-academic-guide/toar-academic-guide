import { readFileSync } from 'node:fs';
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
      ]),
    );
  });
  it('restricts direct access and exposes only a pinned insert function to runtime', () => {
    const migration = readFileSync('src/db/migrations/0040_enquiries.sql', 'utf8');
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
