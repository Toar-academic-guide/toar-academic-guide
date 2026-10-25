import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { sql, eq } from 'drizzle-orm';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { closeDb, getDb } from './client';
import { queryRows } from './queryRows';
import { admissionThresholds, programs, savedPrograms, userProfiles } from './schema';

vi.mock('server-only', () => ({}));
import { getUserProfileSnapshot, replaceUserProfileSnapshot } from '@/server/user/profile';

const enabled = process.env.APP_DB_INTEGRATION === '1';
if (enabled && !['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)) {
  throw new Error('Use disposable localhost PostgreSQL only.');
}

describe.skipIf(!enabled)('application database driver with PostgreSQL', () => {
  const userId = randomUUID();
  afterAll(async () => {
    await getDb().delete(userProfiles).where(eq(userProfiles.userId, userId));
    await closeDb();
  });

  it('reads the seeded fractional EE threshold as an application number', async () => {
    const [threshold] = await getDb()
      .select({ value: admissionThresholds.thresholdValue })
      .from(admissionThresholds)
      .where(eq(admissionThresholds.programId, 'technion_ee'));
    expect(threshold?.value).toBe(91.5);
  });

  it('settles overlapping parameterized and large reads without mixing results', async () => {
    const db = getDb();
    const results = await Promise.all([
      db.execute(sql`select ${'profile'}::text as label`),
      db.execute(sql`select generate_series(1, 5000) as n`),
      db.execute(sql`select ${JSON.stringify({ target: 'tau' })}::jsonb as payload`),
      db.execute(sql`select ${42}::integer as n`),
    ]);
    expect(queryRows(results[0])).toEqual([{ label: 'profile' }]);
    expect(queryRows(results[1])).toHaveLength(5000);
    expect(queryRows(results[2])).toEqual([{ payload: { target: 'tau' } }]);
    expect(queryRows(results[3])).toEqual([{ n: 42 }]);
  });

  it('rolls back a transaction and releases its only connection for the next query', async () => {
    const db = getDb();
    await expect(
      db.transaction(async (tx) => {
        await tx.insert(userProfiles).values({ userId, geographicPreference: 'any' });
        await tx.transaction(async (nested) => {
          expect(queryRows(await nested.execute(sql`select 1 as n`))).toEqual([{ n: 1 }]);
        });
        throw new Error('deliberate rollback');
      }),
    ).rejects.toThrow('deliberate rollback');
    expect(await db.select().from(userProfiles).where(eq(userProfiles.userId, userId))).toEqual([]);
  });

  it('saves and reloads the profile through the real runtime driver', async () => {
    await replaceUserProfileSnapshot(userId, {
      geographicPreference: 'any',
      academicScores: {
        psychometric: { overall: 680 },
        bagrut: { weightedAverage: 110.5 },
        admissions: { tauBagrutAverage: 100, tauApplicationRequirementsConfirmed: true },
      },
    });
    expect((await getUserProfileSnapshot(userId)).academicScores).toMatchObject({
      psychometric: { overall: 680 },
      bagrut: { weightedAverage: 110.5 },
      admissions: { tauBagrutAverage: 100, tauApplicationRequirementsConfirmed: true },
    });
  });

  it('corrects the legacy Danon classification without deleting saved references or changing admission data', async () => {
    const db = getDb();
    const migration = readFileSync(
      new URL('./migrations/0038_correct_danon_classification.sql', import.meta.url),
      'utf8',
    );
    await expect(
      db.transaction(async (tx) => {
        const [culinary] = await tx.select().from(programs).where(eq(programs.id, 'danon_chef'));
        expect(culinary).toBeDefined();
        const legacy = {
          ...culinary,
          id: 'danon_cs',
          name: 'מדעי המחשב - דנון - קולינריה',
          category: 'מדעי המחשב',
        };
        await tx.insert(programs).values(legacy);
        await tx.insert(savedPrograms).values({ userId, programId: legacy.id });
        await tx.execute(sql.raw(migration));
        const [corrected] = await tx.select().from(programs).where(eq(programs.id, legacy.id));
        expect(corrected).toEqual({
          ...legacy,
          name: 'קולינריה - דנון - קולינריה',
          category: 'קולינריה',
          updatedAt: expect.any(Date),
        });
        expect(
          await tx.select().from(savedPrograms).where(eq(savedPrograms.userId, userId)),
        ).toEqual([expect.objectContaining({ programId: legacy.id })]);
        expect(await tx.select().from(programs).where(eq(programs.id, culinary.id))).toEqual([
          culinary,
        ]);
        await tx.execute(sql.raw(migration));
        expect(await tx.select().from(programs).where(eq(programs.id, legacy.id))).toEqual([
          corrected,
        ]);
        throw new Error('rollback Danon fixture');
      }),
    ).rejects.toThrow('rollback Danon fixture');
  });
});
