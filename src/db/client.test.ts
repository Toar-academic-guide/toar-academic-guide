import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pools: [] as Array<{
    end: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    options: unknown;
  }>,
}));
vi.mock('pg', () => ({
  Pool: class {
    end = vi.fn().mockResolvedValue(undefined);
    on = vi.fn();
    constructor(public options: unknown) {
      mocks.pools.push(this);
    }
  },
}));
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle: (pool: unknown) => ({ pool }) }));
vi.mock('@/env', () => ({ requireDatabaseUrl: () => 'postgresql://local-test/fixture' }));

import { closeDb, getDb } from './client';
import { queryRows } from './queryRows';

afterEach(async () => {
  await closeDb();
  mocks.pools.length = 0;
});

describe('application database pool', () => {
  it('reads raw rows with either supported Drizzle result shape', () => {
    const rows = [{ id: 'fixture' }];
    expect(queryRows(rows)).toBe(rows);
    expect(queryRows({ rows })).toBe(rows);
  });
  it('uses a shared non-pipelined pool without changing the configured connection', () => {
    expect(getDb()).toBe(getDb());
    expect(mocks.pools).toHaveLength(1);
    expect(mocks.pools[0].options).toMatchObject({
      connectionString: 'postgresql://local-test/fixture',
      max: 1,
      pipeline: false,
    });
    expect(mocks.pools[0].on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('closes the pool and creates a fresh client for later scripts', async () => {
    const original = getDb();
    await closeDb();
    expect(mocks.pools[0].end).toHaveBeenCalledOnce();
    expect(getDb()).not.toBe(original);
  });
});
