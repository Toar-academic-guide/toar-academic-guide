import type { PoolConfig } from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  url: 'postgresql://local-test/fixture',
  pools: [] as Array<{
    end: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    options: PoolConfig;
  }>,
}));
vi.mock('pg', () => ({
  Pool: class {
    end = vi.fn().mockResolvedValue(undefined);
    on = vi.fn();
    constructor(public options: PoolConfig) {
      mocks.pools.push(this);
    }
  },
}));
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle: (pool: unknown) => ({ pool }) }));
vi.mock('@/env', () => ({ requireDatabaseUrl: () => mocks.url }));

import { closeDb, getDb } from './client';
import { queryRows } from './queryRows';
import { SUPABASE_ROOT_CA } from './supabaseRootCa';

afterEach(async () => {
  await closeDb();
  mocks.pools.length = 0;
  mocks.url = 'postgresql://local-test/fixture';
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

  it.each(['db.example.supabase.co:5432', 'aws-1-eu-central-1.pooler.supabase.com:6543'])(
    'verifies Supabase TLS for %s',
    (host) => {
      mocks.url = `postgresql://app_runtime:fixture@${host}/postgres?sslmode=require&application_name=review`;
      getDb();
      expect(mocks.pools[0].options).toEqual({
        connectionString: `postgresql://app_runtime:fixture@${host}/postgres?application_name=review`,
        ssl: { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true },
        max: 1,
        pipeline: false,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 20000,
      });
    },
  );

  it.each([
    'postgresql://localhost/fixture?sslmode=require',
    'postgresql://other.example/fixture?sslmode=require',
    ...['db.example.supabase.co', 'aws-1-eu-central-1.pooler.supabase.com'].flatMap((host) => [
      `postgresql://app@${host}/postgres`,
      `postgresql://app@${host}/postgres?sslmode=disable`,
      `postgresql://app@${host}.attacker.test/postgres?sslmode=require`,
      ...['sslrootcert', 'sslcert', 'sslkey', 'ssl'].map(
        (param) => `postgresql://app@${host}/postgres?sslmode=require&${param}=/custom/cert`,
      ),
    ]),
  ])('preserves configured connection settings for %s', (url) => {
    mocks.url = url;
    getDb();
    expect(mocks.pools[0].options.connectionString).toBe(url);
    expect(mocks.pools[0].options.ssl).toBeUndefined();
  });

  it('closes the pool and creates a fresh client for later scripts', async () => {
    const original = getDb();
    await closeDb();
    expect(mocks.pools[0].end).toHaveBeenCalledOnce();
    expect(getDb()).not.toBe(original);
  });
});
