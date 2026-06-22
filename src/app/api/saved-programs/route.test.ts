import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  addSavedProgram: vi.fn(),
  removeSavedProgram: vi.fn(),
  capture: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: hoistedMocks.createSupabaseServerClient,
}));

vi.mock('@/server/user/profile', () => ({
  addSavedProgram: hoistedMocks.addSavedProgram,
  removeSavedProgram: hoistedMocks.removeSavedProgram,
}));

vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: () => ({
    capture: hoistedMocks.capture,
  }),
}));

import { DELETE, POST } from './route';

describe('saved-programs API route', () => {
  let mockSupabase: {
    auth: {
      getUser: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    hoistedMocks.createSupabaseServerClient.mockResolvedValue(mockSupabase);
    hoistedMocks.addSavedProgram.mockReset();
    hoistedMocks.removeSavedProgram.mockReset();
    hoistedMocks.capture.mockReset();
  });

  it('accepts a valid POST payload and trims the program id', async () => {
    hoistedMocks.addSavedProgram.mockResolvedValueOnce({
      geographicPreference: 'any',
      savedProgramIds: ['tau_cs'],
    });

    const response = await POST(
      new Request('http://localhost/api/saved-programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ programId: ' tau_cs ' }),
      })
    );

    expect(response.status).toBe(200);
    expect(hoistedMocks.addSavedProgram).toHaveBeenCalledWith('user-123', 'tau_cs');
    expect(hoistedMocks.capture).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: 'user-123',
        event: 'server_program_saved',
        properties: { program_id: 'tau_cs' },
      })
    );
  });

  it('accepts a valid DELETE payload', async () => {
    hoistedMocks.removeSavedProgram.mockResolvedValueOnce({
      geographicPreference: 'any',
      savedProgramIds: [],
    });

    const response = await DELETE(
      new Request('http://localhost/api/saved-programs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ programId: 'tau_cs' }),
      })
    );

    expect(response.status).toBe(200);
    expect(hoistedMocks.removeSavedProgram).toHaveBeenCalledWith('user-123', 'tau_cs');
  });

  it('returns 400 for missing or whitespace-only program ids', async () => {
    const missingResponse = await POST(
      new Request('http://localhost/api/saved-programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
    );

    expect(missingResponse.status).toBe(400);
    await expect(missingResponse.json()).resolves.toMatchObject({
      error: {
        code: 'SAVED_PROGRAM_PAYLOAD_INVALID',
      },
    });

    const emptyResponse = await DELETE(
      new Request('http://localhost/api/saved-programs', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ programId: '   ' }),
      })
    );

    expect(emptyResponse.status).toBe(400);
    await expect(emptyResponse.json()).resolves.toMatchObject({
      error: {
        code: 'SAVED_PROGRAM_PAYLOAD_INVALID',
      },
    });
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await POST(
      new Request('http://localhost/api/saved-programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'SAVED_PROGRAM_PAYLOAD_INVALID',
      },
    });
  });

  it('returns 401 for unauthenticated requests', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    const response = await POST(
      new Request('http://localhost/api/saved-programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ programId: 'tau_cs' }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'AUTH_REQUIRED',
      },
    });
  });

  it('preserves fallback internal errors', async () => {
    hoistedMocks.addSavedProgram.mockRejectedValueOnce(new Error('save failed'));

    const response = await POST(
      new Request('http://localhost/api/saved-programs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ programId: 'tau_cs' }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'SAVED_PROGRAMS_INTERNAL_ERROR',
        message: 'save failed',
      },
    });
  });
});
