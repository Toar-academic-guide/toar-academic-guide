import 'server-only';

import { applyRouteAction, type RouteAction, type RouteProfile } from './actions';
import { combineRouteEstimates, type RouteEstimate } from './estimateSeed';

export type { RouteAction, RouteProfile } from './actions';

export interface RouteVerification {
  eligible: boolean;
  margin: number;
}

export interface VerifiedAdmissionRoute {
  id: string;
  actions: RouteAction[];
  afterProfile: RouteProfile;
  estimate: RouteEstimate;
  verification: RouteVerification;
}

export interface RouteSearchResult {
  status: 'complete' | 'no_route' | 'search_incomplete';
  fastest?: VerifiedAdmissionRoute;
  lowestEffort?: VerifiedAdmissionRoute;
  pareto: VerifiedAdmissionRoute[];
  evaluatedCandidateCount: number;
}

export function findVerifiedAdmissionRoutes(args: {
  profile: RouteProfile;
  actions: RouteAction[];
  evaluate: (candidate: RouteProfile) => RouteVerification;
  limits?: { maxCandidates?: number; maxDurationMs?: number; maxParetoFinalists?: number };
}): RouteSearchResult {
  const maxCandidates = args.limits?.maxCandidates ?? 2000;
  const maxDurationMs = args.limits?.maxDurationMs ?? 1500;
  const maxParetoFinalists = args.limits?.maxParetoFinalists ?? 12;
  const startedAt = Date.now();
  const candidates = candidateActionSets(args.actions);
  const verified: VerifiedAdmissionRoute[] = [];
  let evaluatedCandidateCount = 0;

  for (const actions of candidates) {
    if (evaluatedCandidateCount >= maxCandidates || Date.now() - startedAt > maxDurationMs) {
      return {
        status: 'search_incomplete',
        pareto: [],
        evaluatedCandidateCount,
      };
    }

    const afterProfile = applyRouteActions(args.profile, actions);
    if (!afterProfile) {
      continue;
    }

    evaluatedCandidateCount += 1;
    const verification = args.evaluate(afterProfile);
    if (!verification.eligible) {
      continue;
    }

    verified.push({
      id: actions.map((action) => action.id).join('+'),
      actions,
      afterProfile,
      estimate: combineRouteEstimates(actions),
      verification,
    });
  }

  if (verified.length === 0) {
    return { status: 'no_route', pareto: [], evaluatedCandidateCount };
  }

  return rankVerifiedAdmissionRoutes({ verified, evaluatedCandidateCount, maxParetoFinalists });
}

export function rankVerifiedAdmissionRoutes(args: {
  verified: VerifiedAdmissionRoute[];
  evaluatedCandidateCount: number;
  maxParetoFinalists?: number;
}): RouteSearchResult {
  const { verified, evaluatedCandidateCount, maxParetoFinalists = 12 } = args;

  if (verified.length === 0) {
    return { status: 'no_route', pareto: [], evaluatedCandidateCount };
  }

  const pareto = verified
    .filter((candidate) => !verified.some((other) => dominates(other, candidate)))
    .sort(compareFastest)
    .slice(0, maxParetoFinalists);

  return {
    status: 'complete',
    fastest: [...pareto].sort(compareFastest)[0],
    lowestEffort: [...pareto].sort(compareLowestEffort)[0],
    pareto,
    evaluatedCandidateCount,
  };
}

function candidateActionSets(actions: RouteAction[]): RouteAction[][] {
  const sorted = [...actions].sort((left, right) => left.id.localeCompare(right.id));
  const candidates = sorted.map((action) => [action]);

  for (let first = 0; first < sorted.length; first += 1) {
    for (let second = first + 1; second < sorted.length; second += 1) {
      candidates.push([sorted[first]!, sorted[second]!]);
    }
  }

  return candidates;
}

function applyRouteActions(profile: RouteProfile, actions: RouteAction[]): RouteProfile | null {
  return actions.reduce<RouteProfile | null>(
    (current, action) => (current ? applyRouteAction(current, action) : null),
    profile,
  );
}

function dominates(left: VerifiedAdmissionRoute, right: VerifiedAdmissionRoute): boolean {
  const noWorse =
    left.estimate.durationWeeks <= right.estimate.durationWeeks &&
    left.estimate.effortPoints <= right.estimate.effortPoints;
  const strictlyBetter =
    left.estimate.durationWeeks < right.estimate.durationWeeks ||
    left.estimate.effortPoints < right.estimate.effortPoints;
  return noWorse && strictlyBetter;
}

function compareFastest(left: VerifiedAdmissionRoute, right: VerifiedAdmissionRoute): number {
  return (
    left.estimate.durationWeeks - right.estimate.durationWeeks ||
    left.estimate.effortPoints - right.estimate.effortPoints ||
    left.actions.length - right.actions.length ||
    right.verification.margin - left.verification.margin ||
    left.id.localeCompare(right.id)
  );
}

function compareLowestEffort(left: VerifiedAdmissionRoute, right: VerifiedAdmissionRoute): number {
  return (
    left.estimate.effortPoints - right.estimate.effortPoints ||
    left.estimate.durationWeeks - right.estimate.durationWeeks ||
    left.actions.length - right.actions.length ||
    right.verification.margin - left.verification.margin ||
    left.id.localeCompare(right.id)
  );
}
