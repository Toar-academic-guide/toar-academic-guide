import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  findVerifiedAdmissionRoutes,
  rankVerifiedAdmissionRoutes,
  type RouteAction,
  type RouteProfile,
  type VerifiedAdmissionRoute,
} from './optimizer';

const profile: RouteProfile = {
  psychometric: 650,
  subjectRecord: {
    schemaVersion: 1,
    sector: 'jewish',
    subjects: [
      { subjectId: 'mathematics', units: 5, grade: 85 },
      { subjectId: 'history', units: 2, grade: 85 },
    ],
  },
};

describe('findVerifiedAdmissionRoutes', () => {
  it('keeps fastest and lowest-effort winners distinct and verified', () => {
    const result = findVerifiedAdmissionRoutes({
      profile,
      actions: [psychometricAction(700), gradeAction('history', 95)],
      evaluate: (candidate) => ({
        eligible: candidate.psychometric >= 700 || grade(candidate, 'history') >= 95,
        margin: candidate.psychometric >= 700 ? 5 : 2,
      }),
    });

    expect(result.status).toBe('complete');
    expect(result.fastest?.id).toBe('psychometric_650_700');
    expect(result.lowestEffort?.id).toBe('grade_history_85_95');
    expect(result.fastest?.verification.eligible).toBe(true);
    expect(result.lowestEffort?.verification.eligible).toBe(true);
  });

  it('finds a necessary two-action route and sums its standard estimates', () => {
    const result = findVerifiedAdmissionRoutes({
      profile,
      actions: [psychometricAction(680), gradeAction('history', 90)],
      evaluate: (candidate) => ({
        eligible: candidate.psychometric >= 680 && grade(candidate, 'history') >= 90,
        margin: candidate.psychometric >= 680 && grade(candidate, 'history') >= 90 ? 1 : -1,
      }),
    });

    expect(result.status).toBe('complete');
    expect(result.fastest?.actions).toHaveLength(2);
    expect(result.fastest?.estimate).toMatchObject({ durationWeeks: 20, effortPoints: 8 });
  });

  it('lets a combined route win fastest while a successful single route wins effort', () => {
    const result = findVerifiedAdmissionRoutes({
      profile,
      actions: [
        addSubjectAction('physics'),
        gradeAction('history', 90),
        gradeAction('mathematics', 90),
      ],
      evaluate: (candidate) => ({
        eligible:
          grade(candidate, 'physics') === 90 ||
          (grade(candidate, 'history') === 90 && grade(candidate, 'mathematics') === 90),
        margin: 1,
      }),
    });

    expect(result.status).toBe('complete');
    expect(result.fastest?.id).toBe('grade_history_85_90+grade_mathematics_85_90');
    expect(result.lowestEffort?.id).toBe('add_physics_5_90');
  });

  it('rejects invalid academic transitions before they reach evaluation', () => {
    const invalidExpansion: RouteAction = {
      id: 'expand_math_5_5',
      kind: 'expand_units',
      subjectId: 'mathematics',
      fromUnits: 5,
      toUnits: 5,
    };
    const evaluate = vi.fn(() => ({ eligible: true, margin: 1 }));

    const result = findVerifiedAdmissionRoutes({ profile, actions: [invalidExpansion], evaluate });

    expect(result.status).toBe('no_route');
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('returns search_incomplete rather than claiming no route after a candidate cap', () => {
    const result = findVerifiedAdmissionRoutes({
      profile,
      actions: [psychometricAction(670), psychometricAction(680), gradeAction('history', 90)],
      evaluate: () => ({ eligible: false, margin: -1 }),
      limits: { maxCandidates: 2 },
    });

    expect(result.status).toBe('search_incomplete');
    expect(result.fastest).toBeUndefined();
  });

  it('counts invalid candidates toward the local search budget', () => {
    const invalidExpansion: RouteAction = {
      id: 'a-invalid-expansion',
      kind: 'expand_units',
      subjectId: 'mathematics',
      fromUnits: 5,
      toUnits: 5,
    };
    const evaluate = vi.fn(() => ({ eligible: true, margin: 1 }));

    const result = findVerifiedAdmissionRoutes({
      profile,
      actions: [invalidExpansion, psychometricAction(700)],
      evaluate,
      limits: { maxCandidates: 1 },
    });

    expect(result.status).toBe('search_incomplete');
    expect(result.evaluatedCandidateCount).toBe(0);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('returns search_incomplete when the local time budget expires', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(1_501);

    const result = findVerifiedAdmissionRoutes({
      profile,
      actions: [psychometricAction(700)],
      evaluate: () => ({ eligible: true, margin: 1 }),
      limits: { maxDurationMs: 1_500 },
    });

    expect(result.status).toBe('search_incomplete');
    expect(result.evaluatedCandidateCount).toBe(0);
    now.mockRestore();
  });

  it('does not silently truncate a Pareto frontier beyond the finalist budget', () => {
    const verified = [
      verifiedRoute('fast', 4, 5),
      verifiedRoute('balanced', 8, 3),
      verifiedRoute('easy', 12, 1),
    ];

    const result = rankVerifiedAdmissionRoutes({
      verified,
      evaluatedCandidateCount: verified.length,
      maxParetoFinalists: 2,
    });

    expect(result.status).toBe('search_incomplete');
    expect(result.fastest).toBeUndefined();
    expect(result.lowestEffort).toBeUndefined();
    expect(result.pareto).toEqual([]);
  });

  it('keeps at most one newly added subject in a combined route', () => {
    const evaluate = vi.fn(() => ({ eligible: true, margin: 1 }));
    const result = findVerifiedAdmissionRoutes({
      profile,
      actions: [addSubjectAction('physics'), addSubjectAction('chemistry')],
      evaluate,
    });

    expect(result.status).toBe('complete');
    expect(evaluate).toHaveBeenCalledTimes(2);
    expect(result.pareto.every((route) => route.actions.length === 1)).toBe(true);
  });

  it('uses stable action identifiers as the final tie-breaker', () => {
    const result = findVerifiedAdmissionRoutes({
      profile,
      actions: [gradeAction('history', 95), gradeAction('mathematics', 95)],
      evaluate: () => ({ eligible: true, margin: 1 }),
    });

    expect(result.fastest?.id).toBe('grade_history_85_95');
    expect(result.lowestEffort?.id).toBe('grade_history_85_95');
  });

  it('uses fewer actions and then larger eligibility margin before the lexical tie-break', () => {
    const oneAction = verifiedRoute('z-one', 8, 3);
    const twoActions = {
      ...verifiedRoute('a-two', 8, 3),
      actions: [psychometricAction(680), gradeAction('history', 90)],
      verification: { eligible: true, margin: 99 },
    };
    const largerMargin = {
      ...verifiedRoute('z-margin', 8, 3),
      verification: { eligible: true, margin: 2 },
    };
    const smallerMargin = verifiedRoute('a-margin', 8, 3);

    expect(
      rankVerifiedAdmissionRoutes({
        verified: [twoActions, oneAction],
        evaluatedCandidateCount: 2,
      }).fastest?.id,
    ).toBe('z-one');
    expect(
      rankVerifiedAdmissionRoutes({
        verified: [smallerMargin, largerMargin],
        evaluatedCandidateCount: 2,
      }).fastest?.id,
    ).toBe('z-margin');
  });

  it('withholds a tempting candidate when the evaluator gate still fails', () => {
    const result = findVerifiedAdmissionRoutes({
      profile,
      actions: [psychometricAction(700)],
      evaluate: (candidate) => ({
        eligible: candidate.psychometric >= 700 && grade(candidate, 'mathematics') >= 90,
        margin: candidate.psychometric - 695,
      }),
    });

    expect(result).toEqual({ status: 'no_route', pareto: [], evaluatedCandidateCount: 1 });
  });

  it('returns the same winners regardless of input action order', () => {
    const actions = [
      psychometricAction(700),
      gradeAction('history', 95),
      gradeAction('mathematics', 95),
    ];
    const evaluate = (candidate: RouteProfile) => ({
      eligible: candidate.psychometric >= 700 || grade(candidate, 'history') >= 95,
      margin: candidate.psychometric >= 700 ? 5 : 2,
    });

    const first = findVerifiedAdmissionRoutes({ profile, actions, evaluate });
    const second = findVerifiedAdmissionRoutes({
      profile,
      actions: [...actions].reverse(),
      evaluate,
    });

    expect(second).toEqual(first);
  });
});

function psychometricAction(to: number): RouteAction {
  return { id: `psychometric_650_${to}`, kind: 'psychometric', from: 650, to };
}

function gradeAction(subjectId: string, toGrade: number): RouteAction {
  return {
    id: `grade_${subjectId}_85_${toGrade}`,
    kind: 'improve_grade',
    subjectId,
    fromGrade: 85,
    toGrade,
  };
}

function addSubjectAction(subjectId: string): RouteAction {
  return {
    id: `add_${subjectId}_5_90`,
    kind: 'add_subject',
    subjectId,
    units: 5,
    grade: 90,
  };
}

function verifiedRoute(
  id: string,
  durationWeeks: number,
  effortPoints: number,
): VerifiedAdmissionRoute {
  return {
    id,
    actions: [psychometricAction(700)],
    afterProfile: { ...profile, psychometric: 700 },
    estimate: {
      durationWeeks,
      effortPoints,
      estimateVersion: 'test',
      owner: 'Toar admissions editorial',
      effectiveDate: '2026-07-20',
      eligibility: 'test',
      rationale: 'test',
    },
    verification: { eligible: true, margin: 1 },
  };
}

function grade(candidate: RouteProfile, subjectId: string): number {
  return (
    candidate.subjectRecord.subjects.find((subject) => subject.subjectId === subjectId)?.grade ?? 0
  );
}
