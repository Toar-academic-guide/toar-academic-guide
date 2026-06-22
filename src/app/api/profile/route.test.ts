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
  let mockSupabase: any;
  let mockCapture: any;

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

  it('returns 401 when the request is unauthenticated', async () => {
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

  it('returns 400 when the profile payload is missing required fields', async () => {
    const request = new Request('http://localhost/api/profile', {
      method: 'PUT',
      body: JSON.stringify({
        profile: {
          firstName: 'Amit',
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
    expect(hoistedMocks.replaceUserProfileSnapshot).not.toHaveBeenCalled();
  });

  it('updates the profile and captures the server-side event', async () => {
    const request = new Request('http://localhost/api/profile', {
      method: 'PUT',
      body: JSON.stringify({
        profile: {
          geographicPreference: 'center',
          savedProgramIds: [],
        },
        mode: 'replace',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await PUT(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { geographicPreference: 'center', savedProgramIds: [] },
    });
    expect(hoistedMocks.replaceUserProfileSnapshot).toHaveBeenCalledWith('user-123', {
      geographicPreference: 'center',
      savedProgramIds: [],
    });
    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: 'user-123',
      event: 'server_profile_updated',
      properties: { mode: 'replace' },
    });
  });

  it('serializes unexpected failures with the profile fallback error code', async () => {
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
});
