import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UNIVERSITIES } from '@/data/degreesData';
import {
  institutions,
  universityCalculatorConfigs,
  programs,
  programInstitutions,
} from '@/db/schema';
const mocks = vi.hoisted(() => ({ getDb: vi.fn(), after: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ after: mocks.after }));
vi.mock('@/db/client', () => ({ getDb: mocks.getDb }));
vi.mock('@/env', () => ({
  getCatalogueSourceMode: () => 'database',
  hasDatabaseUrl: () => true,
  isProductionRuntime: () => true,
}));
import { listCatalogueInstitutions, resetDatabaseCatalogueSnapshotCache } from './queries';

function db(name: string, gate = Promise.resolve()) {
  const rows = new Map<object, unknown[]>([
    [institutions, [{ id: 'tau', name, region: 'center' }]],
    [
      universityCalculatorConfigs,
      UNIVERSITIES.map((row) => ({ institutionId: row.id, formulaType: 'weighted_scaled' })),
    ],
    [programs, [{ id: 'test', admissionType: 'requirements' }]],
    [programInstitutions, [{ programId: 'test', institutionId: 'tau' }]],
  ]);
  return {
    select: () => ({
      from: (table: object) => {
        const result = gate.then(() => rows.get(table) ?? []);
        return Object.assign(result, { where: () => result });
      },
    }),
  };
}
const settle = async () => {
  await vi.advanceTimersByTimeAsync(0);
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  resetDatabaseCatalogueSnapshotCache();
  mocks.getDb.mockReset();
  mocks.after.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('catalogue snapshot stale while revalidate', () => {
  it('keeps a snapshot fresh for five minutes', async () => {
    mocks.getDb.mockReturnValue(db('first'));
    await listCatalogueInstitutions();
    await vi.advanceTimersByTimeAsync(299_999);
    expect((await listCatalogueInstitutions()).meta.catalogueSnapshotCacheStatus).toBe('hit');
    expect(mocks.getDb).toHaveBeenCalledTimes(1);
  });

  it('returns stale immediately to concurrent callers and registers only one background refresh', async () => {
    mocks.getDb.mockReturnValue(db('first'));
    const first = await listCatalogueInstitutions();
    let release!: () => void;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    mocks.getDb.mockReturnValue(db('refreshed', gate));
    await vi.advanceTimersByTimeAsync(300_001);
    const values: Awaited<ReturnType<typeof listCatalogueInstitutions>>[] = [];
    const calls = [
      listCatalogueInstitutions().then((v) => values.push(v)),
      listCatalogueInstitutions().then((v) => values.push(v)),
    ];
    await settle();
    const immediate = values.length;
    release();
    await Promise.all(calls);
    await settle();
    expect(immediate).toBe(2);
    expect(values.every((v) => v.meta.catalogueSnapshotCacheStatus === 'stale')).toBe(true);
    expect(values[0].data).toEqual(first.data);
    expect(mocks.getDb).toHaveBeenCalledTimes(2);
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect((await listCatalogueInstitutions()).data[0].name).toBe('refreshed');
  });

  it('keeps the last good snapshot after refresh failure but blocks after thirty minutes', async () => {
    mocks.getDb.mockReturnValue(db('first'));
    const first = await listCatalogueInstitutions();
    mocks.getDb.mockImplementation(() => {
      throw new Error('offline');
    });
    await vi.advanceTimersByTimeAsync(300_001);
    const stale = await listCatalogueInstitutions().catch(() => null);
    await settle();
    expect(stale?.data).toEqual(first.data);
    expect(stale?.meta.catalogueSnapshotCacheStatus).toBe('stale');
    await vi.advanceTimersByTimeAsync(30 * 60_000);
    await expect(listCatalogueInstitutions()).rejects.toMatchObject({
      code: 'CATALOGUE_DATABASE_UNAVAILABLE',
    });
  });

  it('does not publish a degraded snapshot and works outside a request scope', async () => {
    mocks.after.mockImplementation(() => {
      throw new Error('outside request');
    });
    mocks.getDb.mockReturnValue(db('first'));
    const first = await listCatalogueInstitutions();
    mocks.getDb.mockReturnValue({ select: () => ({ from: async () => [] }) });
    await vi.advanceTimersByTimeAsync(300_001);
    const stale = await listCatalogueInstitutions().catch(() => null);
    await settle();
    expect(stale?.data).toEqual(first.data);
    mocks.getDb.mockReturnValue(db('recovered'));
    await listCatalogueInstitutions();
    await settle();
    expect((await listCatalogueInstitutions()).data[0].name).toBe('recovered');
  });
});
