import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getUserProfileSnapshot: vi.fn(),
  mergeUserProfileDraftIntoSnapshot: vi.fn(),
  replaceUserProfileSnapshot: vi.fn(),
  getPostHogClient: vi.fn(),
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
  getPostHogClient: hoistedMocks.getPostHogClient,
}));

vi.mock('server-only', () => ({}));

import { GET, PUT } from './route';

describe('profile API route', () => {
  let mockSupabase: {
    auth: {
      getUser: ReturnType<typeof vi.fn>;
    };
  };
  let mockCapture: ReturnType<typeof vi.fn>;

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

    mockCapture = vi.fn();

    hoistedMocks.createSupabaseServerClient.mockReset();
    hoistedMocks.getUserProfileSnapshot.mockReset();
    hoistedMocks.mergeUserProfileDraftIntoSnapshot.mockReset();
    hoistedMocks.replaceUserProfileSnapshot.mockReset();
    hoistedMocks.getPostHogClient.mockReset();

    hoistedMocks.createSupabaseServerClient.mockResolvedValue(mockSupabase);
    hoistedMocks.getUserProfileSnapshot.mockResolvedValue({
      geographicPreference: 'any',
      savedProgramIds: [],
    });
    hoistedMocks.mergeUserProfileDraftIntoSnapshot.mockResolvedValue({
      geographicPreference: 'center',
      savedProgramIds: ['program-1'],
    });
    hoistedMocks.replaceUserProfileSnapshot.mockResolvedValue({
      geographicPreference: 'center',
      savedProgramIds: [],
    });
    hoistedMocks.getPostHogClient.mockReturnValue({
      capture: mockCapture,
    });
  });

  it('returns 503 when Supabase auth is not configured', async () => {
    hoistedMocks.createSupabaseServerClient.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'SUPABASE_AUTH_UNAVAILABLE' },
    });
  });

  it('returns 401 for unauthenticated profile reads', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'AUTH_REQUIRED' },
    });
  });

  it('returns the current profile snapshot for authenticated requests', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { geographicPreference: 'any', savedProgramIds: [] },
    });
    expect(hoistedMocks.getUserProfileSnapshot).toHaveBeenCalledWith('user-123');
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
    expect(mockCapture).toHaveBeenCalledWith(
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
    const request = new Request('http://localhost/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ mode: 'replace' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await PUT(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'PROFILE_PAYLOAD_INVALID' },
    });
    expect(hoistedMocks.replaceUserProfileSnapshot).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const request = new Request('http://localhost/api/profile', {
      method: 'PUT',
      body: '{',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await PUT(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'PROFILE_PAYLOAD_INVALID' },
    });
  });

  it('returns 400 for invalid academic score ranges', async () => {
    const request = new Request('http://localhost/api/profile', {
      method: 'PUT',
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
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await PUT(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'PROFILE_PAYLOAD_INVALID' },
    });
  });

  it('preserves fallback internal errors for profile reads', async () => {
    hoistedMocks.getUserProfileSnapshot.mockRejectedValueOnce(new Error('profile exploded'));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'PROFILE_INTERNAL_ERROR',
        message: 'profile exploded',
      },
    });
  });

  it('preserves fallback internal errors for profile writes', async () => {
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
