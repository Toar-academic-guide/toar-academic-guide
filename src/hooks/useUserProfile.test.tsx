// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { profileRequestBodySchema } from '@/server/user/profileSchema';

let mockAuthState = {
  loading: false,
  user: null as null | {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  },
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
      }),
    );

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await waitFor(() => expect(result.current.initialProfileStatus).toBe('ready'));
    expect(result.current.profile.geographicPreference).toBe('north');
    expect(result.current.profile.savedProgramIds).toEqual(['tau_cs']);
  });

  it('persists guest assessment progress in the existing local profile record', async () => {
    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    const assessmentProgress = {
      schemaVersion: 1 as const,
      stage: 'career-assessment' as const,
      careerDraft: {
        screenIndex: 3,
        multiSelectAnswers: { Q1: ['Q1-A'] },
        quickPickAnswers: {},
        sliderAnswers: {},
        skippedScreens: [],
      },
    };

    await act(async () => {
      await result.current.updateProfile({ assessmentProgress });
    });

    expect(result.current.profile.assessmentProgress).toEqual(assessmentProgress);
    expect(JSON.parse(window.localStorage.getItem('sag_user_profile_v1') ?? '{}')).toMatchObject({
      assessmentProgress,
    });
  });

  it('reports a guest storage failure instead of claiming the assessment was saved', async () => {
    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    vi.spyOn(window.localStorage, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });

    let saved = true;
    await act(async () => {
      saved = await result.current.updateProfile({
        assessmentProgress: {
          schemaVersion: 1,
          stage: 'career-assessment',
          careerDraft: {
            screenIndex: 1,
            multiSelectAnswers: {},
            quickPickAnswers: {},
            sliderAnswers: {},
            skippedScreens: [],
          },
        },
      });
    });

    expect(saved).toBe(false);
    expect(result.current.syncError).toBe('שמירת הפרופיל במכשיר נכשלה.');
    expect(result.current.profile.assessmentProgress).toBeUndefined();
  });

  it('hydrates from the authenticated server snapshot without rewriting localStorage', async () => {
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
      }),
    );

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.profile.savedProgramIds).toEqual(['huji_law']));
    expect(result.current.initialProfileStatus).toBe('ready');
    expect(window.localStorage.getItem('sag_user_profile_v1')).toBeNull();
  });

  it('migrates admissions-only local drafts when a confirmation is false or a score is zero', async () => {
    mockAuthState.user = { id: 'user-admissions-draft' };
    const draft = {
      geographicPreference: 'any',
      academicScores: {
        admissions: { tauApplicationRequirementsConfirmed: false, tauMathPlacementScore: 0 },
      },
      savedProgramIds: [],
    };
    window.localStorage.setItem('sag_user_profile_v1', JSON.stringify(draft));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { geographicPreference: 'any', savedProgramIds: [] } }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: draft }) });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.initialProfileStatus).toBe('ready'));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      mode: 'merge_local_draft',
      profile: draft,
    });
    expect(result.current.profile.academicScores?.admissions).toEqual(
      draft.academicScores.admissions,
    );
  });

  it('keeps signed-in profile inputs unavailable until the initial server request settles', async () => {
    mockAuthState.user = { id: 'user-delayed' };
    let resolveFetch: ((response: unknown) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.initialProfileStatus).toBe('loading');

    await act(async () => {
      resolveFetch?.({
        ok: true,
        json: async () => ({
          data: {
            geographicPreference: 'any',
            academicScores: { admissions: { tauBagrutAverage: 114.25 } },
            savedProgramIds: [],
          },
        }),
      });
    });

    await waitFor(() => expect(result.current.initialProfileStatus).toBe('ready'));
    expect(result.current.profile.academicScores?.admissions?.tauBagrutAverage).toBe(114.25);
  });

  it('shows initial profile load failures and retries the server request', async () => {
    mockAuthState.user = { id: 'user-retry' };
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary profile outage'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            geographicPreference: 'any',
            academicScores: { admissions: { tauBagrutAverage: 115.5 } },
            savedProgramIds: [],
          },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.initialProfileStatus).toBe('error'));
    expect(result.current.initialProfileError).toBe('temporary profile outage');

    await act(async () => {
      result.current.retryInitialProfileLoad();
    });

    await waitFor(() => expect(result.current.initialProfileStatus).toBe('ready'));
    expect(result.current.profile.academicScores?.admissions?.tauBagrutAverage).toBe(115.5);
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

  it('clears signed-out device data and resets the local profile state', async () => {
    window.localStorage.setItem(
      'sag_user_profile_v1',
      JSON.stringify({
        geographicPreference: 'north',
        savedProgramIds: ['tau_cs'],
      }),
    );
    window.localStorage.setItem('sag_user_profile_migrated_user-1', '1');

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.hydrated).toBe(true));

    await act(async () => {
      await result.current.clearLocalProfileData();
    });

    expect(result.current.profile).toEqual({
      geographicPreference: 'any',
    });
    expect(window.localStorage.getItem('sag_user_profile_v1')).toBeNull();
    expect(window.localStorage.getItem('sag_user_profile_migrated_user-1')).toBeNull();
  });

  it('clears signed-in device data without mutating the server profile', async () => {
    mockAuthState.user = {
      id: '00000000-0000-0000-0000-000000000011',
      email: 'signed-in@example.com',
    };
    window.localStorage.setItem(
      'sag_user_profile_v1',
      JSON.stringify({
        geographicPreference: 'north',
        savedProgramIds: ['tau_cs'],
      }),
    );
    window.localStorage.setItem(
      'sag_user_profile_migrated_00000000-0000-0000-0000-000000000011',
      '1',
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          geographicPreference: 'south',
          savedProgramIds: ['huji_law'],
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.profile.savedProgramIds).toEqual(['huji_law']));

    await act(async () => {
      await result.current.clearLocalProfileData();
    });

    expect(result.current.profile.savedProgramIds).toEqual(['huji_law']);
    expect(window.localStorage.getItem('sag_user_profile_v1')).toBeNull();
    expect(
      window.localStorage.getItem('sag_user_profile_migrated_00000000-0000-0000-0000-000000000011'),
    ).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('merges stored signup names into the authenticated snapshot when the server is empty', async () => {
    mockAuthState.user = {
      id: '00000000-0000-0000-0000-000000000004',
      email: 'signup@example.com',
    };

    window.localStorage.setItem(
      'sag_user_profile_v1',
      JSON.stringify({
        geographicPreference: 'any',
        firstName: 'מלי',
        lastName: 'כהן',
      }),
    );

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            geographicPreference: 'any',
            savedProgramIds: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            geographicPreference: 'any',
            firstName: 'מלי',
            lastName: 'כהן',
            savedProgramIds: [],
          },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.profile.firstName).toBe('מלי'));
    expect(result.current.profile.lastName).toBe('כהן');
    expect(window.localStorage.getItem('sag_user_profile_v1')).toBeNull();
    const secondCall = fetchMock.mock.calls[1];
    const secondCallBody = JSON.parse(secondCall?.[1]?.body as string);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/profile',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(secondCallBody).toEqual({
      profile: {
        firstName: 'מלי',
        lastName: 'כהן',
        geographicPreference: 'any',
      },
      mode: 'merge_local_draft',
    });
    expect(profileRequestBodySchema.safeParse(secondCallBody).success).toBe(true);
  });

  it('does not migrate an anonymous assessment draft into a signed-in account', async () => {
    mockAuthState.user = {
      id: '00000000-0000-0000-0000-000000000014',
      email: 'shared-browser@example.com',
    };

    window.localStorage.setItem(
      'sag_user_profile_v1',
      JSON.stringify({
        geographicPreference: 'any',
        firstName: 'Dana',
        assessmentProgress: {
          schemaVersion: 1,
          stage: 'career-assessment',
          careerDraft: {
            screenIndex: 4,
            multiSelectAnswers: { Q1: ['Q1-A'] },
            quickPickAnswers: {},
            sliderAnswers: {},
            skippedScreens: [],
          },
        },
      }),
    );

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            geographicPreference: 'any',
            savedProgramIds: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            geographicPreference: 'any',
            firstName: 'Dana',
            savedProgramIds: [],
          },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.profile.assessmentProgress).toBeUndefined());
    const mergeBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);

    expect(mergeBody.profile.assessmentProgress).toBeUndefined();
    expect(result.current.profile.firstName).toBe('Dana');
  });

  it('hydrates Google identity names into the authenticated snapshot when the server profile is empty', async () => {
    mockAuthState.user = {
      id: '00000000-0000-0000-0000-000000000005',
      email: 'google@example.com',
      user_metadata: {
        given_name: 'Dana',
        family_name: 'Levi',
      },
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            geographicPreference: 'any',
            savedProgramIds: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            geographicPreference: 'any',
            firstName: 'Dana',
            lastName: 'Levi',
            savedProgramIds: [],
          },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.profile.firstName).toBe('Dana'));
    expect(result.current.profile.lastName).toBe('Levi');
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/profile',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          profile: {
            geographicPreference: 'any',
            firstName: 'Dana',
            lastName: 'Levi',
          },
          mode: 'merge_local_draft',
        }),
      }),
    );
  });

  it('does not overwrite existing server names with Google identity metadata', async () => {
    mockAuthState.user = {
      id: '00000000-0000-0000-0000-000000000006',
      email: 'google-existing@example.com',
      user_metadata: {
        given_name: 'Dana',
        family_name: 'Levi',
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          geographicPreference: 'any',
          firstName: 'Server',
          lastName: 'User',
          savedProgramIds: [],
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.profile.firstName).toBe('Server'));
    expect(result.current.profile.lastName).toBe('User');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails closed when local storage is malformed', async () => {
    window.localStorage.setItem('sag_user_profile_v1', '{not-json');

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.profile).toEqual({
      geographicPreference: 'any',
    });
  });

  it('drops an incompatible assessment draft without discarding the rest of the guest profile', async () => {
    window.localStorage.setItem(
      'sag_user_profile_v1',
      JSON.stringify({
        geographicPreference: 'north',
        savedProgramIds: ['tau_cs'],
        assessmentProgress: {
          schemaVersion: 2,
          stage: 'career-assessment',
        },
      }),
    );

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.profile).toEqual({
      geographicPreference: 'north',
      savedProgramIds: ['tau_cs'],
    });
  });
});
