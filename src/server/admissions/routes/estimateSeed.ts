import type { RouteAction } from './actions';

export const ROUTE_ESTIMATE_VERSION = 'standard-estimates-2026-07-20-v1';

export interface RouteEstimate {
  durationWeeks: number;
  effortPoints: number;
  estimateVersion: string;
  owner: 'Toar admissions editorial';
  rationale: string;
}

export function estimateRouteAction(action: RouteAction): RouteEstimate {
  const base = {
    estimateVersion: ROUTE_ESTIMATE_VERSION,
    owner: 'Toar admissions editorial' as const,
  };

  switch (action.kind) {
    case 'psychometric':
      return {
        ...base,
        durationWeeks: action.to - action.from <= 30 ? 8 : 10,
        effortPoints: 5,
        rationale: 'Standard preparation and one additional psychometric sitting.',
      };
    case 'improve_grade':
      return {
        ...base,
        durationWeeks: action.toGrade - action.fromGrade <= 10 ? 12 : 16,
        effortPoints: action.toGrade - action.fromGrade <= 10 ? 3 : 4,
        rationale: 'Standard independent Bagrut grade-improvement preparation.',
      };
    case 'expand_units':
      return {
        ...base,
        durationWeeks: 16,
        effortPoints: 4,
        rationale: 'Standard preparation for an eligible higher-unit Bagrut subject.',
      };
    case 'add_subject':
      return {
        ...base,
        durationWeeks: 28,
        effortPoints: 5,
        rationale: 'Standard preparation for one newly added five-unit Bagrut subject.',
      };
  }
}

export function combineRouteEstimates(actions: RouteAction[]): RouteEstimate {
  const estimates = actions.map(estimateRouteAction);
  return {
    durationWeeks: estimates.reduce((total, estimate) => total + estimate.durationWeeks, 0),
    effortPoints: estimates.reduce((total, estimate) => total + estimate.effortPoints, 0),
    estimateVersion: ROUTE_ESTIMATE_VERSION,
    owner: 'Toar admissions editorial',
    rationale: estimates.map((estimate) => estimate.rationale).join(' '),
  };
}
