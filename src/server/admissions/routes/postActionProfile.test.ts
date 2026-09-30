import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { BagrutSubjectRecordV2 } from '@/types';

import { recomputePostActionProfile } from './postActionProfile';

const tauRecord: BagrutSubjectRecordV2 = {
  schemaVersion: 2,
  sector: 'jewish',
  certificateType: 'internal',
  complete: true,
  subjects: [
    { subjectId: 'english', units: 5, grade: 80, assessmentKind: 'exam' },
    { subjectId: 'mathematics', units: 4, grade: 79, assessmentKind: 'exam' },
    { subjectId: 'hebrew_expression', units: 2, grade: 80, assessmentKind: 'exam' },
    { subjectId: 'history', units: 2, grade: 80, assessmentKind: 'exam' },
    { subjectId: 'civics', units: 2, grade: 80, assessmentKind: 'exam' },
    { subjectId: 'physics', units: 5, grade: 70, assessmentKind: 'exam' },
  ],
};

describe('recomputePostActionProfile', () => {
  it.each([
    {
      name: 'grade improvement',
      action: {
        id: 'math_79_90',
        kind: 'improve_grade' as const,
        subjectId: 'mathematics',
        fromGrade: 79,
        toGrade: 90,
      },
    },
    {
      name: 'unit expansion',
      action: {
        id: 'math_4_5',
        kind: 'expand_units' as const,
        subjectId: 'mathematics',
        fromUnits: 4,
        toUnits: 5,
      },
    },
    {
      name: 'added subject',
      action: {
        id: 'chemistry_5_90',
        kind: 'add_subject' as const,
        subjectId: 'chemistry',
        units: 5 as const,
        grade: 90,
      },
    },
  ])('changes the complete TAU evaluator input after a $name', ({ action }) => {
    const before = recomputePostActionProfile({
      pairId: 'tau_cs__tau',
      psychometric: 650,
      subjectRecord: tauRecord,
      actions: [],
    });
    const after = recomputePostActionProfile({
      pairId: 'tau_cs__tau',
      psychometric: 650,
      subjectRecord: tauRecord,
      actions: [action],
    });

    expect(before.status).toBe('ready');
    expect(after.status).toBe('ready');
    if (before.status !== 'ready' || after.status !== 'ready') return;
    expect(after.snapshot.institutionInputs.tauBagrutAverage).not.toBe(
      before.snapshot.institutionInputs.tauBagrutAverage,
    );
    expect(after.snapshot.inputDigest).not.toBe(before.snapshot.inputDigest);
    expect(after.snapshot.subjectRecord).not.toBe(tauRecord);
  });

  it('recalculates BGU subject gates from the changed exam record', () => {
    const input = {
      pairId: 'bgu_cs__bgu',
      psychometric: 610,
      quantitativeSubscore: 125,
      languageRequirementsConfirmed: true,
      subjectRecord: {
        ...tauRecord,
        subjects: tauRecord.subjects.map((subject) =>
          subject.subjectId === 'mathematics' ? { ...subject, grade: 89 } : subject,
        ),
      },
    } as const;
    const before = recomputePostActionProfile({ ...input, actions: [] });
    const result = recomputePostActionProfile({
      ...input,
      actions: [
        {
          id: 'math_89_90',
          kind: 'improve_grade',
          subjectId: 'mathematics',
          fromGrade: 89,
          toGrade: 90,
        },
      ],
    });

    expect(before).toMatchObject({
      status: 'ready',
      snapshot: {
        institutionInputs: {
          gates: {
            eligibleForScoreComparison: false,
            unmetRequirements: ['mathematics_90_at_4_or_80_at_5'],
          },
        },
      },
    });
    expect(result).toMatchObject({
      status: 'ready',
      snapshot: {
        pairId: 'bgu_cs__bgu',
        institutionInputs: {
          gates: { eligibleForScoreComparison: true, unmetRequirements: [] },
        },
      },
    });
    if (before.status === 'ready' && result.status === 'ready') {
      expect(result.snapshot.inputDigest).not.toBe(before.snapshot.inputDigest);
    }
  });

  it('rejects a stale second action instead of emitting a partial snapshot', () => {
    expect(
      recomputePostActionProfile({
        pairId: 'tau_cs__tau',
        psychometric: 650,
        subjectRecord: tauRecord,
        actions: [
          {
            id: 'math_79_85',
            kind: 'improve_grade',
            subjectId: 'mathematics',
            fromGrade: 79,
            toGrade: 85,
          },
          {
            id: 'stale_math_79_90',
            kind: 'improve_grade',
            subjectId: 'mathematics',
            fromGrade: 79,
            toGrade: 90,
          },
        ],
      }),
    ).toEqual({ status: 'invalid_action', actionId: 'stale_math_79_90' });
  });

  it('applies two valid academic actions before calculating one snapshot', () => {
    const result = recomputePostActionProfile({
      pairId: 'tau_cs__tau',
      psychometric: 650,
      subjectRecord: tauRecord,
      actions: [
        {
          id: 'math_79_90',
          kind: 'improve_grade',
          subjectId: 'mathematics',
          fromGrade: 79,
          toGrade: 90,
        },
        {
          id: 'math_4_5',
          kind: 'expand_units',
          subjectId: 'mathematics',
          fromUnits: 4,
          toUnits: 5,
        },
      ],
    });

    expect(result).toMatchObject({
      status: 'ready',
      snapshot: {
        subjectRecord: {
          subjects: expect.arrayContaining([
            expect.objectContaining({ subjectId: 'mathematics', units: 5, grade: 90 }),
          ]),
        },
      },
    });
  });
});
