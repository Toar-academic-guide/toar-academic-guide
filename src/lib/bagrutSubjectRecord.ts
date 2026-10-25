import type { AdmissionsExtraInputs } from '@/types/admissionsEvaluation';
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

/** Same grade-by-unit estimate used by the subject wizard, without institutional bonuses. */
export function overallBagrutAverage(record: BagrutSubjectRecord | undefined): number | undefined {
  if (!record?.subjects.length) return undefined;
  const units = record.subjects.reduce((sum, subject) => sum + subject.units, 0);
  if (units <= 0) return undefined;
  return (
    Math.round(
      (record.subjects.reduce((sum, subject) => sum + subject.grade * subject.units, 0) / units) *
        10,
    ) / 10
  );
}

/** A supplied exam row takes precedence over the legacy paired math fields. */
export function bguMathematicsSubjects(extra: AdmissionsExtraInputs | undefined): BagrutSubject[] {
  const subjects = bagrutExamSubjects(extra?.bagrutSubjectRecord);
  if (subjects.some((subject) => subject.subjectId === 'mathematics')) return subjects;
  if (extra?.mathUnits === undefined || extra.mathGrade === undefined) return subjects;
  return [
    ...subjects,
    { subjectId: 'mathematics', units: extra.mathUnits, grade: extra.mathGrade },
  ];
}
