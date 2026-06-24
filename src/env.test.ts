import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertProductionDatabaseUrlLeastPrivilege, requireDatabaseUrl } from '@/env';

describe('assertProductionDatabaseUrlLeastPrivilege', () => {
  it('rejects Supabase runtime URLs that still authenticate as postgres', () => {
    expect(() =>
      assertProductionDatabaseUrlLeastPrivilege(
        'postgresql://postgres.kfxcdbjeidczltkrjazk:secret@aws-1-eu-central-1.pooler.supabase.com:6543/postgres',
      ),
    ).toThrow(/must not authenticate as postgres/i);

    expect(() =>
      assertProductionDatabaseUrlLeastPrivilege(
        'postgresql://postgres:secret@db.kfxcdbjeidczltkrjazk.supabase.co:5432/postgres',
      ),
    ).toThrow(/must not authenticate as postgres/i);
  });

  it('allows dedicated Supabase runtime roles', () => {
    expect(() =>
      assertProductionDatabaseUrlLeastPrivilege(
        'postgresql://app_runtime.kfxcdbjeidczltkrjazk:secret@aws-1-eu-central-1.pooler.supabase.com:6543/postgres',
      ),
    ).not.toThrow();

    expect(() =>
      assertProductionDatabaseUrlLeastPrivilege(
        'postgresql://app_runtime:secret@db.kfxcdbjeidczltkrjazk.supabase.co:6543/postgres',
      ),
    ).not.toThrow();
  });

  it('ignores non-Supabase hosts', () => {
    expect(() =>
      assertProductionDatabaseUrlLeastPrivilege(
        'postgresql://postgres:secret@db.internal.example.com:5432/postgres',
      ),
    ).not.toThrow();
  });

  it('does not mask malformed URLs with a different error', () => {
    expect(() => assertProductionDatabaseUrlLeastPrivilege('not-a-url')).not.toThrow();
  });
});

describe('requireDatabaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows postgres in non-production local development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DATABASE_URL', 'postgresql://postgres:secret@localhost:5432/toar_academic_guide');

    expect(requireDatabaseUrl()).toContain('localhost:5432');
  });

  it('rejects postgres-authenticated Supabase URLs in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://postgres.kfxcdbjeidczltkrjazk:secret@aws-1-eu-central-1.pooler.supabase.com:6543/postgres',
    );

    expect(() => requireDatabaseUrl()).toThrow(/must not authenticate as postgres/i);
  });

  it('allows dedicated runtime roles in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv(
      'DATABASE_URL',
      'postgresql://app_runtime.kfxcdbjeidczltkrjazk:secret@aws-1-eu-central-1.pooler.supabase.com:6543/postgres',
    );

    expect(requireDatabaseUrl()).toContain('app_runtime.kfxcdbjeidczltkrjazk');
  });
});
