import type { PoolConfig } from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  url: '',
  pools: [] as PoolConfig[],
}));
vi.mock('pg', () => ({
  Pool: class {
    on = vi.fn();
    constructor(options: PoolConfig) {
      mocks.pools.push(options);
    }
  },
}));
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle: (pool: unknown) => ({ pool }) }));
vi.mock('@/env', () => ({ requireOpsDatabaseUrl: () => mocks.url }));

import { getOpsDb } from './opsClient';
import { SUPABASE_ROOT_CA } from './supabaseRootCa';

afterEach(() => {
  globalThis.__toarAcademicGuideOpsDb__ = undefined;
  mocks.pools.length = 0;
});

describe('operational database pool', () => {
  it.each(['db.example.supabase.co', 'aws-1-eu-central-1.pooler.supabase.com'])(
    'uses shared Supabase TLS options for %s',
    (host) => {
      mocks.url = `postgresql://ops_readonly:fixture@${host}/postgres?sslmode=require`;
      expect(getOpsDb()).toBe(getOpsDb());
      expect(mocks.pools).toHaveLength(1);
      expect(mocks.pools[0]).toEqual({
        connectionString: `postgresql://ops_readonly:fixture@${host}/postgres`,
        ssl: { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true },
        max: 2,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 20000,
        pipeline: false,
      });
    },
  );

  it('preserves a local connection without TLS overrides', () => {
    mocks.url = 'postgresql://localhost/fixture';
    getOpsDb();
    expect(mocks.pools[0].connectionString).toBe(mocks.url);
    expect(mocks.pools[0].ssl).toBeUndefined();
  });
});
