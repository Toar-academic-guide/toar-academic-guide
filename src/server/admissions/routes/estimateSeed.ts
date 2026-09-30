import type { RouteAction } from './actions';
import {
  ROUTE_ESTIMATE_OWNER,
  ROUTE_ESTIMATE_SEED,
  ROUTE_ESTIMATE_VERSION,
  type RouteEstimateSeedEntry,
} from '@/data/admissions/routeEstimateSeed';

export { ROUTE_ESTIMATE_VERSION };

export interface RouteEstimate {
  durationWeeks: number;
  effortPoints: number;
  estimateVersion: string;
  owner: 'Toar admissions editorial';
  effectiveDate: string;
  eligibility: string;
  rationale: string;
}

export function estimateRouteAction(action: RouteAction): RouteEstimate {
  const entry = resolveEstimateSeedEntry(action);
  const base = {
    estimateVersion: ROUTE_ESTIMATE_VERSION,
    owner: ROUTE_ESTIMATE_OWNER as 'Toar admissions editorial',
    effectiveDate: ROUTE_ESTIMATE_SEED.effectiveDate,
    durationWeeks: entry.durationWeeks,
    effortPoints: entry.effortPoints,
    eligibility: entry.eligibility,
    rationale: entry.rationale,
  };
  return base;
}

export function combineRouteEstimates(actions: RouteAction[]): RouteEstimate {
  const estimates = actions.map(estimateRouteAction);
  return {
    durationWeeks: estimates.reduce((total, estimate) => total + estimate.durationWeeks, 0),
    effortPoints: estimates.reduce((total, estimate) => total + estimate.effortPoints, 0),
    estimateVersion: ROUTE_ESTIMATE_VERSION,
    owner: ROUTE_ESTIMATE_OWNER,
    effectiveDate: ROUTE_ESTIMATE_SEED.effectiveDate,
    eligibility: estimates.map((estimate) => estimate.eligibility).join(' '),
    rationale: estimates.map((estimate) => estimate.rationale).join(' '),
  };
}

function resolveEstimateSeedEntry(action: RouteAction): RouteEstimateSeedEntry {
  const change =
    action.kind === 'psychometric'
      ? action.to - action.from
      : action.kind === 'improve_grade'
        ? action.toGrade - action.fromGrade
        : action.kind === 'expand_units'
          ? action.toUnits - action.fromUnits
          : undefined;
  const entry = ROUTE_ESTIMATE_SEED.entries.find(
    (candidate) =>
      candidate.actionKind === action.kind &&
      (change === undefined ||
        ((candidate.minChange ?? Number.NEGATIVE_INFINITY) <= change &&
          change <= (candidate.maxChange ?? Number.POSITIVE_INFINITY))),
  );
  if (!entry) {
    throw new Error(`ROUTE_ESTIMATE_MISSING:${action.kind}`);
  }
  return entry;
}
