'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import type { GeographicRegion, UserProfile } from '@/types';

const STORAGE_KEY = 'sag_user_profile_v1';
const MIGRATION_KEY_PREFIX = 'sag_user_profile_migrated_';

const DEFAULT_PROFILE: UserProfile = {
  geographicPreference: 'any',
};

interface ApiEnvelope<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface UseUserProfileResult {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearLocalProfileData: () => Promise<void>;
  toggleSavedProgram: (programId: string) => Promise<void>;
  removeSavedProgram: (programId: string) => Promise<void>;
  hydrated: boolean;
  syncing: boolean;
  syncError: string | null;
  isAuthenticated: boolean;
}

export function useUserProfile(): UseUserProfileResult {
  const { loading: authLoading, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const storedProfile = readStoredProfile();
    if (storedProfile) {
      setProfile(storedProfile);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || authLoading) {
      return;
    }

    if (!user) {
      const storedProfile = readStoredProfile();
      setProfile(storedProfile ?? DEFAULT_PROFILE);
      setSyncing(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setSyncing(true);
      setSyncError(null);

      try {
        let nextProfile = await fetchProfileSnapshot();
        const storedProfile = readStoredProfile();
        const socialIdentityDraft = deriveSocialIdentityDraft(nextProfile, user.user_metadata);
        const draftToMerge = mergeProfileDraftSources(storedProfile, socialIdentityDraft);
        const migrationKey = `${MIGRATION_KEY_PREFIX}${user.id}`;

        if (
          draftToMerge &&
          hasMeaningfulDraft(draftToMerge) &&
          window.localStorage.getItem(migrationKey) !== '1'
        ) {
          nextProfile = await putProfileSnapshot(draftToMerge, 'merge_local_draft');
          window.localStorage.setItem(migrationKey, '1');
        }
        clearStoredProfile();

        if (!cancelled) {
          setProfile(nextProfile);
        }
      } catch (error) {
        if (!cancelled) {
          setSyncError(toErrorMessage(error, 'לא הצלחנו לסנכרן את הפרופיל שלך.'));
        }
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, hydrated, user]);

  async function updateProfile(updates: Partial<UserProfile>) {
    const previousProfile = profile;
    const nextProfile = { ...previousProfile, ...updates };

    setProfile(nextProfile);
    setSyncError(null);

    if (!user) {
      writeStoredProfile(nextProfile);
      return;
    }

    setSyncing(true);
    try {
      const savedProfile = await putProfileSnapshot(nextProfile, 'replace');
      setProfile(savedProfile);
    } catch (error) {
      setSyncError(toErrorMessage(error, 'שמירת הפרופיל נכשלה.'));
      setProfile(previousProfile);
    } finally {
      setSyncing(false);
    }
  }

  async function clearLocalProfileData() {
    clearStoredProfile();
    clearStoredMigrationMarkers();
    setSyncError(null);

    if (!user) {
      setProfile(DEFAULT_PROFILE);
    }
  }

  async function toggleSavedProgram(programId: string) {
    const current = profile.savedProgramIds ?? [];
    if (current.includes(programId)) {
      await removeSavedProgram(programId);
      return;
    }

    const previousProfile = profile;
    const nextProfile = { ...profile, savedProgramIds: [...current, programId] };
    setProfile(nextProfile);
    setSyncError(null);

    if (!user) {
      writeStoredProfile(nextProfile);
      return;
    }

    setSyncing(true);
    try {
      const savedProfile = await mutateSavedProgram(programId, 'POST');
      setProfile(savedProfile);
    } catch (error) {
      setSyncError(toErrorMessage(error, 'שמירת התוכנית נכשלה.'));
      setProfile(previousProfile);
    } finally {
      setSyncing(false);
    }
  }

  async function removeSavedProgram(programId: string) {
    const previousProfile = profile;
    const nextProfile = {
      ...profile,
      savedProgramIds: (profile.savedProgramIds ?? []).filter((id) => id !== programId),
    };

    setProfile(nextProfile);
    setSyncError(null);

    if (!user) {
      writeStoredProfile(nextProfile);
      return;
    }

    setSyncing(true);
    try {
      const savedProfile = await mutateSavedProgram(programId, 'DELETE');
      setProfile(savedProfile);
    } catch (error) {
      setSyncError(toErrorMessage(error, 'הסרת התוכנית נכשלה.'));
      setProfile(previousProfile);
    } finally {
      setSyncing(false);
    }
  }

  return {
    profile,
    updateProfile,
    clearLocalProfileData,
    toggleSavedProgram,
    removeSavedProgram,
    hydrated,
    syncing,
    syncError,
    isAuthenticated: Boolean(user),
  };
}

function readStoredProfile(): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function saveUserProfileIdentityDraft(identity: Pick<UserProfile, 'firstName' | 'lastName'>) {
  const nextProfile = {
    ...(readStoredProfile() ?? DEFAULT_PROFILE),
    ...(identity.firstName?.trim() ? { firstName: identity.firstName.trim() } : {}),
    ...(identity.lastName?.trim() ? { lastName: identity.lastName.trim() } : {}),
  };

  writeStoredProfile(nextProfile);
}

export function deriveSocialIdentityDraft(
  profile: UserProfile,
  metadata: Record<string, unknown> | undefined
): Partial<UserProfile> | null {
  const firstName = profile.firstName?.trim() ? undefined : readMetadataText(metadata, 'given_name');
  const lastName = profile.lastName?.trim() ? undefined : readMetadataText(metadata, 'family_name');

  if (!firstName && !lastName) {
    return null;
  }

  return {
    geographicPreference: profile.geographicPreference,
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
  };
}

export function mergeProfileDraftSources(
  storedProfile: UserProfile | null,
  socialIdentityDraft: Partial<UserProfile> | null
): UserProfile | null {
  if (!storedProfile && !socialIdentityDraft) {
    return null;
  }

  return {
    ...(storedProfile ?? DEFAULT_PROFILE),
    ...(socialIdentityDraft?.firstName && !storedProfile?.firstName?.trim()
      ? { firstName: socialIdentityDraft.firstName }
      : {}),
    ...(socialIdentityDraft?.lastName && !storedProfile?.lastName?.trim()
      ? { lastName: socialIdentityDraft.lastName }
      : {}),
  };
}

function writeStoredProfile(profile: UserProfile) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore local storage write errors.
  }
}

function clearStoredProfile() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore local storage write errors.
  }
}

function clearStoredMigrationMarkers() {
  try {
    const keysToRemove: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(MIGRATION_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore local storage write errors.
  }
}

function hasMeaningfulDraft(profile: UserProfile): boolean {
  return (
    Boolean(profile.firstName?.trim()) ||
    Boolean(profile.lastName?.trim()) ||
    profile.geographicPreference !== 'any' ||
    Boolean(profile.academicScores?.psychometric?.overall) ||
    Boolean(profile.academicScores?.psychometric?.quantitative) ||
    Boolean(profile.academicScores?.psychometric?.verbal) ||
    Boolean(profile.academicScores?.psychometric?.english) ||
    Boolean(profile.academicScores?.bagrut?.weightedAverage) ||
    (profile.savedProgramIds?.length ?? 0) > 0
  );
}

function readMetadataText(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

async function fetchProfileSnapshot() {
  const response = await fetch('/api/profile', {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  const payload = (await response.json()) as ApiEnvelope<UserProfile>;
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message ?? 'Unable to load profile.');
  }

  return payload.data;
}

async function putProfileSnapshot(profile: UserProfile, mode: 'replace' | 'merge_local_draft') {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ profile, mode }),
  });

  const payload = (await response.json()) as ApiEnvelope<UserProfile>;
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message ?? 'Unable to save profile.');
  }

  return payload.data;
}

async function mutateSavedProgram(programId: string, method: 'POST' | 'DELETE') {
  const response = await fetch('/api/saved-programs', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ programId }),
  });

  const payload = (await response.json()) as ApiEnvelope<UserProfile>;
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message ?? 'Unable to update saved programs.');
  }

  return payload.data;
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export type { GeographicRegion };
