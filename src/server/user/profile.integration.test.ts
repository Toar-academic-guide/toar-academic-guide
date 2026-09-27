import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '@/db/schema';

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), userId: '' }));
vi.mock('server-only', () => ({}));
vi.mock('@/db/client', () => ({ getDb: mocks.getDb }));
vi.mock('@/lib/posthog-server', () => ({ getPostHogClient: () => ({ capture: vi.fn() }) }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: mocks.userId } }, error: null }) },
  }),
}));

import { GET, PUT } from '@/app/api/profile/route';

// Use only a disposable local database; never infer a target from DATABASE_URL.
const databaseUrl = process.env.PROFILE_DB_TEST_URL;
if (databaseUrl) {
  const url = new URL(databaseUrl);
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/profile_test'
  ) {
    throw new Error(
      'PROFILE_DB_TEST_URL must point to the disposable local profile_test database.',
    );
  }
}
const describeWithPostgres = databaseUrl ? describe : describe.skip;

describeWithPostgres(
  'profile API persistence with PostgreSQL and a controlled auth identity',
  () => {
    const sql = postgres(databaseUrl ?? 'postgresql://unused', { max: 1, prepare: false });
    const userId = randomUUID();
    const otherUserId = randomUUID();

    beforeAll(async () => {
      mocks.userId = userId;
      mocks.getDb.mockReturnValue(drizzle(sql, { schema }));
      // The schema harness creates current tables. Recreate the pre-migration state
      // to prove that this migration preserves existing rows and defaults to null.
      await sql`alter table user_profiles drop column admissions_inputs`;
      await sql`insert into user_profiles (user_id) values (${userId}), (${otherUserId})`;
      await sql.unsafe(
        readFileSync(
          new URL('../../db/migrations/0028_profile_admissions_inputs.sql', import.meta.url),
          'utf8',
        ),
      );
      const existingRows =
        await sql`select user_id, admissions_inputs from user_profiles where user_id in (${userId}, ${otherUserId})`;
      expect(existingRows).toHaveLength(2);
      expect(existingRows.every((row) => row.admissions_inputs === null)).toBe(true);
    });

    beforeEach(async () => {
      mocks.userId = userId;
      await sql`update user_profiles set admissions_inputs = null where user_id = ${userId}`;
    });

    afterAll(async () => {
      await sql`delete from user_profiles where user_id in (${userId}, ${otherUserId})`;
      await sql.end({ timeout: 5 });
    });

    async function save(
      admissions: Record<string, number | boolean> | undefined,
      mode = 'replace',
    ) {
      return PUT(
        new Request('http://localhost/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: {
              geographicPreference: 'any',
              ...(admissions ? { academicScores: { admissions } } : {}),
            },
            mode,
          }),
        }),
      );
    }

    it('keeps pre-existing profiles readable with a null new field', async () => {
      const rows = await sql`select admissions_inputs from user_profiles where user_id = ${userId}`;
      expect(rows[0].admissions_inputs).toBeNull();
      const response = await GET();
      expect(response.status).toBe(200);
      expect((await response.json()).data.academicScores).toBeUndefined();
    });

    it('saves and reloads decimal averages, false confirmations and zero without other scores', async () => {
      const admissions = {
        tauBagrutAverage: 112.5,
        bguBagrutAverage: 110.25,
        tauApplicationRequirementsConfirmed: false,
        bguLanguageRequirementsConfirmed: false,
        tauMathPlacementScore: 0,
      };
      expect((await save(admissions)).status).toBe(200);
      const response = await GET();
      expect(response.status).toBe(200);
      expect((await response.json()).data.academicScores).toEqual({ admissions });
      const rows = await sql`select admissions_inputs from user_profiles where user_id = ${userId}`;
      expect(rows[0].admissions_inputs).toEqual(admissions);
      mocks.userId = otherUserId;
      expect((await (await GET()).json()).data.academicScores).toBeUndefined();
      mocks.userId = userId;
    });

    it('merges new fields while preserving existing false, zero and official averages', async () => {
      expect(
        (
          await save({
            tauBagrutAverage: 112.5,
            tauMathPlacementScore: 0,
            tauApplicationRequirementsConfirmed: false,
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await save(
            {
              tauBagrutAverage: 120,
              tauMathPlacementScore: 75,
              tauApplicationRequirementsConfirmed: true,
            },
            'merge_local_draft',
          )
        ).status,
      ).toBe(200);
      expect((await (await GET()).json()).data.academicScores.admissions).toMatchObject({
        tauBagrutAverage: 112.5,
        tauMathPlacementScore: 0,
        tauApplicationRequirementsConfirmed: false,
      });
    });

    it('replaces an existing JSON field and clears removed inputs on the next read', async () => {
      expect((await save({ bguBagrutAverage: 130 })).status).toBe(200);
      expect((await (await GET()).json()).data.academicScores).toEqual({
        admissions: { bguBagrutAverage: 130 },
      });
      expect((await save(undefined)).status).toBe(200);
      expect((await (await GET()).json()).data.academicScores).toBeUndefined();
      const rows = await sql`select admissions_inputs from user_profiles where user_id = ${userId}`;
      expect(rows[0].admissions_inputs).toBeNull();
    });
  },
);
