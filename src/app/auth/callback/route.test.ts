import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: hoistedMocks.createSupabaseServerClient,
}));

import { GET } from './route';

describe('auth callback route', () => {
  let mockSupabase: {
    auth: {
      exchangeCodeForSession: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSupabase = {
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    hoistedMocks.createSupabaseServerClient.mockReset();
    hoistedMocks.createSupabaseServerClient.mockResolvedValue(mockSupabase);
  });

  it('redirects to the default app path after a successful exchange', async () => {
    const response = await GET(new Request('http://localhost:3000/auth/callback?code=test-code'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/');
    expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('test-code');
  });

  it('redirects to a valid relative next path after a successful exchange', async () => {
    const response = await GET(
      new Request(
        'http://localhost:3000/auth/callback?code=test-code&next=%2Fapp%2Fsaved-programs',
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/app/saved-programs');
  });

  it('redirects to an error fallback when the callback code is missing', async () => {
    const response = await GET(new Request('http://localhost:3000/auth/callback'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/?auth=oauth_error');
    expect(mockSupabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('redirects to an error fallback when the code exchange fails', async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValueOnce({
      error: new Error('exchange failed'),
    });

    const response = await GET(new Request('http://localhost:3000/auth/callback?code=test-code'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/?auth=oauth_error');
  });

  it('falls back to the default path when next is not relative', async () => {
    const response = await GET(
      new Request(
        'http://localhost:3000/auth/callback?code=test-code&next=https%3A%2F%2Fevil.example',
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('falls back to the default path when next targets internal operator pages', async () => {
    const response = await GET(
      new Request(
        'http://localhost:3000/auth/callback?code=test-code&next=%2Finternal%2Fdata-health',
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/');
  });
});
