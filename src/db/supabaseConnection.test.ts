import { X509Certificate } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { supabaseConnectionOptions } from './supabaseConnection';

describe('Supabase connection options', () => {
  it('passes socket connection strings through when URL parsing fails', () => {
    const connectionString = 'postgresql://app_runtime@/postgres?host=/var/run/postgresql';
    expect(() => new URL(connectionString)).toThrow();
    expect(() => supabaseConnectionOptions(connectionString)).not.toThrow();
    expect(supabaseConnectionOptions(connectionString)).toEqual({ connectionString });
  });

  it.each([
    ...['require', 'verify-ca', 'verify-full', 'prefer'].map((mode) => ({
      host: 'db.example.supabase.co:5432',
      mode,
    })),
    { host: 'aws-1-eu-central-1.pooler.supabase.com:5432', mode: 'require' },
    { host: 'aws-1-eu-central-1.pooler.supabase.com:6543', mode: 'require' },
  ])('verifies Supabase certificates for $host with sslmode=$mode', ({ host, mode }) => {
    const url = `postgresql://ops_readonly:fixture@${host}/postgres?sslmode=${mode}&application_name=data-health`;
    const options = supabaseConnectionOptions(url);
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
    'postgresql://localhost/fixture?sslmode=require',
    'postgresql://other.example/fixture?sslmode=require',
    'postgresql://ops@db.example.supabase.co/postgres',
    'postgresql://ops@aws-1-eu-central-1.pooler.supabase.com/postgres',
    'postgresql://ops@db.example.supabase.co/postgres?sslmode=unexpected',
    ...['db.example.supabase.co', 'aws-1-eu-central-1.pooler.supabase.com'].flatMap((host) =>
      ['sslrootcert', 'sslcert', 'sslkey', 'ssl'].map(
        (param) => `postgresql://ops@${host}/postgres?sslmode=require&${param}=`,
      ),
    ),
    'postgresql://ops@aws-1-eu-central-1.pooler.supabase.com.attacker.test/postgres?sslmode=require',
    'postgresql://ops@db.example.supabase.co.attacker.test/postgres?sslmode=require',
    'postgresql://ops@db.example.supabase.co/postgres?sslmode=disable',
    'postgresql://ops@db.example.supabase.co/postgres?sslmode=verify-full&sslrootcert=/custom/ca.crt',
    'postgresql://ops@aws-1-eu-central-1.pooler.supabase.com/postgres?sslmode=verify-full&sslrootcert=/custom/ca.crt',
  ])('preserves connection settings outside the Supabase default-CA case', (url) => {
    expect(supabaseConnectionOptions(url)).toEqual({ connectionString: url });
  });
});
