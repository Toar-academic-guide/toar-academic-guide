import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  addSavedProgram: vi.fn(),
  removeSavedProgram: vi.fn(),
  getPostHogClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: hoistedMocks.createSupabaseServerClient,
}));

vi.mock('@/server/user/profile', () => ({
  addSavedProgram: hoistedMocks.addSavedProgram,
  removeSavedProgram: hoistedMocks.removeSavedProgram,
}));

vi.mock('@/lib/posthog-server', () => ({
  getPostHogClient: hoistedMocks.getPostHogClient,
}));

vi.mock('server-only', () => ({}));

import { DELETE, POST } from './route';

describe('saved programs API route', () => {
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
    hoistedMocks.addSavedProgram.mockResolvedValue({
      geographicPreference: 'any',
      savedProgramIds: ['program-1'],
    });
    hoistedMocks.removeSavedProgram.mockResolvedValue({
      geographicPreference: 'any',
      savedProgramIds: [],
    });
    hoistedMocks.getPostHogClient.mockReturnValue({
      capture: mockCapture,
    });
  });

  it('returns 401 when the request is unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Unauthorized'),
    });

    const request = new Request('http://localhost/api/saved-programs', {
      method: 'POST',
      body: JSON.stringify({ programId: 'program-1' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'AUTH_REQUIRED' },
    });
  });

  it('returns 400 when POST is missing a program id', async () => {
    const request = new Request('http://localhost/api/saved-programs', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'PROGRAM_ID_REQUIRED' },
    });
    expect(hoistedMocks.addSavedProgram).not.toHaveBeenCalled();
  });

  it('saves a program and captures the server-side event', async () => {
    const request = new Request('http://localhost/api/saved-programs', {
      method: 'POST',
      body: JSON.stringify({ programId: 'program-1' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { savedProgramIds: ['program-1'] },
    });
    expect(hoistedMocks.addSavedProgram).toHaveBeenCalledWith('user-123', 'program-1');
    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: 'user-123',
      event: 'server_program_saved',
      properties: { program_id: 'program-1' },
    });
  });

  it('returns 400 when DELETE is missing a program id', async () => {
    const request = new Request('http://localhost/api/saved-programs', {
      method: 'DELETE',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'PROGRAM_ID_REQUIRED' },
    });
    expect(hoistedMocks.removeSavedProgram).not.toHaveBeenCalled();
  });

  it('removes a saved program and captures the server-side event', async () => {
    const request = new Request('http://localhost/api/saved-programs', {
      method: 'DELETE',
      body: JSON.stringify({ programId: 'program-1' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { savedProgramIds: [] },
    });
    expect(hoistedMocks.removeSavedProgram).toHaveBeenCalledWith('user-123', 'program-1');
    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: 'user-123',
      event: 'server_program_removed',
      properties: { program_id: 'program-1' },
    });
  });

  it('serializes unexpected failures with the saved-programs fallback error code', async () => {
    hoistedMocks.addSavedProgram.mockRejectedValueOnce(new Error('save exploded'));

    const request = new Request('http://localhost/api/saved-programs', {
      method: 'POST',
      body: JSON.stringify({ programId: 'program-1' }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'SAVED_PROGRAMS_INTERNAL_ERROR',
        message: 'save exploded',
      },
    });
  });
});
