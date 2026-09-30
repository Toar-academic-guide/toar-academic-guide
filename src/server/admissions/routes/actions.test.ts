import { describe, expect, it } from 'vitest';

import { applyRouteAction, applyRouteActions, type RouteProfile } from './actions';

const profile: RouteProfile = {
  psychometric: 650,
  subjectRecord: {
    schemaVersion: 1,
    sector: 'jewish',
    subjects: [{ subjectId: 'history', units: 2, grade: 85 }],
  },
};

describe('applyRouteAction', () => {
  it('supports the two Bagrut transitions the route contract permits', () => {
    const expanded = applyRouteAction(profile, {
      id: 'history_2_5',
      kind: 'expand_units',
      subjectId: 'history',
      fromUnits: 2,
      toUnits: 5,
    });
    const withAddedSubject = applyRouteAction(profile, {
      id: 'physics_5_85',
      kind: 'add_subject',
      subjectId: 'physics',
      units: 5,
      grade: 85,
    });

    expect(expanded?.subjectRecord.subjects[0]).toMatchObject({
      subjectId: 'history',
      units: 5,
      grade: 85,
    });
    expect(withAddedSubject?.subjectRecord.subjects).toContainEqual({
      subjectId: 'physics',
      units: 5,
      grade: 85,
    });
  });

  it('refuses duplicate subjects and non-improving grade transitions', () => {
    expect(
      applyRouteAction(profile, {
        id: 'duplicate_history',
        kind: 'add_subject',
        subjectId: 'history',
        units: 5,
        grade: 90,
      }),
    ).toBeNull();
    expect(
      applyRouteAction(profile, {
        id: 'history_85_85',
        kind: 'improve_grade',
        subjectId: 'history',
        fromGrade: 85,
        toGrade: 85,
      }),
    ).toBeNull();
  });

  it('preserves schema-v2 certificate facts and changes only the matching exam row', () => {
    const versionedProfile: RouteProfile = {
      psychometric: 650,
      subjectRecord: {
        schemaVersion: 2,
        sector: 'jewish',
        certificateType: 'external_1977_or_later',
        complete: true,
        profileHash: 'immutable-original',
        subjects: [
          { subjectId: 'physics', units: 5, grade: 80, assessmentKind: 'exam' },
          { subjectId: 'physics', units: 5, grade: 95, assessmentKind: 'final_project' },
        ],
      },
    };

    const result = applyRouteAction(versionedProfile, {
      id: 'physics_80_90',
      kind: 'improve_grade',
      subjectId: 'physics',
      fromGrade: 80,
      toGrade: 90,
    });

    expect(result?.subjectRecord).toEqual({
      schemaVersion: 2,
      sector: 'jewish',
      certificateType: 'external_1977_or_later',
      complete: true,
      subjects: [
        { subjectId: 'physics', units: 5, grade: 90, assessmentKind: 'exam' },
        { subjectId: 'physics', units: 5, grade: 95, assessmentKind: 'final_project' },
      ],
    });
    expect(result?.subjectRecord.profileHash).toBeUndefined();
    expect(versionedProfile.subjectRecord.subjects[0]?.grade).toBe(80);
  });

  it('recomputes sequential transitions against the output of the previous action', () => {
    const result = applyRouteActions(profile, [
      {
        id: 'history_85_90',
        kind: 'improve_grade',
        subjectId: 'history',
        fromGrade: 85,
        toGrade: 90,
      },
      {
        id: 'history_2_5',
        kind: 'expand_units',
        subjectId: 'history',
        fromUnits: 2,
        toUnits: 5,
      },
    ]);

    expect(result?.subjectRecord.subjects[0]).toMatchObject({ units: 5, grade: 90 });
    expect(
      applyRouteActions(profile, [
        {
          id: 'history_85_90',
          kind: 'improve_grade',
          subjectId: 'history',
          fromGrade: 85,
          toGrade: 90,
        },
        {
          id: 'stale_history_85_95',
          kind: 'improve_grade',
          subjectId: 'history',
          fromGrade: 85,
          toGrade: 95,
        },
      ]),
    ).toBeNull();
  });
});
