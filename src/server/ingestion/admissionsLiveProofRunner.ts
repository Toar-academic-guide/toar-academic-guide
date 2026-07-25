import {
  evaluateAdmissionsSourceProof,
  type AdmissionsApplicantInput,
  type AdmissionsSourceProof,
  type AdmissionsSourceProofEvaluation,
} from './admissionsSourceAdapters';
import {
  admissionsSourceTargets,
  buildCapabilityMatrixProof,
  selectAdmissionsSourceTargets,
  type AdmissionsSourceTarget,
} from './admissionsSourceRegistry';
import { runHaifaAdmissionsProof } from './adapters/haifaAdmissions';
import { runTauAdmissionsProof } from './adapters/tauAdmissions';
import { runHujiAdmissionsProof } from './adapters/hujiAdmissions';
import { runBguAdmissionsProof } from './adapters/bguAdmissions';

export interface AdmissionsLiveProofOptions {
  applicant?: AdmissionsApplicantInput;
  fetcher?: typeof fetch;
  includeCapabilityMatrix?: boolean;
  targetIds?: string[];
}

export interface AdmissionsLiveProofReport {
  summary: {
    total: number;
    exactReproduced: number;
    partial: number;
    blocked: number;
    failed: number;
  };
  results: AdmissionsSourceProofEvaluation[];
}

const DEFAULT_APPLICANT: AdmissionsApplicantInput = {
  bagrutAverage: 105,
  psychometric: 680,
};

export async function runAdmissionsLiveProof(
  options: AdmissionsLiveProofOptions = {},
): Promise<AdmissionsLiveProofReport> {
  const targets = options.includeCapabilityMatrix
    ? filterTargets(admissionsSourceTargets, options.targetIds)
    : selectAdmissionsSourceTargets(options.targetIds);
  const results: AdmissionsSourceProofEvaluation[] = [];

  for (const target of targets) {
    const proof = await runTarget(target, options);
    results.push(evaluateAdmissionsSourceProof(proof));
  }

  return {
    summary: {
      total: results.length,
      exactReproduced: results.filter(
        (result) =>
          result.proof.proofLevel === 'exact_official' && result.proof.status === 'succeeded',
      ).length,
      partial: results.filter((result) => result.proof.status === 'partial').length,
      blocked: results.filter((result) => result.proof.status === 'blocked').length,
      failed: results.filter((result) => result.proof.status === 'failed').length,
    },
    results,
  };
}

async function runTarget(
  target: AdmissionsSourceTarget,
  options: AdmissionsLiveProofOptions,
): Promise<AdmissionsSourceProof> {
  if (target.adapterId === 'haifa') {
    return runHaifaAdmissionsProof({
      applicant: options.applicant ?? target.defaultApplicant ?? DEFAULT_APPLICANT,
      fetcher: options.fetcher,
      program: target.defaultProgram,
    });
  }

  if (target.adapterId === 'tau') {
    return runTauAdmissionsProof({
      applicant: options.applicant ?? target.defaultApplicant ?? DEFAULT_APPLICANT,
      fetcher: options.fetcher,
      program: target.defaultProgram,
    });
  }

  if (target.adapterId === 'huji') {
    return runHujiAdmissionsProof({
      applicant: options.applicant ?? target.defaultApplicant ?? DEFAULT_APPLICANT,
      fetcher: options.fetcher,
      program: target.defaultProgram,
    });
  }

  if (target.adapterId === 'bgu' && target.category === 'exact') {
    return runBguAdmissionsProof({
      applicant: options.applicant ?? target.defaultApplicant ?? DEFAULT_APPLICANT,
      fetcher: options.fetcher,
      program: target.defaultProgram,
    });
  }

  return buildCapabilityMatrixProof(target);
}

function filterTargets(targets: AdmissionsSourceTarget[], targetIds?: string[]) {
  if (!targetIds || targetIds.length === 0) {
    return targets;
  }

  const requested = new Set(targetIds);
  return targets.filter((target) => requested.has(target.id));
}
