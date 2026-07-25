import 'server-only';

import { createHash } from 'node:crypto';

import type { BagrutSubjectRecord } from '@/types';

export function normalizeStructuredBagrutRecord(
  record: BagrutSubjectRecord,
): Required<BagrutSubjectRecord> {
  const normalizedRecord = {
    schemaVersion: 1 as const,
    sector: record.sector,
    subjects: record.subjects
      .map((subject) => ({
        subjectId: subject.subjectId.trim().toLowerCase(),
        units: subject.units,
        grade: subject.grade,
      }))
      .sort((left, right) => left.subjectId.localeCompare(right.subjectId)),
  };

  return {
    ...normalizedRecord,
    profileHash: `sha256:${createHash('sha256')
      .update(JSON.stringify(normalizedRecord))
      .digest('hex')}`,
  };
}
