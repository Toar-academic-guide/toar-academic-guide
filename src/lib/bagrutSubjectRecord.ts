import type { BagrutSubject, BagrutSubjectRecord } from '@/types';

/**
 * Legacy admissions gates expect one ordinary exam row per subject. Schema v2
 * can also contain final projects and combined assessments, which must not be
 * interpreted as those exam rows.
 */
export function bagrutExamSubjects(record: BagrutSubjectRecord | undefined): BagrutSubject[] {
  if (!record) return [];
  return record.schemaVersion === 2
    ? record.subjects.filter((subject) => subject.assessmentKind === 'exam')
    : record.subjects;
}
