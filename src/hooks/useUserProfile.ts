'use client';

import { useState, useEffect } from 'react';
import type { UserProfile, GeographicRegion } from '@/types';

const STORAGE_KEY = 'sag_user_profile_v1';

const DEFAULT_PROFILE: UserProfile = {
  geographicPreference: 'any',
};

/**
 * localStorage-backed user profile hook.
 *
 * Reads the persisted profile on mount (client-only); exposes an
 * `updateProfile` function that merges partial updates and writes
 * them back to localStorage in one shot.
 *
 * `hydrated` is false during SSR/initial render to prevent
 * hydration mismatches.
 */
export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile(JSON.parse(raw) as UserProfile);
    } catch {
      // Ignore parse / access errors (private browsing, storage full, etc.)
    }
    setHydrated(true);
  }, []);

  function updateProfile(updates: Partial<UserProfile>) {
    setProfile((prev) => {
      const next: UserProfile = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore write errors
      }
      return next;
    });
  }

  function clearProfile() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setProfile(DEFAULT_PROFILE);
  }

  return { profile, updateProfile, clearProfile, hydrated };
}

// Re-export type convenience
export type { GeographicRegion };
