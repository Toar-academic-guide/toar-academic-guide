import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: hoistedMocks.createSupabaseServerClient,
}));

vi.mock('server-only', () => ({}));

import { getInternalAdminAuthorization, parseInternalAdminEmails } from './adminAuth';

describe('parseInternalAdminEmails', () => {
  it('normalizes case and whitespace while ignoring blank entries', () => {
    expect(parseInternalAdminEmails(' Admin@Example.com, ,owner@example.com  ')).toEqual(
      new Set(['admin@example.com', 'owner@example.com'])
    );
  });

  it('returns an empty set for missing configuration', () => {
    expect(parseInternalAdminEmails(undefined)).toEqual(new Set());
    expect(parseInternalAdminEmails('   ')).toEqual(new Set());
  });
});

describe('getInternalAdminAuthorization', () => {
  let mockSupabase: {
    auth: {
      getUser: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'operator@example.com' } },
          error: null,
        }),
      },
    };

    hoistedMocks.createSupabaseServerClient.mockReset();
    hoistedMocks.createSupabaseServerClient.mockResolvedValue(mockSupabase);
  });

  it('denies access when Supabase auth is unavailable', async () => {
    vi.stubEnv('INTERNAL_ADMIN_EMAILS', 'operator@example.com');
    hoistedMocks.createSupabaseServerClient.mockResolvedValueOnce(null);

    await expect(getInternalAdminAuthorization()).resolves.toEqual({
      status: 'supabase_unavailable',
      isAdmin: false,
    });
  });

  it('denies access for unauthenticated users', async () => {
    vi.stubEnv('INTERNAL_ADMIN_EMAILS', 'operator@example.com');
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    await expect(getInternalAdminAuthorization()).resolves.toEqual({
      status: 'unauthenticated',
      isAdmin: false,
    });
  });

  it('denies access for authenticated users outside the allowlist', async () => {
    vi.stubEnv('INTERNAL_ADMIN_EMAILS', 'admin@example.com');

    await expect(getInternalAdminAuthorization()).resolves.toEqual({
      status: 'non_admin',
      isAdmin: false,
      user: {
        id: 'user-123',
        email: 'operator@example.com',
      },
    });
  });

  it('allows access for allowlisted users with normalized email matching', async () => {
    vi.stubEnv('INTERNAL_ADMIN_EMAILS', ' OPERATOR@example.com ');

    await expect(getInternalAdminAuthorization()).resolves.toEqual({
      status: 'admin',
      isAdmin: true,
      user: {
        id: 'user-123',
        email: 'operator@example.com',
      },
    });
  });

  it('denies access when the allowlist is missing', async () => {
    await expect(getInternalAdminAuthorization()).resolves.toEqual({
      status: 'non_admin',
      isAdmin: false,
      user: {
        id: 'user-123',
        email: 'operator@example.com',
      },
    });
  });

  it('denies access without leaking auth errors', async () => {
    vi.stubEnv('INTERNAL_ADMIN_EMAILS', 'operator@example.com');
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('network failure'));

    await expect(getInternalAdminAuthorization()).resolves.toEqual({
      status: 'unauthenticated',
      isAdmin: false,
    });
  });

  it('denies users that have no trusted email value', async () => {
    vi.stubEnv('INTERNAL_ADMIN_EMAILS', 'operator@example.com');
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    await expect(getInternalAdminAuthorization()).resolves.toEqual({
      status: 'non_admin',
      isAdmin: false,
      user: {
        id: 'user-123',
        email: null,
      },
    });
  });
});
