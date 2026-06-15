import type { UserProfile } from '@/types';
import type { SavedProgramRow, UserProfileRow, UploadedDocumentRow } from '@/db/types';

export interface UserProfileSnapshot extends UserProfile {
  savedProgramIds: string[];
}

export const DEFAULT_USER_PROFILE_SNAPSHOT: UserProfileSnapshot = {
  geographicPreference: 'any',
  savedProgramIds: [],
  uploadedDocuments: [],
};

export function serializeUserProfileSnapshot(
  profileRow: UserProfileRow | undefined,
  savedProgramRows: Pick<SavedProgramRow, 'programId'>[],
  uploadedDocumentRows?: UploadedDocumentRow[]
): UserProfileSnapshot {
  if (!profileRow) {
    return {
      ...DEFAULT_USER_PROFILE_SNAPSHOT,
      savedProgramIds: savedProgramRows.map((row) => row.programId),
      uploadedDocuments: uploadedDocumentRows?.map((row) => ({
        id: row.id,
        kind: row.kind,
        originalFileName: row.originalFileName,
        sizeBytes: row.sizeBytes,
      })) || [],
    };
  }

  const academicScores =
    profileRow.psychometricOverall !== null ||
    profileRow.psychometricQuantitative !== null ||
    profileRow.psychometricVerbal !== null ||
    profileRow.psychometricEnglish !== null ||
    profileRow.bagrutWeightedAverage !== null
      ? {
          ...(profileRow.psychometricOverall !== null ||
          profileRow.psychometricQuantitative !== null ||
          profileRow.psychometricVerbal !== null ||
          profileRow.psychometricEnglish !== null
            ? {
                psychometric: {
                  ...(profileRow.psychometricOverall !== null
                    ? { overall: profileRow.psychometricOverall }
                    : {}),
                  ...(profileRow.psychometricQuantitative !== null
                    ? { quantitative: profileRow.psychometricQuantitative }
                    : {}),
                  ...(profileRow.psychometricVerbal !== null ? { verbal: profileRow.psychometricVerbal } : {}),
                  ...(profileRow.psychometricEnglish !== null
                    ? { english: profileRow.psychometricEnglish }
                    : {}),
                },
              }
            : {}),
          ...(profileRow.bagrutWeightedAverage !== null
            ? {
                bagrut: {
                  weightedAverage: profileRow.bagrutWeightedAverage,
                },
              }
            : {}),
        }
      : undefined;

  return {
    ...(profileRow.firstName ? { firstName: profileRow.firstName } : {}),
    ...(profileRow.lastName ? { lastName: profileRow.lastName } : {}),
    geographicPreference: profileRow.geographicPreference,
    ...(academicScores ? { academicScores } : {}),
    savedProgramIds: savedProgramRows.map((row) => row.programId),
    uploadedDocuments: uploadedDocumentRows?.map((row) => ({
      id: row.id,
      kind: row.kind,
      originalFileName: row.originalFileName,
      sizeBytes: row.sizeBytes,
    })) || [],
  };
}

export function buildUserProfileRow(userId: string, profile: UserProfile) {
  return {
    userId,
    firstName: profile.firstName?.trim() || null,
    lastName: profile.lastName?.trim() || null,
    geographicPreference: profile.geographicPreference,
    psychometricOverall: profile.academicScores?.psychometric?.overall ?? null,
    psychometricQuantitative: profile.academicScores?.psychometric?.quantitative ?? null,
    psychometricVerbal: profile.academicScores?.psychometric?.verbal ?? null,
    psychometricEnglish: profile.academicScores?.psychometric?.english ?? null,
    bagrutWeightedAverage: profile.academicScores?.bagrut?.weightedAverage ?? null,
  };
}
