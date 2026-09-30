import { describe, expect, it } from 'vitest';

import { buildBagrutSubjectRecord } from './bagrutSubjectRecord';
import { userProfileSchema } from '@/server/user/profileSchema';

describe('buildBagrutSubjectRecord', () => {
  it.each(['פיסיקה', 'פיזיקה'])('recognizes the physics picker spelling %s', (label) => {
    const record = buildBagrutSubjectRecord({
      sectorLabel: 'יהודי',
      subjects: [{ label, units: 4, grade: 70 }],
    });

    expect(record.subjects).toEqual([
      { subjectId: 'physics', units: 4, grade: 70, assessmentKind: 'exam' },
    ]);
  });

  it('allows unmapped elective subjects to pass the real profile API schema', () => {
    const record = buildBagrutSubjectRecord({
      sectorLabel: 'יהודי',
      subjects: [
        { label: 'ביולוגיה חקלאית', units: 5, grade: 85 },
        { label: 'אמנות הקולנוע', units: 5, grade: 90 },
      ],
    });

    expect(record.subjects).toHaveLength(2);
    expect(new Set(record.subjects.map((subject) => subject.subjectId)).size).toBe(2);
    expect(
      userProfileSchema.safeParse({
        geographicPreference: 'any',
        academicScores: { bagrut: { weightedAverage: 115, subjectRecord: record } },
      }).success,
    ).toBe(true);
  });

  it('converts wizard labels into stable structured subjects for replay', () => {
    expect(
      buildBagrutSubjectRecord({
        certificateType: 'internal',
        complete: true,
        sectorLabel: 'יהודי',
        subjects: [
          { label: 'מתמטיקה', units: 5, grade: 92, assessmentKind: 'exam' },
          { label: 'פיזיקה', units: 5, grade: 88, assessmentKind: 'exam' },
          { label: 'תנ״ך', units: 2, grade: 90, assessmentKind: 'exam' },
        ],
      }),
    ).toEqual({
      schemaVersion: 2,
      sector: 'jewish',
      certificateType: 'internal',
      complete: true,
      subjects: [
        { subjectId: 'bible', units: 2, grade: 90, assessmentKind: 'exam' },
        { subjectId: 'mathematics', units: 5, grade: 92, assessmentKind: 'exam' },
        { subjectId: 'physics', units: 5, grade: 88, assessmentKind: 'exam' },
      ],
    });
  });

  it('preserves a subject exam and its additional final project as separate entries', () => {
    const record = buildBagrutSubjectRecord({
      certificateType: 'external_1977_or_later',
      complete: true,
      sectorLabel: 'יהודי',
      subjects: [
        { label: 'פיזיקה', units: 5, grade: 90, assessmentKind: 'exam' },
        { label: 'פיזיקה', units: 5, grade: 95, assessmentKind: 'final_project' },
      ],
    });

    expect(record.subjects).toEqual([
      { subjectId: 'physics', units: 5, grade: 90, assessmentKind: 'exam' },
      { subjectId: 'physics', units: 5, grade: 95, assessmentKind: 'final_project' },
    ]);
  });

  it('omits incomplete or invalid rows instead of persisting an impossible route input', () => {
    expect(
      buildBagrutSubjectRecord({
        sectorLabel: 'יהודי',
        subjects: [
          { label: 'מתמטיקה', units: 6, grade: 92 },
          { label: 'פיזיקה', units: 5, grade: 101 },
          { label: 'כימיה', units: 5, grade: 85 },
        ],
      }),
    ).toEqual({
      schemaVersion: 2,
      sector: 'jewish',
      certificateType: 'other',
      complete: false,
      subjects: [{ subjectId: 'chemistry', units: 5, grade: 85, assessmentKind: 'exam' }],
    });
  });

  it('cannot mark a record complete when any supplied row is discarded', () => {
    const record = buildBagrutSubjectRecord({
      certificateType: 'internal',
      complete: true,
      sectorLabel: 'יהודי',
      subjects: [
        { label: 'מתמטיקה', units: 5, grade: 90 },
        { label: 'פיזיקה', units: 5, grade: 101 },
      ],
    });

    expect(record).toMatchObject({
      complete: false,
      subjects: [{ subjectId: 'mathematics', units: 5, grade: 90, assessmentKind: 'exam' }],
    });
  });
});
