import type { BagrutSubject, BagrutSubjectRecord, StoredBagrutProfilePayload } from '@/types';

export function toStoredBagrutProfilePayload(
  record: BagrutSubjectRecord,
): StoredBagrutProfilePayload {
  if (record.schemaVersion === 1) {
    return record.subjects;
  }

  return {
    certificateType: record.certificateType,
    complete: record.complete,
    subjects: record.subjects,
  };
}

export function fromStoredBagrutProfileVersion(input: {
  schemaVersion: number;
  sector: BagrutSubjectRecord['sector'];
  payload: StoredBagrutProfilePayload;
  profileHash?: string;
}): BagrutSubjectRecord | undefined {
  if (input.schemaVersion === 1 && Array.isArray(input.payload)) {
    return {
      schemaVersion: 1,
      sector: input.sector,
      subjects: input.payload,
      ...(input.profileHash ? { profileHash: input.profileHash } : {}),
    };
  }

  if (input.schemaVersion === 2 && !Array.isArray(input.payload)) {
    return {
      schemaVersion: 2,
      sector: input.sector,
      certificateType: input.payload.certificateType,
      complete: input.payload.complete,
      subjects: input.payload.subjects,
      ...(input.profileHash ? { profileHash: input.profileHash } : {}),
    };
  }

  return undefined;
}

export function subjectsFromStoredBagrutProfile(
  payload: StoredBagrutProfilePayload,
): BagrutSubject[] {
  return Array.isArray(payload) ? payload : payload.subjects;
}
