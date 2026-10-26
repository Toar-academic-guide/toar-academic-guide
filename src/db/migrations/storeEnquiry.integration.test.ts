import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';

const enabled = process.env.APP_DB_INTEGRATION === '1';
const url = process.env.DATABASE_URL ?? 'postgresql://unused';
if (enabled && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error('Use disposable localhost PostgreSQL only.');
}

describe.skipIf(!enabled)('store_enquiry with disposable PostgreSQL', () => {
  const client = postgres(url, { max: 1, prepare: false });
  afterAll(async () => client.end());

  it.each(['missing', 'null', 'explicit'] as const)(
    'stores the correct timestamp for %s createdAt and keeps duplicate requests idempotent',
    async (kind) => {
      const rollback = new Error('fixture rollback');
      await expect(
        client.begin(async (tx) => {
          const requestId = randomUUID();
          const explicit = '2026-10-01T09:30:00.000Z';
          const payload = {
            requestId,
            name: 'Synthetic test',
            phone: '0500000000',
            programId: 'test',
            institutionId: 'test',
            programName: 'Test',
            institutionName: 'Test',
            sourcePath: '/programs/test',
            consent: true,
            consentText: 'Test consent',
            resultStatus: 'unknown',
            ...(kind === 'missing' ? {} : { createdAt: kind === 'null' ? null : explicit }),
          };
          const [clock] = await tx`select now() as expected`;
          await tx`set local role app_runtime`;
          await tx`select public.store_enquiry(${tx.json(payload)}::jsonb)`;
          await tx`select public.store_enquiry(${tx.json({ ...payload, createdAt: '2000-01-01T00:00:00Z' })}::jsonb)`;
          await tx`reset role`;
          const rows =
            await tx`select created_at from public.enquiries where request_id = ${requestId}`;
          expect(rows).toHaveLength(1);
          expect(rows[0].created_at).toEqual(
            kind === 'explicit' ? new Date(explicit) : clock.expected,
          );
          throw rollback;
        }),
      ).rejects.toBe(rollback);
    },
  );
  it('guards the operator packet and restores the backed-up function without changing owner or ACL', async () => {
    const packet = readFileSync(
      'supabase/packets/2026-10-25-store-enquiry-createdat-default.sql',
      'utf8',
    );
    expect(packet.startsWith('-- GUARDED SQL: Jorje applies after merge')).toBe(true);
    const apply = packet
      .split('/*')[0]
      .replace(/^BEGIN;$/m, '')
      .replace(/^COMMIT;$/m, '');
    const oldMigration = readFileSync('src/db/migrations/0041_enquiries.sql', 'utf8');
    const oldFunction = oldMigration.slice(
      oldMigration.indexOf('CREATE OR REPLACE FUNCTION'),
      oldMigration.indexOf('--> statement-breakpoint\nREVOKE ALL ON FUNCTION'),
    );
    const rollback = new Error('fixture rollback');
    await expect(
      client.begin(async (tx) => {
        await tx.unsafe(oldFunction);
        const [before] =
          await tx`select pg_get_functiondef(oid) as definition, proowner, proacl from pg_proc where oid = 'public.store_enquiry(jsonb)'::regprocedure`;
        await expect(tx.savepoint((sp) => sp.unsafe(apply))).rejects.toThrow('Refusing apply');
        await tx`set local myway.apply_store_enquiry_createdat = '2026-10-25'`;
        const result = await tx.unsafe(apply);
        expect(result.at(-1)).toEqual([
          expect.objectContaining({
            created_at_defaults_to_now: true,
            security_definer: true,
            empty_search_path: true,
            runtime_can_execute: true,
            anon_cannot_execute: true,
            authenticated_cannot_execute: true,
          }),
        ]);
        const migration = readFileSync(
          'src/db/migrations/0042_store_enquiry_createdat_default.sql',
          'utf8',
        );
        const [applied] =
          await tx`select pg_get_functiondef(oid) as definition, proowner, proacl from pg_proc where oid = 'public.store_enquiry(jsonb)'::regprocedure`;
        expect(applied).toMatchObject({ proowner: before.proowner, proacl: before.proacl });
        await tx.unsafe(migration);
        expect(
          (
            await tx`select pg_get_functiondef('public.store_enquiry(jsonb)'::regprocedure) as definition`
          )[0].definition,
        ).toBe(applied.definition);
        // The packet's rollback imports precisely this captured definition.
        await tx.unsafe(before.definition);
        expect(
          (
            await tx`select pg_get_functiondef(oid) as definition, proowner, proacl from pg_proc where oid = 'public.store_enquiry(jsonb)'::regprocedure`
          )[0],
        ).toEqual(before);
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });

  it.each(['PUBLIC', 'anon', 'authenticated'] as const)(
    'refuses the 0044 packet preflight when EXECUTE is granted to %s',
    async (grantee) => {
      const packet = readFileSync('supabase/packets/2026-10-26-enquiries-prep-consent.sql', 'utf8');
      const preflight = packet.slice(
        packet.indexOf('DO $preflight$'),
        packet.indexOf('END $preflight$;') + 'END $preflight$;'.length,
      );
      const rollback = new Error('fixture rollback');
      await expect(
        client.begin(async (tx) => {
          await tx`set local myway.apply_enquiries_prep_consent = '2026-10-26'`;
          // Only the fixed role names above enter this disposable, rolled-back fixture.
          await tx.unsafe(`GRANT EXECUTE ON FUNCTION public.store_enquiry(jsonb) TO ${grantee}`);
          await expect(tx.savepoint((sp) => sp.unsafe(preflight))).rejects.toThrow(
            new RegExp(`Unexpected store_enquiry EXECUTE grantees: .*\\b${grantee}\\b`), // Approved test update, Jorje 2026-10-26
          );
          throw rollback;
        }),
      ).rejects.toBe(rollback);
    },
  );

  it('accepts the EXECUTE section with default migrated allowlisted grants', async (context) => {
    const [functionOwner] = await client`
        select pg_get_userbyid(proowner) as owner
        from pg_proc where oid = 'public.store_enquiry(jsonb)'::regprocedure
      `;
    const owner = String(functionOwner.owner);
    if (!['postgres', 'service_role', 'app_runtime'].includes(owner)) {
      context.skip(
        `Default store_enquiry function owner ${owner} is outside the EXECUTE allowlist`,
      );
    }
    const packet = readFileSync('supabase/packets/2026-10-26-enquiries-prep-consent.sql', 'utf8');
    const executeSection = packet.slice(
      packet.indexOf('  -- PREFLIGHT EXECUTE:'),
      packet.indexOf('  FOR col IN SELECT'),
    );
    const rollback = new Error('fixture rollback');
    await expect(
      client.begin(async (tx) => {
        await expect(
          tx.unsafe(
            `DO $execute_test$ DECLARE disallowed_grantees text; BEGIN\n${executeSection}\nEND $execute_test$;`,
          ),
        ).resolves.toBeDefined();
        throw rollback;
      }),
    ).rejects.toBe(rollback);
  });
});
