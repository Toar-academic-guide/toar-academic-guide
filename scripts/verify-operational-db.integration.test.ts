import { readFileSync } from 'node:fs';
import postgres, { type TransactionSql } from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
import { loadProductionSchemaSnapshot } from './lib/production-schema-snapshot.mjs';
import {
  BASELINE_PRODUCTION_MIGRATIONS,
  FORWARD_PRODUCTION_MIGRATIONS,
  assessProductionSchema,
  type ProductionSchemaSnapshot,
} from '../src/server/admissions/productionSchemaPreflight';

const enabled = process.env.APP_DB_INTEGRATION === '1';
const url = process.env.DATABASE_URL ?? 'postgresql://unused';
if (enabled && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error('Use disposable localhost PostgreSQL only.');
}

describe.skipIf(!enabled)('operational schema snapshot with disposable PostgreSQL', () => {
  const client = postgres(url, { max: 1, prepare: false });
  afterAll(async () => client.end());
  async function isolated(run: (tx: TransactionSql) => Promise<void>) {
    const rollback = new Error('fixture rollback');
    await expect(
      client.begin(async (tx) => {
        // CI uses Drizzle history, while production uses the Supabase journal.
        // This synthetic journal exists only in this rolled-back localhost fixture.
        await tx`create schema if not exists supabase_migrations`;
        await tx`create table supabase_migrations.schema_migrations(version text, name text, statements text[])`;
        for (const [index, migration] of [
          ...BASELINE_PRODUCTION_MIGRATIONS,
          ...FORWARD_PRODUCTION_MIGRATIONS,
        ].entries()) {
          await tx`insert into supabase_migrations.schema_migrations values (${String(index).padStart(14, '0')}, ${'remoteName' in migration ? migration.remoteName : migration.name}, array['fixture'])`;
        }
        await tx`alter role app_runtime login`;
        await tx`alter role ops_readonly login`;
        await tx`alter role admissions_automation login`;
        await run(tx);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  }
  async function report(tx: TransactionSql) {
    const snapshot = (await loadProductionSchemaSnapshot(tx)) as ProductionSchemaSnapshot;
    // Synthetic history must carry real expected fingerprints before assessment.
    snapshot.migrationHistory = [
      ...BASELINE_PRODUCTION_MIGRATIONS,
      ...FORWARD_PRODUCTION_MIGRATIONS.map((m, i) => ({
        version: `20261025${String(i).padStart(6, '0')}`,
        name: m.remoteName,
        statementFingerprint: m.statementFingerprint,
      })),
    ];
    return assessProductionSchema(snapshot);
  }

  it('loads the applied guarded 0041 postconditions without inventing history entries', async () =>
    isolated(async (tx) => {
      const result = await report(tx);
      expect(result).toMatchObject({ appliedThrough: '0036', pendingMigrations: [] });
      // Existing legacy policy differences in disposable Drizzle installs are
      // outside 0041; never fabricate those policies to make the whole schema current.
      expect(result.issues.filter(({ object }) => /enquiries|store_enquiry/.test(object))).toEqual(
        [],
      );
    }));

  it('captures the 0042 body from PostgreSQL and rejects the pre-0042 body', async () =>
    isolated(async (tx) => {
      const fixed = readFileSync(
        'src/db/migrations/0042_store_enquiry_createdat_default.sql',
        'utf8',
      );
      const old = fixed.replace(
        "COALESCE((payload->>'createdAt')::timestamptz, now())",
        "(payload->>'createdAt')::timestamptz",
      );
      await tx.unsafe(old);
      expect(await report(tx)).toMatchObject({
        status: 'drift',
        safeToMigrate: false,
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'function_body_mismatch',
            object: 'function:store_enquiry(jsonb)',
          }),
        ]),
      });
      await tx.unsafe(fixed);
      const snapshot = await loadProductionSchemaSnapshot(tx);
      expect(snapshot.functionDefinitions['store_enquiry(jsonb)']).toContain(
        "COALESCE((payload->>'createdAt')::timestamptz, now())",
      );
      expect(
        (await report(tx)).issues.filter(({ object }) => object.includes('store_enquiry')),
      ).toEqual([]);
    }));

  it('sees private enquiries columns as ops_readonly without granting contact access', async () =>
    isolated(async (tx) => {
      await tx`grant usage on schema supabase_migrations to ops_readonly`;
      await tx`grant select on supabase_migrations.schema_migrations to ops_readonly`;
      await tx`set local role ops_readonly`;
      const snapshot = (await loadProductionSchemaSnapshot(tx)) as ProductionSchemaSnapshot;
      expect(snapshot.functionDefinitions?.['store_enquiry(jsonb)']).toContain(
        "COALESCE((payload->>'createdAt')::timestamptz, now())",
      );
      expect(snapshot.tables.enquiries.columnTypes.created_at).toBe('timestamp with time zone');
      expect(snapshot.tables.enquiries.grants.ops_readonly ?? []).toEqual([]);
    }));

  it('checks all table privileges supported by the PostgreSQL server', async () =>
    isolated(async (tx) => {
      const [version] = await tx`select current_setting('server_version_num')::int as number`;
      const privilege = version.number >= 170000 ? 'MAINTAIN' : 'TRIGGER';
      await tx.unsafe(`revoke ${privilege} on public.enquiries from service_role`);
      expect(await report(tx)).toMatchObject({
        status: 'drift',
        issues: expect.arrayContaining([
          expect.objectContaining({
            code: 'grant_mismatch',
            object: 'grant:service_role:enquiries',
          }),
        ]),
      });
    }));

  it.each([
    [
      'missing table',
      'ALTER TABLE public.enquiries RENAME TO enquiries_hidden',
      'missing_table',
      'table:enquiries',
    ],
    [
      'disabled RLS',
      'ALTER TABLE public.enquiries DISABLE ROW LEVEL SECURITY',
      'rls_disabled',
      'table:enquiries',
    ],
    [
      'unexpected policy',
      'CREATE POLICY enquiries_leak ON public.enquiries FOR SELECT USING (true)',
      'unexpected_policy',
      'policy:enquiries_leak',
    ],
    [
      'runtime grant',
      'GRANT SELECT ON public.enquiries TO app_runtime',
      'grant_mismatch',
      'grant:app_runtime:enquiries',
    ],
    [
      'PUBLIC grant',
      'GRANT SELECT ON public.enquiries TO PUBLIC',
      'grant_mismatch',
      'grant:PUBLIC:enquiries',
    ],
    [
      'service grant',
      'REVOKE INSERT ON public.enquiries FROM service_role',
      'grant_mismatch',
      'grant:service_role:enquiries',
    ],
    [
      'column grant',
      'GRANT SELECT(phone) ON public.enquiries TO app_runtime',
      'grant_mismatch',
      'grant:app_runtime:enquiries.column:SELECT',
    ],
    [
      'missing function',
      'DROP FUNCTION public.store_enquiry(jsonb)',
      'missing_function',
      'function:store_enquiry(jsonb)',
    ],
    [
      'public function grant',
      'GRANT EXECUTE ON FUNCTION public.store_enquiry(jsonb) TO PUBLIC',
      'grant_mismatch',
      'function:store_enquiry(jsonb)',
    ],
    [
      'missing runtime execute',
      'REVOKE EXECUTE ON FUNCTION public.store_enquiry(jsonb) FROM app_runtime',
      'grant_mismatch',
      'function:store_enquiry(jsonb)',
    ],
    [
      'unsafe function',
      'ALTER FUNCTION public.store_enquiry(jsonb) SECURITY INVOKER',
      'function_config_mismatch',
      'function:store_enquiry(jsonb)',
    ],
    [
      'unsafe search path',
      'ALTER FUNCTION public.store_enquiry(jsonb) SET search_path = public',
      'function_config_mismatch',
      'function:store_enquiry(jsonb)',
    ],
  ])('detects %s through the operational loader', async (_name, mutation, code, object) =>
    isolated(async (tx) => {
      await tx.unsafe(mutation);
      expect(await report(tx)).toMatchObject({
        status: 'drift',
        safeToMigrate: false,
        pendingMigrations: [],
        issues: expect.arrayContaining([expect.objectContaining({ code, object })]),
      });
    }),
  );
});
