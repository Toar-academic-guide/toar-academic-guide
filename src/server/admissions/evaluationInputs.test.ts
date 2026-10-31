import { describe, expect, it } from 'vitest';
import type { BagrutSubjectRecordV2 } from '@/types';
import { TAU_BAGRUT_AVERAGE_VERIFICATION } from '@/data/admissions/tauBagrutAverageVerification';
import { HAIFA_ADMISSION_YEAR } from '@/lib/haifaAdmissionsInputs';
import { normalizeEvaluationInputs } from './evaluationInputs';

const bguRecord: BagrutSubjectRecordV2 = {
  schemaVersion: 2,
  sector: 'jewish',
  certificateType: 'internal',
  complete: true,
  subjects: [
    ['history', 2],
    ['civics', 2],
    ['mathematics', 3],
    ['english', 5],
    ['literature', 5],
    ['bible', 2],
    ['hebrew_expression', 2],
  ].map(([subjectId, units]) => ({
    subjectId: String(subjectId),
    units: Number(units),
    grade: 100,
    assessmentKind: 'exam',
  })),
};

describe('evaluation input derivation and provenance', () => {
  it.each(['other', 'external_1977_or_later'] as const)(
    'derives the BGU average from a non-internal %s certificate',
    (certificateType) => {
      const normalized = normalizeEvaluationInputs({
        degreeId: 'bgu_cs',
        extraInputs: { bagrutSubjectRecord: { ...bguRecord, certificateType } },
      });

      expect(normalized.input.extraInputs.bguBagrutAverage).toBe(111.9);
      expect(normalized.reasons.bgu).toBeUndefined();
    },
  );

  it('uses the reviewed BGU worked example (111.9), deriving the generic unit average separately', () => {
    const source = { degreeId: 'bgu_cs', extraInputs: { bagrutSubjectRecord: bguRecord } };
    const before = structuredClone(source);
    const normalized = normalizeEvaluationInputs(source);
    expect(normalized.input.bagrut).toBe(100);
    expect(normalized.input.extraInputs.bguBagrutAverage).toBe(111.9);
    expect(normalized.reasons.bgu).toBeUndefined();
    expect(normalized.overallReason).toBeTruthy();
    expect(source).toEqual(before);
  });
  it('replays TAU’s published 108.39 example without using the generic average', () => {
    const normalized = normalizeEvaluationInputs({
      degreeId: 'tau_cs',
      bagrut: 110,
      extraInputs: { bagrutSubjectRecord: TAU_BAGRUT_AVERAGE_VERIFICATION.record },
    });
    expect(normalized.input.bagrut).toBe(110);
    expect(normalized.input.extraInputs.tauBagrutAverage).toBe(108.39);
    expect(normalized.reasons.tau).toBeUndefined();
  });
  it('keeps explicit institutional averages and historical exam years unchanged', () => {
    const normalized = normalizeEvaluationInputs({
      degreeId: 'tau_cs',
      bagrut: 105,
      extraInputs: {
        bagrutSubjectRecord: bguRecord,
        bguBagrutAverage: 103,
        tauBagrutAverage: 104,
        haifaBagrutAverage: 102,
        colmanBagrutAverage: 101,
        haifaBagrutYear: 2015,
        haifaPsychometricYear: 2020,
      },
    });
    expect(normalized.input.extraInputs).toMatchObject({
      bguBagrutAverage: 103,
      tauBagrutAverage: 104,
      haifaBagrutAverage: 102,
      colmanBagrutAverage: 101,
      haifaBagrutYear: 2015,
      haifaPsychometricYear: 2020,
    });
    expect(normalized.reasons).toEqual({});
  });
  it('marks every average-only institutional proxy and the assumed Haifa cycle', () => {
    const normalized = normalizeEvaluationInputs({
      degreeId: 'cs',
      bagrut: 105,
      psychometric: 650,
    });
    expect(normalized.input.extraInputs).toMatchObject({
      bguBagrutAverage: 105,
      tauBagrutAverage: 105,
      haifaBagrutAverage: 105,
      colmanBagrutAverage: 105,
      haifaBagrutYear: HAIFA_ADMISSION_YEAR,
      haifaPsychometricYear: HAIFA_ADMISSION_YEAR,
    });
    for (const id of ['bgu', 'tau', 'haifa', 'colman'])
      expect(normalized.reasons[id].join(' ')).toContain('105');
    expect(normalized.input.extraInputs.bagrutSubjectRecord).toBeUndefined();
    expect(normalized.input.extraInputs.psychometricMath).toBeUndefined();
    expect(normalized.input.extraInputs.haifaAdmissionQualification).toBeUndefined();
  });
  it.each([
    { ...bguRecord, complete: false },
    { ...bguRecord, subjects: bguRecord.subjects.slice(0, 2) },
  ])('does not disguise a failed subject calculation with an overall-average proxy', (record) => {
    const normalized = normalizeEvaluationInputs({
      degreeId: 'cs',
      bagrut: 110,
      extraInputs: { bagrutSubjectRecord: record },
    });
    expect(normalized.input.extraInputs.bguBagrutAverage).toBeUndefined();
    expect(normalized.input.extraInputs.tauBagrutAverage).toBeUndefined();
    expect(normalized.input.extraInputs.haifaBagrutAverage).toBeUndefined();
    expect(normalized.input.extraInputs.colmanBagrutAverage).toBeUndefined();
    expect(normalized.reasons.bgu).toBeUndefined();
  });
  it('does not invent an overall average for an empty record', () => {
    const normalized = normalizeEvaluationInputs({
      degreeId: 'cs',
      extraInputs: {
        bagrutSubjectRecord: { ...bguRecord, subjects: [] },
      },
    });
    expect(normalized.input.bagrut).toBeUndefined();
    expect(normalized.input.extraInputs.bguBagrutAverage).toBeUndefined();
  });
});

it('keeps request-level derived-average provenance after the API receives a number', () => {
  const normalized = normalizeEvaluationInputs({
    degreeId: 'huji_cs',
    bagrut: 100,
    bagrutAverageEstimated: true,
    extraInputs: { bagrutSubjectRecord: bguRecord },
  });
  expect(normalized.input.bagrut).toBe(100);
  expect(normalized.overallReason).toBeTruthy();
});
