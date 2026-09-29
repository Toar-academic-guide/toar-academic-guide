import 'server-only';

import { combineRouteEstimates } from './estimateSeed';
import {
  rankVerifiedAdmissionRoutes,
  type RouteAction,
  type RouteProfile,
  type RouteSearchResult,
  type VerifiedAdmissionRoute,
} from './optimizer';
import {
  verifyBguComputerScienceFinalists,
  type BguFinalist,
  type BguFinalistVerification,
} from './bguFinalistVerifier';

export interface BguRouteFinalistCandidate {
  id: string;
  actions: RouteAction[];
  afterProfile: RouteProfile;
  finalist: BguFinalist;
}

export type BguRouteSimulationResult = Omit<RouteSearchResult, 'status'> & {
  status: RouteSearchResult['status'] | 'authority_unavailable';
  unavailableFinalistCount: number;
};

export async function runBguComputerScienceRouteSimulation(args: {
  candidates: BguRouteFinalistCandidate[];
  verifyFinalists?: (finalists: BguFinalist[]) => Promise<BguFinalistVerification[]>;
}): Promise<BguRouteSimulationResult> {
  const verifyFinalists =
    args.verifyFinalists ??
    ((finalists: BguFinalist[]) => verifyBguComputerScienceFinalists({ finalists }));
  const verifications = await verifyFinalists(
    args.candidates.map((candidate) => candidate.finalist),
  );
  const verificationById = new Map(
    verifications.map((verification) => [verification.id, verification]),
  );
  const unavailableFinalistCount = verifications.filter(
    (verification) => verification.status === 'unavailable',
  ).length;
  const verified = args.candidates.flatMap<VerifiedAdmissionRoute>((candidate) => {
    const verification = verificationById.get(candidate.id);
    if (
      !verification ||
      verification.status !== 'verified' ||
      !verification.eligible ||
      verification.score === undefined ||
      verification.cutoff === undefined ||
      !verification.ruleFingerprint
    ) {
      return [];
    }
    return [
      {
        id: candidate.id,
        actions: candidate.actions,
        afterProfile: candidate.afterProfile,
        estimate: combineRouteEstimates(candidate.actions),
        verification: {
          eligible: true,
          margin: verification.score - verification.cutoff,
          score: verification.score,
          cutoff: verification.cutoff,
          sourceUrl: verification.sourceUrl,
          ruleFingerprint: verification.ruleFingerprint,
          unmetRequirements: verification.unmetRequirements ?? [],
        },
      },
    ];
  });

  if (verified.length === 0 && unavailableFinalistCount === args.candidates.length) {
    return {
      status: 'authority_unavailable',
      pareto: [],
      evaluatedCandidateCount: args.candidates.length,
      unavailableFinalistCount,
    };
  }

  return {
    ...rankVerifiedAdmissionRoutes({
      verified,
      evaluatedCandidateCount: args.candidates.length,
    }),
    unavailableFinalistCount,
  };
}
