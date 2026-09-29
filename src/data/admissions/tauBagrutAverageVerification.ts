import type { BagrutSubjectRecordV2 } from '@/types';

/** Reviewed worked example published by TAU's Bagrut calculation guide. */
export const TAU_BAGRUT_AVERAGE_VERIFICATION = {
  id: 'tau-published-optimized-average-example-108-39',
  sourceUrl: 'https://go.tau.ac.il/he/ba/how-to-calculate',
  capturedAt: '2026-09-29',
  expectedAverage: 108.39,
  record: {
    schemaVersion: 2,
    sector: 'arab',
    certificateType: 'internal',
    complete: true,
    subjects: [
      { subjectId: 'english', units: 4, grade: 93, assessmentKind: 'exam' },
      { subjectId: 'hebrew_expression', units: 3, grade: 82, assessmentKind: 'exam' },
      { subjectId: 'arabic', units: 5, grade: 91, assessmentKind: 'exam' },
      { subjectId: 'mathematics', units: 5, grade: 74, assessmentKind: 'exam' },
      { subjectId: 'biology', units: 5, grade: 59, assessmentKind: 'exam' },
      { subjectId: 'history', units: 2, grade: 97, assessmentKind: 'exam' },
      { subjectId: 'civics', units: 2, grade: 86, assessmentKind: 'exam' },
      { subjectId: 'arab_history', units: 1, grade: 96, assessmentKind: 'exam' },
      { subjectId: 'chemistry', units: 5, grade: 91, assessmentKind: 'exam' },
    ],
  } satisfies BagrutSubjectRecordV2,
} as const;
