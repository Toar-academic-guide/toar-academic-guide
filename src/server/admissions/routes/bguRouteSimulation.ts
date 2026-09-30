import 'server-only';

import type { BagrutSubjectRecord } from '@/types';

import { applyRouteActions } from './actions';
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
import { recomputePostActionProfile } from './postActionProfile';

const MAX_BGU_ROUTE_FINALISTS = 8;

export interface BguRouteSimulationProfile {
  psychometric: number;
  bguBagrutAverage: number;
  quantitativeSubscore: number;
  verbalSubscore: number;
  englishSubscore: number;
  languageRequirementsConfirmed: boolean;
  subjectRecord: BagrutSubjectRecord;
}

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

  if (
    args.candidates.length > 0 &&
    verified.length === 0 &&
    unavailableFinalistCount === args.candidates.length
  ) {
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

export async function runBguComputerScienceProfileRouteSimulation(args: {
  profile: BguRouteSimulationProfile;
  verifyFinalists?: (finalists: BguFinalist[]) => Promise<BguFinalistVerification[]>;
}): Promise<BguRouteSimulationResult> {
  const profile: RouteProfile = {
    psychometric: args.profile.psychometric,
    psychometricComponents: {
      quantitative: args.profile.quantitativeSubscore,
      verbal: args.profile.verbalSubscore,
      english: args.profile.englishSubscore,
    },
    subjectRecord: args.profile.subjectRecord,
  };
  const candidates = generateBguRouteCandidates(profile).flatMap<BguRouteFinalistCandidate>(
    (actions) => {
      const afterProfile = applyRouteActions(profile, actions);
      if (!afterProfile) return [];
      const recomputed = recomputePostActionProfile({
        pairId: 'bgu_cs__bgu',
        psychometric: args.profile.psychometric,
        quantitativeSubscore: args.profile.quantitativeSubscore,
        verbalSubscore: args.profile.verbalSubscore,
        englishSubscore: args.profile.englishSubscore,
        languageRequirementsConfirmed: args.profile.languageRequirementsConfirmed,
        subjectRecord: args.profile.subjectRecord,
        actions,
      });
      if (recomputed.status !== 'ready') return [];
      const inputs = recomputed.snapshot.institutionInputs;
      if (
        inputs.bguBagrutAverage === undefined ||
        inputs.quantitativeSubscore === undefined ||
        inputs.verbalSubscore === undefined ||
        inputs.englishSubscore === undefined
      ) {
        return [];
      }
      return [
        {
          id: actions.map((action) => action.id).join('+'),
          actions,
          afterProfile,
          finalist: {
            id: actions.map((action) => action.id).join('+'),
            psychometric: recomputed.snapshot.psychometric,
            bagrutAverage: inputs.bguBagrutAverage,
            quantitativeSubscore: inputs.quantitativeSubscore,
            verbalSubscore: inputs.verbalSubscore,
            englishSubscore: inputs.englishSubscore,
            languageRequirementsConfirmed: args.profile.languageRequirementsConfirmed,
            subjectRecord: recomputed.snapshot.subjectRecord,
          },
        },
      ];
    },
  );

  return runBguComputerScienceRouteSimulation({
    candidates,
    ...(args.verifyFinalists ? { verifyFinalists: args.verifyFinalists } : {}),
  });
}

function generateBguRouteCandidates(profile: RouteProfile): RouteAction[][] {
  const actions: RouteAction[] = [];
  const components = profile.psychometricComponents;
  if (profile.psychometric < 600) {
    actions.push({
      id: `psychometric_overall_${profile.psychometric}_600`,
      kind: 'psychometric',
      component: 'overall',
      from: profile.psychometric,
      to: 600,
    });
  }
  if (components?.quantitative !== undefined && components.quantitative < 150) {
    for (const to of [125, components.quantitative + 10, components.quantitative + 20, 150]) {
      if (to > components.quantitative && to <= 150) {
        actions.push({
          id: `psychometric_quantitative_${components.quantitative}_${to}`,
          kind: 'psychometric',
          component: 'quantitative',
          from: components.quantitative,
          to,
        });
      }
    }
  }

  const examSubjects = profile.subjectRecord.subjects.filter(
    (subject) => !('assessmentKind' in subject) || subject.assessmentKind === 'exam',
  );
  for (const subject of examSubjects) {
    const toGrade = Math.min(100, Math.ceil((subject.grade + 1) / 10) * 10);
    if (toGrade > subject.grade) {
      actions.push({
        id: `grade_${subject.subjectId}_${subject.grade}_${toGrade}`,
        kind: 'improve_grade',
        subjectId: subject.subjectId,
        fromGrade: subject.grade,
        toGrade,
      });
    }
    if (subject.units === 4) {
      actions.push({
        id: `units_${subject.subjectId}_4_5`,
        kind: 'expand_units',
        subjectId: subject.subjectId,
        fromUnits: 4,
        toUnits: 5,
      });
    }
  }
  const existingSubjectIds = new Set(examSubjects.map((subject) => subject.subjectId));
  const addedSubjectId = ['physics', 'chemistry', 'biology', 'computer_science'].find(
    (subjectId) => !existingSubjectIds.has(subjectId),
  );
  if (addedSubjectId) {
    actions.push({
      id: `add_${addedSubjectId}_5_90`,
      kind: 'add_subject',
      subjectId: addedSubjectId,
      units: 5,
      grade: 90,
    });
  }

  const unique = [...new Map(actions.map((action) => [action.id, action])).values()];
  const single = unique.map((action) => [action]);
  const gateRepair = unique.filter(
    (action) =>
      (action.kind === 'psychometric' &&
        (action.component === 'overall' || action.component === 'quantitative')) ||
      (action.kind === 'improve_grade' && action.subjectId === 'mathematics') ||
      (action.kind === 'expand_units' && action.subjectId === 'mathematics'),
  );
  const pairs: RouteAction[][] = [];
  for (let left = 0; left < gateRepair.length; left += 1) {
    for (let right = left + 1; right < gateRepair.length; right += 1) {
      const pair = [gateRepair[left]!, gateRepair[right]!];
      if (applyRouteActions(profile, pair)) pairs.push(pair);
    }
  }

  const compareCandidateSets = (left: RouteAction[], right: RouteAction[]) =>
    combineRouteEstimates(left).durationWeeks - combineRouteEstimates(right).durationWeeks ||
    combineRouteEstimates(left).effortPoints - combineRouteEstimates(right).effortPoints ||
    left
      .map((action) => action.id)
      .join('+')
      .localeCompare(right.map((action) => action.id).join('+'));
  const sortedSingles = single.sort(compareCandidateSets);
  const selected: RouteAction[][] = [];
  for (const kind of ['psychometric', 'improve_grade', 'expand_units', 'add_subject'] as const) {
    const candidate = sortedSingles.find((set) => set[0]?.kind === kind);
    if (candidate) selected.push(candidate);
  }
  const bestPair = pairs.sort(compareCandidateSets)[0];
  if (bestPair) selected.push(bestPair);
  for (const candidate of sortedSingles) {
    if (selected.length >= MAX_BGU_ROUTE_FINALISTS) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }
  return selected.slice(0, MAX_BGU_ROUTE_FINALISTS);
}
