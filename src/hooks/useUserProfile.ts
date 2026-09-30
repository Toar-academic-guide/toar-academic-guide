'use client';

import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { userProfileSchema } from '@/server/user/profileSchema';
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
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  clearLocalProfileData: () => Promise<void>;
  toggleSavedProgram: (programId: string) => Promise<void>;
  removeSavedProgram: (programId: string) => Promise<void>;
  hydrated: boolean;
  initialProfileStatus: 'loading' | 'ready' | 'error';
  initialProfileError: string | null;
  retryInitialProfileLoad: () => void;
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
  const profileRef = useRef<UserProfile>(DEFAULT_PROFILE);
  const profileWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestWriteRevisionRef = useRef(0);
  const currentUserIdRef = useRef<string | null>(user?.id ?? null);
  currentUserIdRef.current = user?.id ?? null;

  function replaceProfileState(nextProfile: UserProfile) {
    profileRef.current = nextProfile;
    setProfile(nextProfile);
  }
  const [initialProfileLoad, setInitialProfileLoad] = useState<{
    identity: string;
    status: 'loading' | 'ready' | 'error';
    error?: string;
  } | null>(null);
  const [initialLoadRetry, setInitialLoadRetry] = useState(0);
  const identity = user ? `user:${user.id}` : 'guest';

  useEffect(() => {
    const storedProfile = readStoredProfile();
    if (storedProfile) {
      replaceProfileState(storedProfile);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || authLoading) {
      return;
    }

    if (!user) {
      const storedProfile = readStoredProfile();
      replaceProfileState(storedProfile ?? DEFAULT_PROFILE);
      setSyncing(false);
      setInitialProfileLoad({ identity, status: 'ready' });
      return;
    }

    let cancelled = false;

    void (async () => {
      setSyncing(true);
      setSyncError(null);
      setInitialProfileLoad({ identity, status: 'loading' });

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
          replaceProfileState(nextProfile);
          setInitialProfileLoad({ identity, status: 'ready' });
        }
      } catch (error) {
        if (!cancelled) {
          const message = toErrorMessage(error, 'לא הצלחנו לטעון את הפרופיל שלך.');
          setSyncError(message);
          setInitialProfileLoad({ identity, status: 'error', error: message });
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
  }, [authLoading, hydrated, identity, initialLoadRetry, user]);

  async function updateProfile(updates: Partial<UserProfile>) {
    const previousProfile = profileRef.current;
    const nextProfile = { ...previousProfile, ...updates };

    replaceProfileState(nextProfile);
    setSyncError(null);

    if (!user) {
      if (writeStoredProfile(nextProfile)) {
        return true;
      }

      replaceProfileState(previousProfile);
      setSyncError('שמירת הפרופיל במכשיר נכשלה.');
      return false;
    }

    const userId = user.id;
    const revision = latestWriteRevisionRef.current + 1;
    latestWriteRevisionRef.current = revision;
    setSyncing(true);

    const saveRequest = profileWriteQueueRef.current
      .catch(() => undefined)
      .then(() => {
        if (currentUserIdRef.current !== userId) {
          throw new Error('Profile owner changed before the save could start.');
        }
        return putProfileSnapshot(nextProfile, 'replace');
      });
    profileWriteQueueRef.current = saveRequest.then(
      () => undefined,
      () => undefined,
    );

    try {
      const savedProfile = await saveRequest;
      if (latestWriteRevisionRef.current === revision && currentUserIdRef.current === userId) {
        replaceProfileState(savedProfile);
      }
      return true;
    } catch (error) {
      if (latestWriteRevisionRef.current === revision && currentUserIdRef.current === userId) {
        setSyncError(toErrorMessage(error, 'שמירת הפרופיל נכשלה.'));
        replaceProfileState(previousProfile);
      }
      return false;
    } finally {
      if (latestWriteRevisionRef.current === revision && currentUserIdRef.current === userId) {
        setSyncing(false);
      }
    }
  }

  function retryInitialProfileLoad() {
    setInitialProfileLoad({ identity, status: 'loading' });
    setSyncError(null);
    setInitialLoadRetry((attempt) => attempt + 1);
  }

  async function clearLocalProfileData() {
    clearStoredProfile();
    clearStoredMigrationMarkers();
    setSyncError(null);

    if (!user) {
      replaceProfileState(DEFAULT_PROFILE);
    }
  }

  async function toggleSavedProgram(programId: string) {
    const currentProfile = profileRef.current;
    const current = currentProfile.savedProgramIds ?? [];
    if (current.includes(programId)) {
      await removeSavedProgram(programId);
      return;
    }

    const previousProfile = currentProfile;
    const nextProfile = { ...currentProfile, savedProgramIds: [...current, programId] };
    replaceProfileState(nextProfile);
    setSyncError(null);

    if (!user) {
      if (!writeStoredProfile(nextProfile)) {
        replaceProfileState(previousProfile);
        setSyncError('שמירת הפרופיל במכשיר נכשלה.');
      }
      return;
    }

    setSyncing(true);
    try {
      const savedProfile = await mutateSavedProgram(programId, 'POST');
      replaceProfileState(savedProfile);
    } catch (error) {
      setSyncError(toErrorMessage(error, 'שמירת התוכנית נכשלה.'));
      replaceProfileState(previousProfile);
    } finally {
      setSyncing(false);
    }
  }

  async function removeSavedProgram(programId: string) {
    const previousProfile = profileRef.current;
    const nextProfile = {
      ...previousProfile,
      savedProgramIds: (previousProfile.savedProgramIds ?? []).filter((id) => id !== programId),
    };

    replaceProfileState(nextProfile);
    setSyncError(null);

    if (!user) {
      if (!writeStoredProfile(nextProfile)) {
        replaceProfileState(previousProfile);
        setSyncError('שמירת הפרופיל במכשיר נכשלה.');
      }
      return;
    }

    setSyncing(true);
    try {
      const savedProfile = await mutateSavedProgram(programId, 'DELETE');
      replaceProfileState(savedProfile);
    } catch (error) {
      setSyncError(toErrorMessage(error, 'הסרת התוכנית נכשלה.'));
      replaceProfileState(previousProfile);
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
    initialProfileStatus:
      !hydrated || authLoading || initialProfileLoad?.identity !== identity
        ? 'loading'
        : initialProfileLoad.status,
    initialProfileError:
      initialProfileLoad?.identity === identity && initialProfileLoad.status === 'error'
        ? (initialProfileLoad.error ?? null)
        : null,
    retryInitialProfileLoad,
    syncing,
    syncError,
    isAuthenticated: Boolean(user),
  };
}

function readStoredProfile(): UserProfile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const storedValue = JSON.parse(raw) as unknown;
    const parsed = userProfileSchema.safeParse(storedValue);
    if (parsed.success) {
      return parsed.data;
    }

    if (storedValue && typeof storedValue === 'object' && 'assessmentProgress' in storedValue) {
      const profileWithoutAssessment = { ...storedValue, assessmentProgress: undefined };
      const compatibleProfile = userProfileSchema.safeParse(profileWithoutAssessment);
      return compatibleProfile.success ? compatibleProfile.data : null;
    }

    return null;
  } catch {
    return null;
  }
}

export function saveUserProfileIdentityDraft(
  identity: Pick<UserProfile, 'firstName' | 'lastName'>,
) {
  const nextProfile = {
    ...(readStoredProfile() ?? DEFAULT_PROFILE),
    ...(identity.firstName?.trim() ? { firstName: identity.firstName.trim() } : {}),
    ...(identity.lastName?.trim() ? { lastName: identity.lastName.trim() } : {}),
  };

  writeStoredProfile(nextProfile);
}

export function deriveSocialIdentityDraft(
  profile: UserProfile,
  metadata: Record<string, unknown> | undefined,
): Partial<UserProfile> | null {
  const firstName = profile.firstName?.trim()
    ? undefined
    : readMetadataText(metadata, 'given_name');
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
  socialIdentityDraft: Partial<UserProfile> | null,
): UserProfile | null {
  if (!storedProfile && !socialIdentityDraft) {
    return null;
  }

  return {
    ...(storedProfile ? { ...storedProfile, assessmentProgress: undefined } : DEFAULT_PROFILE),
    ...(socialIdentityDraft?.firstName && !storedProfile?.firstName?.trim()
      ? { firstName: socialIdentityDraft.firstName }
      : {}),
    ...(socialIdentityDraft?.lastName && !storedProfile?.lastName?.trim()
      ? { lastName: socialIdentityDraft.lastName }
      : {}),
  };
}

function writeStoredProfile(profile: UserProfile): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
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
    Object.values(profile.academicScores?.admissions ?? {}).some((value) => value !== undefined) ||
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
