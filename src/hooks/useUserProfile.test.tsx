// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

var mockAuthState = {
  loading: false,
  user: null as null | { id: string; email?: string | null },
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    loading: mockAuthState.loading,
    user: mockAuthState.user,
  }),
}));

import { useUserProfile } from '@/hooks/useUserProfile';

describe('useUserProfile', () => {
  beforeEach(() => {
    mockAuthState = {
      loading: false,
      user: null,
    };
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('hydrates from localStorage for signed-out users', async () => {
    window.localStorage.setItem(
      'sag_user_profile_v1',
      JSON.stringify({
        geographicPreference: 'north',
        savedProgramIds: ['tau_cs'],
      })
    );

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.profile.geographicPreference).toBe('north');
    expect(result.current.profile.savedProgramIds).toEqual(['tau_cs']);
  });

  it('hydrates from the authenticated server snapshot and rewrites localStorage', async () => {
    mockAuthState.user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'test@example.com',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            geographicPreference: 'south',
            academicScores: {
              psychometric: {
                overall: 702,
              },
            },
            savedProgramIds: ['huji_law'],
          },
        }),
      })
    );

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.profile.savedProgramIds).toEqual(['huji_law']));
    expect(window.localStorage.getItem('sag_user_profile_v1')).toContain('huji_law');
  });

  it('optimistically toggles saved programs for anonymous users', async () => {
    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => {
      await result.current.toggleSavedProgram('tau_cs');
    });

    expect(result.current.profile.savedProgramIds).toEqual(['tau_cs']);
    expect(window.localStorage.getItem('sag_user_profile_v1')).toContain('tau_cs');
  });
});
