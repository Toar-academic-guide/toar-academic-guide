import 'server-only';

import type { BagrutSubjectRecord } from '@/types';
import { evaluateTauEngineeringExactSciencesBonus } from '@/server/admissions/bagrutPolicies';

import { applyRouteAction, type RouteAction, type RouteProfile } from './actions';
import { combineRouteEstimates } from './estimateSeed';
import {
  rankVerifiedAdmissionRoutes,
  type RouteSearchResult,
  type VerifiedAdmissionRoute,
} from './optimizer';
import { recomputePostActionProfile } from './postActionProfile';
import {
  verifyTauComputerScienceFinalists,
  type TauFinalist,
  type TauFinalistVerification,
} from './tauFinalistVerifier';

const MAX_TAU_ROUTE_FINALISTS = 7;

export interface TauRouteSimulationProfile {
  psychometric: number;
  tauBagrutAverage: number;
  subjectRecord: BagrutSubjectRecord;
}

export type TauRouteSimulationResult = Omit<RouteSearchResult, 'status'> & {
  status: RouteSearchResult['status'] | 'authority_unavailable';
  unavailableFinalistCount: number;
};

export async function runTauComputerScienceRouteSimulation(args: {
  profile: TauRouteSimulationProfile;
  verifyFinalists?: (finalists: TauFinalist[]) => Promise<TauFinalistVerification[]>;
}): Promise<TauRouteSimulationResult> {
  const profile: RouteProfile = {
    psychometric: args.profile.psychometric,
    subjectRecord: args.profile.subjectRecord,
  };
  const candidates = generateTauRouteCandidates(profile);
  const verifyFinalists =
    args.verifyFinalists ??
    ((finalists: TauFinalist[]) => verifyTauComputerScienceFinalists({ finalists }));
  const finalists = candidates.flatMap<TauFinalist>(({ id, actions, afterProfile }) => {
    const recomputed = recomputePostActionProfile({
      pairId: 'tau_cs__tau',
      psychometric: args.profile.psychometric,
      subjectRecord: args.profile.subjectRecord,
      actions,
    });
    if (recomputed.status === 'ready') {
      const { tauBagrutAverage, hasQualifiedMathAndPhysics } =
        recomputed.snapshot.institutionInputs;
      if (tauBagrutAverage !== undefined && hasQualifiedMathAndPhysics !== undefined) {
        return [
          {
            id,
            psychometric: recomputed.snapshot.psychometric,
            bagrutAverage: tauBagrutAverage,
            hasQualifiedMathAndPhysics,
          },
        ];
      }
    }

    if (actions.some((action) => action.kind !== 'psychometric')) return [];
    return [
      {
        id,
        psychometric: afterProfile.psychometric,
        bagrutAverage: args.profile.tauBagrutAverage,
        hasQualifiedMathAndPhysics: evaluateTauEngineeringExactSciencesBonus(
          afterProfile.subjectRecord,
        ).qualifies,
      },
    ];
  });
  const verifications = await verifyFinalists(finalists);
  const verificationById = new Map(
    verifications.map((verification) => [verification.id, verification]),
  );
  const unavailableFinalistCount = verifications.filter(
    (verification) => verification.status === 'unavailable',
  ).length;
  const verified = candidates.flatMap<VerifiedAdmissionRoute>((candidate) => {
    const verification = verificationById.get(candidate.id);
    if (
      !verification ||
      verification.status !== 'verified' ||
      !verification.eligible ||
      verification.score === undefined ||
      verification.cutoff === undefined
    ) {
      return [];
    }

    return [
      {
        ...candidate,
        estimate: combineRouteEstimates(candidate.actions),
        verification: {
          eligible: true,
          margin: verification.score - verification.cutoff,
          score: verification.score,
          cutoff: verification.cutoff,
          sourceUrl: verification.sourceUrl,
        },
      },
    ];
  });

  if (verified.length === 0 && unavailableFinalistCount === candidates.length) {
    return {
      status: 'authority_unavailable',
      pareto: [],
      evaluatedCandidateCount: candidates.length,
      unavailableFinalistCount,
    };
  }

  return {
    ...rankVerifiedAdmissionRoutes({
      verified,
      evaluatedCandidateCount: candidates.length,
    }),
    unavailableFinalistCount,
  };
}

function generateTauRouteCandidates(profile: RouteProfile): Array<{
  id: string;
  actions: RouteAction[];
  afterProfile: RouteProfile;
}> {
  const candidates: Array<{ id: string; actions: RouteAction[]; afterProfile: RouteProfile }> = [];

  for (const increment of [10, 20, 30, 40, 50, 60, 70]) {
    const to = profile.psychometric + increment;
    if (to > 800) {
      continue;
    }
    const action: RouteAction = {
      id: `psychometric_${profile.psychometric}_${to}`,
      kind: 'psychometric',
      from: profile.psychometric,
      to,
    };
    const afterProfile = applyRouteAction(profile, action);
    if (afterProfile) {
      candidates.push({ id: action.id, actions: [action], afterProfile });
    }
  }

  return candidates.slice(0, MAX_TAU_ROUTE_FINALISTS);
}
