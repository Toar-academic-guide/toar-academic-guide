import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { findVerifiedAdmissionRoutes, type RouteAction, type RouteProfile } from './optimizer';

const profile: RouteProfile = {
  psychometric: 650,
  subjects: [
    { subjectId: 'mathematics', units: 5, grade: 85 },
    { subjectId: 'history', units: 2, grade: 85 },
  ],
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

  it('uses stable action identifiers as the final tie-breaker', () => {
    const result = findVerifiedAdmissionRoutes({
      profile,
      actions: [gradeAction('history', 95), gradeAction('mathematics', 95)],
      evaluate: () => ({ eligible: true, margin: 1 }),
    });

    expect(result.fastest?.id).toBe('grade_history_85_95');
    expect(result.lowestEffort?.id).toBe('grade_history_85_95');
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

function grade(candidate: RouteProfile, subjectId: string): number {
  return candidate.subjects.find((subject) => subject.subjectId === subjectId)?.grade ?? 0;
}
