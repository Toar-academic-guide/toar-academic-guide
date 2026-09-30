import { describe, expect, it } from 'vitest';

import { ROUTE_ESTIMATE_SEED } from '@/data/admissions/routeEstimateSeed';

import { combineRouteEstimates, estimateRouteAction } from './estimateSeed';

describe('route estimate seed', () => {
  it('publishes the reviewed version, ownership, effective date, and effort scale', () => {
    expect(ROUTE_ESTIMATE_SEED).toMatchObject({
      version: 'standard-estimates-2026-07-20-v1',
      effectiveDate: '2026-07-20',
      owner: 'Toar admissions editorial',
      effortScale: { minimum: 1, maximum: 5 },
    });
    expect(ROUTE_ESTIMATE_SEED.entries).toHaveLength(6);
    expect(
      ROUTE_ESTIMATE_SEED.entries.every(
        (entry) => entry.eligibility.length > 0 && entry.rationale.length > 0,
      ),
    ).toBe(true);
  });

  it('covers every supported action and change-magnitude band', () => {
    expect(
      estimateRouteAction({ id: 'p30', kind: 'psychometric', from: 650, to: 680 }),
    ).toMatchObject({ durationWeeks: 8, effortPoints: 5 });
    expect(
      estimateRouteAction({ id: 'p31', kind: 'psychometric', from: 650, to: 681 }),
    ).toMatchObject({ durationWeeks: 10, effortPoints: 5 });
    expect(
      estimateRouteAction({
        id: 'g10',
        kind: 'improve_grade',
        subjectId: 'history',
        fromGrade: 80,
        toGrade: 90,
      }),
    ).toMatchObject({ durationWeeks: 12, effortPoints: 3 });
    expect(
      estimateRouteAction({
        id: 'g11',
        kind: 'improve_grade',
        subjectId: 'history',
        fromGrade: 80,
        toGrade: 91,
      }),
    ).toMatchObject({ durationWeeks: 16, effortPoints: 4 });
    expect(
      estimateRouteAction({
        id: 'units',
        kind: 'expand_units',
        subjectId: 'mathematics',
        fromUnits: 4,
        toUnits: 5,
      }),
    ).toMatchObject({ durationWeeks: 16, effortPoints: 4 });
    expect(
      estimateRouteAction({
        id: 'subject',
        kind: 'add_subject',
        subjectId: 'physics',
        units: 5,
        grade: 90,
      }),
    ).toMatchObject({ durationWeeks: 28, effortPoints: 5 });
  });

  it('sums the standard estimates for a combined route', () => {
    const estimate = combineRouteEstimates([
      { id: 'p', kind: 'psychometric', from: 650, to: 680 },
      {
        id: 'g',
        kind: 'improve_grade',
        subjectId: 'history',
        fromGrade: 85,
        toGrade: 90,
      },
    ]);

    expect(estimate).toMatchObject({
      durationWeeks: 20,
      effortPoints: 8,
      estimateVersion: ROUTE_ESTIMATE_SEED.version,
      owner: ROUTE_ESTIMATE_SEED.owner,
    });
  });
});
