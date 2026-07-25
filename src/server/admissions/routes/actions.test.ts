import { describe, expect, it } from 'vitest';

import { applyRouteAction, type RouteProfile } from './actions';

const profile: RouteProfile = {
  psychometric: 650,
  subjects: [{ subjectId: 'history', units: 2, grade: 85 }],
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

    expect(expanded?.subjects[0]).toMatchObject({ subjectId: 'history', units: 5, grade: 85 });
    expect(withAddedSubject?.subjects).toContainEqual({
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
});
