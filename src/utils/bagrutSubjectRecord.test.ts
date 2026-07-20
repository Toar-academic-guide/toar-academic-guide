import { describe, expect, it } from 'vitest';

import { buildBagrutSubjectRecord } from './bagrutSubjectRecord';

describe('buildBagrutSubjectRecord', () => {
  it('converts wizard labels into stable structured subjects for replay', () => {
    expect(
      buildBagrutSubjectRecord({
        sectorLabel: 'יהודי',
        subjects: [
          { label: 'מתמטיקה', units: 5, grade: 92 },
          { label: 'פיזיקה', units: 5, grade: 88 },
          { label: 'תנ״ך', units: 2, grade: 90 },
        ],
      }),
    ).toEqual({
      schemaVersion: 1,
      sector: 'jewish',
      subjects: [
        { subjectId: 'bible', units: 2, grade: 90 },
        { subjectId: 'mathematics', units: 5, grade: 92 },
        { subjectId: 'physics', units: 5, grade: 88 },
      ],
    });
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
      schemaVersion: 1,
      sector: 'jewish',
      subjects: [{ subjectId: 'chemistry', units: 5, grade: 85 }],
    });
  });
});
