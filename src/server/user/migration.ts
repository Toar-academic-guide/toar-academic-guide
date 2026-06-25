import type { AcademicScores, UserProfile } from '@/types';

import { DEFAULT_USER_PROFILE_SNAPSHOT, type UserProfileSnapshot } from './serializers';

export function hasMeaningfulProfileData(profile: UserProfile | null | undefined): boolean {
  if (!profile) {
    return false;
  }

  const hasIdentity = Boolean(profile.firstName?.trim()) || Boolean(profile.lastName?.trim());
  const hasSavedPrograms = (profile.savedProgramIds?.length ?? 0) > 0;
  const hasNonDefaultRegion =
    profile.geographicPreference !== undefined && profile.geographicPreference !== 'any';
  const hasAcademicScores = Boolean(
    profile.academicScores?.psychometric?.overall ??
    profile.academicScores?.psychometric?.quantitative ??
    profile.academicScores?.psychometric?.verbal ??
    profile.academicScores?.psychometric?.english ??
    profile.academicScores?.bagrut?.weightedAverage,
  );

  return hasIdentity || hasSavedPrograms || hasNonDefaultRegion || hasAcademicScores;
}

export function mergeUserProfileDraft(
  existing: UserProfileSnapshot | null | undefined,
  draft: UserProfile,
): UserProfileSnapshot {
  const base = existing ?? DEFAULT_USER_PROFILE_SNAPSHOT;
  const draftScores = draft.academicScores;
  const baseScores = base.academicScores;

  return {
    ...(base.firstName?.trim()
      ? { firstName: base.firstName }
      : draft.firstName?.trim()
        ? { firstName: draft.firstName.trim() }
        : {}),
    ...(base.lastName?.trim()
      ? { lastName: base.lastName }
      : draft.lastName?.trim()
        ? { lastName: draft.lastName.trim() }
        : {}),
    geographicPreference:
      base.geographicPreference !== 'any'
        ? base.geographicPreference
        : (draft.geographicPreference ?? base.geographicPreference),
    ...(mergeAcademicScores(baseScores, draftScores)
      ? { academicScores: mergeAcademicScores(baseScores, draftScores) }
      : {}),
    savedProgramIds: Array.from(
      new Set([...(base.savedProgramIds ?? []), ...(draft.savedProgramIds ?? [])]),
    ),
  };
}

function mergeAcademicScores(
  existing: AcademicScores | undefined,
  draft: AcademicScores | undefined,
): AcademicScores | undefined {
  if (!existing && !draft) {
    return undefined;
  }

  const merged: AcademicScores = {};

  const psychometric = {
    ...(existing?.psychometric?.overall !== undefined
      ? { overall: existing.psychometric.overall }
      : draft?.psychometric?.overall !== undefined
        ? { overall: draft.psychometric.overall }
        : {}),
    ...(existing?.psychometric?.quantitative !== undefined
      ? { quantitative: existing.psychometric.quantitative }
      : draft?.psychometric?.quantitative !== undefined
        ? { quantitative: draft.psychometric.quantitative }
        : {}),
    ...(existing?.psychometric?.verbal !== undefined
      ? { verbal: existing.psychometric.verbal }
      : draft?.psychometric?.verbal !== undefined
        ? { verbal: draft.psychometric.verbal }
        : {}),
    ...(existing?.psychometric?.english !== undefined
      ? { english: existing.psychometric.english }
      : draft?.psychometric?.english !== undefined
        ? { english: draft.psychometric.english }
        : {}),
  };

  const bagrut = {
    ...(existing?.bagrut?.weightedAverage !== undefined
      ? { weightedAverage: existing.bagrut.weightedAverage }
      : draft?.bagrut?.weightedAverage !== undefined
        ? { weightedAverage: draft.bagrut.weightedAverage }
        : {}),
  };

  if (Object.keys(psychometric).length > 0) {
    merged.psychometric = psychometric;
  }

  if (Object.keys(bagrut).length > 0) {
    merged.bagrut = bagrut;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}
