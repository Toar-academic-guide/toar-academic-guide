import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  headers: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: hoistedMocks.createSupabaseServerClient,
}));

vi.mock('next/headers', () => ({
  headers: hoistedMocks.headers,
}));

vi.mock('server-only', () => ({}));

import { getInternalAdminAuthorization, parseInternalAdminEmails } from './adminAuth';

describe('parseInternalAdminEmails', () => {
  it('normalizes case and whitespace while ignoring blank entries', () => {
    expect(parseInternalAdminEmails(' Admin@Example.com, ,owner@example.com  ')).toEqual(
      new Set(['admin@example.com', 'owner@example.com']),
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
    hoistedMocks.headers.mockReset();
    hoistedMocks.headers.mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    });
  });

  it('allows the CI E2E internal admin bypass only with the matching header token', async () => {
    vi.stubEnv('CI', 'true');
    vi.stubEnv('INTERNAL_ADMIN_E2E_EMAIL', 'Operator@Example.com');
    vi.stubEnv('INTERNAL_ADMIN_E2E_TOKEN', 'ci-secret-token');
    hoistedMocks.headers.mockResolvedValueOnce({
      get: vi.fn((name: string) =>
        name === 'x-internal-admin-e2e-token' ? 'ci-secret-token' : null,
      ),
    });

    await expect(getInternalAdminAuthorization()).resolves.toEqual({
      status: 'admin',
      isAdmin: true,
      user: {
        id: 'ci-e2e-internal-admin',
        email: 'operator@example.com',
      },
    });
    expect(hoistedMocks.createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('does not allow the CI E2E bypass on Vercel deployments', async () => {
    vi.stubEnv('CI', 'true');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('INTERNAL_ADMIN_E2E_EMAIL', 'operator@example.com');
    vi.stubEnv('INTERNAL_ADMIN_E2E_TOKEN', 'ci-secret-token');

    await expect(getInternalAdminAuthorization()).resolves.toEqual({
      status: 'non_admin',
      isAdmin: false,
      user: {
        id: 'user-123',
        email: 'operator@example.com',
      },
    });
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
