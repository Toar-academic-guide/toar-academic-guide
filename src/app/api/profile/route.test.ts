import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getUserProfileSnapshot: vi.fn(),
  mergeUserProfileDraftIntoSnapshot: vi.fn(),
  replaceUserProfileSnapshot: vi.fn(),
  capture: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: hoistedMocks.createSupabaseServerClient,
}));

vi.mock('@/server/user/profile', () => ({
  getUserProfileSnapshot: hoistedMocks.getUserProfileSnapshot,
  mergeUserProfileDraftIntoSnapshot: hoistedMocks.mergeUserProfileDraftIntoSnapshot,
  replaceUserProfileSnapshot: hoistedMocks.replaceUserProfileSnapshot,
}));

vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: () => ({
    capture: hoistedMocks.capture,
  }),
}));

import { GET, PUT } from './route';

describe('profile API route', () => {
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
    hoistedMocks.getUserProfileSnapshot.mockReset();
    hoistedMocks.mergeUserProfileDraftIntoSnapshot.mockReset();
    hoistedMocks.replaceUserProfileSnapshot.mockReset();
    hoistedMocks.capture.mockReset();
  });

  it('returns 401 for unauthenticated profile reads', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'AUTH_REQUIRED',
      },
    });
  });

  it('accepts a valid replace payload and persists the parsed profile', async () => {
    hoistedMocks.replaceUserProfileSnapshot.mockResolvedValueOnce({
      geographicPreference: 'north',
      savedProgramIds: ['tau_cs'],
    });

    const response = await PUT(
      new Request('http://localhost/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: {
            firstName: ' Dana ',
            geographicPreference: 'north',
            academicScores: {
              psychometric: {
                overall: 700,
              },
            },
            savedProgramIds: [' tau_cs '],
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(hoistedMocks.replaceUserProfileSnapshot).toHaveBeenCalledWith('user-123', {
      firstName: 'Dana',
      geographicPreference: 'north',
      academicScores: {
        psychometric: {
          overall: 700,
        },
      },
      savedProgramIds: ['tau_cs'],
    });
    expect(hoistedMocks.capture).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: 'user-123',
        event: 'server_profile_updated',
        properties: { mode: 'replace' },
      })
    );
  });

  it('accepts merge_local_draft payloads used by the authenticated hook', async () => {
    hoistedMocks.mergeUserProfileDraftIntoSnapshot.mockResolvedValueOnce({
      geographicPreference: 'any',
      firstName: 'מלי',
      lastName: 'כהן',
      savedProgramIds: [],
    });

    const response = await PUT(
      new Request('http://localhost/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: {
            geographicPreference: 'any',
            firstName: 'מלי',
            lastName: 'כהן',
          },
          mode: 'merge_local_draft',
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(hoistedMocks.mergeUserProfileDraftIntoSnapshot).toHaveBeenCalledWith('user-123', {
      geographicPreference: 'any',
      firstName: 'מלי',
      lastName: 'כהן',
    });
  });

  it('returns 400 when the profile payload is missing', async () => {
    const response = await PUT(
      new Request('http://localhost/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: 'replace' }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'PROFILE_PAYLOAD_INVALID',
      },
    });
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await PUT(
      new Request('http://localhost/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'PROFILE_PAYLOAD_INVALID',
      },
    });
  });

  it('returns 400 for invalid academic score ranges', async () => {
    const response = await PUT(
      new Request('http://localhost/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: {
            geographicPreference: 'north',
            academicScores: {
              psychometric: {
                overall: 801,
              },
            },
          },
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'PROFILE_PAYLOAD_INVALID',
      },
    });
  });

  it('preserves fallback internal errors', async () => {
    hoistedMocks.replaceUserProfileSnapshot.mockRejectedValueOnce(new Error('boom'));

    const response = await PUT(
      new Request('http://localhost/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: {
            geographicPreference: 'center',
          },
        }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'PROFILE_INTERNAL_ERROR',
        message: 'boom',
      },
    });
  });
});
