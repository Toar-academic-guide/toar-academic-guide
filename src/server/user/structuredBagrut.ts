import 'server-only';

import { createHash } from 'node:crypto';

import type { BagrutSubjectRecord } from '@/types';

export type NormalizedBagrutSubjectRecord = BagrutSubjectRecord & { profileHash: string };

export function normalizeStructuredBagrutRecord(
  record: BagrutSubjectRecord,
): NormalizedBagrutSubjectRecord {
  const subjects = (
    record.schemaVersion === 2
      ? record.subjects.map((subject) => ({
          subjectId: subject.subjectId.trim().toLowerCase(),
          units: subject.units,
          grade: subject.grade,
          assessmentKind: subject.assessmentKind,
        }))
      : record.subjects.map((subject) => ({
          subjectId: subject.subjectId.trim().toLowerCase(),
          units: subject.units,
          grade: subject.grade,
        }))
  ).sort(
    (left, right) =>
      left.subjectId.localeCompare(right.subjectId) ||
      ('assessmentKind' in left && 'assessmentKind' in right
        ? String(left.assessmentKind).localeCompare(String(right.assessmentKind))
        : 0),
  );
  const normalizedRecord = {
    schemaVersion: record.schemaVersion,
    sector: record.sector,
    ...(record.schemaVersion === 2
      ? { certificateType: record.certificateType, complete: record.complete }
      : {}),
    subjects,
  } as Omit<NormalizedBagrutSubjectRecord, 'profileHash'>;

  return {
    ...normalizedRecord,
    profileHash: `sha256:${createHash('sha256')
      .update(JSON.stringify(normalizedRecord))
      .digest('hex')}`,
  } as NormalizedBagrutSubjectRecord;
}
