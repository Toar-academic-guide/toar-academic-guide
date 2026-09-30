import { X509Certificate } from 'node:crypto';
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

afterEach(() => {
  globalThis.__toarAcademicGuideOpsDb__ = undefined;
  mocks.pools.length = 0;
});

describe('operational database TLS', () => {
  it.each([
    ...['require', 'verify-ca', 'verify-full', 'prefer'].map((mode) => ({
      host: 'db.example.supabase.co:5432',
      mode,
    })),
    { host: 'aws-1-eu-central-1.pooler.supabase.com:5432', mode: 'require' },
    { host: 'aws-1-eu-central-1.pooler.supabase.com:6543', mode: 'require' },
  ])('verifies Supabase certificates for $host with sslmode=$mode', ({ host, mode }) => {
    mocks.url = `postgresql://ops_readonly:fixture@${host}/postgres?sslmode=${mode}&application_name=data-health`;
    expect(getOpsDb()).toBe(getOpsDb());
    expect(mocks.pools).toHaveLength(1);
    const options = mocks.pools[0];
    expect(options).toMatchObject({ max: 2, pipeline: false });
    expect(options.ssl).toMatchObject({ rejectUnauthorized: true });
    if (!options.ssl || typeof options.ssl !== 'object') throw new Error('TLS required');
    expect(options.ssl.checkServerIdentity).toBeUndefined();
    const ca = new X509Certificate(options.ssl.ca as string);
    expect(ca.fingerprint256).toBe(
      '80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA',
    );
    // pg replaces explicit ssl options if sslmode is left in the URL.
    const connection = new URL(options.connectionString!);
    expect(connection.searchParams.has('sslmode')).toBe(false);
    expect(connection.searchParams.get('application_name')).toBe('data-health');
    expect(connection.username).toBe('ops_readonly');
    expect(connection.password).toBe('fixture');
  });

  it.each([
    'postgresql://localhost/fixture',
    'postgresql://ops@aws-1-eu-central-1.pooler.supabase.com.attacker.test/postgres?sslmode=require',
    'postgresql://ops@db.example.supabase.co.attacker.test/postgres?sslmode=require',
    'postgresql://ops@db.example.supabase.co/postgres?sslmode=disable',
    'postgresql://ops@db.example.supabase.co/postgres?sslmode=verify-full&sslrootcert=/custom/ca.crt',
    'postgresql://ops@aws-1-eu-central-1.pooler.supabase.com/postgres?sslmode=verify-full&sslrootcert=/custom/ca.crt',
  ])('preserves connection settings outside the Supabase default-CA case', (url) => {
    mocks.url = url;
    getOpsDb();
    expect(mocks.pools[0].connectionString).toBe(url);
    expect(mocks.pools[0].ssl).toBeUndefined();
  });
});
