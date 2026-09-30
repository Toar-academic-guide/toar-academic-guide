import 'server-only';

import { createHmac } from 'node:crypto';
import {
  TAU_COMPUTER_SCIENCE_ACCEPTANCE_CUTOFF,
  TAU_COMPUTER_SCIENCE_NODE_ID,
  TAU_COMPUTER_SCIENCE_PROGRAM_IDS,
  TAU_COMPUTER_SCIENCE_PROGRAM_VERIFICATION_ARTIFACTS,
  TAU_COMPUTER_SCIENCE_REQUIREMENTS_URL,
  TAU_COMPUTER_SCIENCE_SCORE_FIELD,
  TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
} from '@/data/admissions/tauComputerScienceVerification';
import { evaluateProgramVerification } from '@/server/admissions/verification/programVerification';
import { runTauAdmissionsProof } from '@/server/ingestion/adapters/tauAdmissions';

const MAX_TAU_FINALISTS = 8;
const DEFAULT_TIMEOUT_MS = 5000;

export interface TauFinalist {
  id: string;
  psychometric: number;
  bagrutAverage: number;
  hasQualifiedMathAndPhysics: boolean;
  requiredInputs?: string[];
  unmetRequirements?: string[];
}

export interface TauFinalistVerification {
  id: string;
  status: 'verified' | 'unavailable';
  eligible?: boolean;
  score?: number;
  cutoff?: number;
  scoreField?: 'hatama_meduyakim';
  ruleFingerprint?: string;
  sourceUrl: string;
  reason?:
    | 'official_score_unavailable'
    | 'official_cutoff_unavailable'
    | 'official_source_drift'
    | 'fixture_mismatch'
    | 'missing_required_input'
    | 'finalist_limit_exceeded'
    | 'circuit_open';
}

export interface TauFinalistCache {
  get(key: string): TauFinalistVerification | undefined;
  set(key: string, value: TauFinalistVerification): void;
}

export interface TauFinalistCircuit {
  isOpen(): boolean;
  recordSuccess(): void;
  recordFailure(): void;
}

export function createTauFinalistCircuit(failureThreshold = 3): TauFinalistCircuit {
  let consecutiveFailures = 0;

  return {
    isOpen: () => consecutiveFailures >= failureThreshold,
    recordSuccess: () => {
      consecutiveFailures = 0;
    },
    recordFailure: () => {
      consecutiveFailures += 1;
    },
  };
}

export async function verifyTauComputerScienceFinalists(args: {
  finalists: TauFinalist[];
  fetcher?: typeof fetch;
  cache?: TauFinalistCache;
  cacheSecret?: string;
  circuit?: TauFinalistCircuit;
  timeoutMs?: number;
  verificationArtifactCurrent?: () => boolean;
}): Promise<TauFinalistVerification[]> {
  if (args.finalists.length > MAX_TAU_FINALISTS) {
    return args.finalists.map((finalist) => unavailable(finalist.id, 'finalist_limit_exceeded'));
  }
  if (!(args.verificationArtifactCurrent ?? tauVerificationArtifactIsCurrent)()) {
    return args.finalists.map((finalist) => unavailable(finalist.id, 'fixture_mismatch'));
  }

  const fetcher = args.fetcher ?? fetch;
  const cache = args.cache;
  const cacheSecret = args.cacheSecret;
  const circuit = args.circuit;
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const results: TauFinalistVerification[] = [];

  for (const finalist of args.finalists) {
    if (circuit?.isOpen()) {
      results.push(unavailable(finalist.id, 'circuit_open'));
      continue;
    }

    const cacheKey = cache && cacheSecret ? cacheKeyFor(finalist, cacheSecret) : undefined;
    const cached = cacheKey ? cache?.get(cacheKey) : undefined;
    if (cached) {
      results.push({ ...cached, id: finalist.id });
      continue;
    }

    const verification = await verifyFinalist({ finalist, fetcher, timeoutMs });
    if (verification.status === 'verified') {
      circuit?.recordSuccess();
    } else {
      circuit?.recordFailure();
    }
    if (cacheKey && verification.status === 'verified') {
      cache?.set(cacheKey, { ...verification, id: '' });
    }
    results.push(verification);
  }

  return results;
}

async function verifyFinalist(args: {
  finalist: TauFinalist;
  fetcher: typeof fetch;
  timeoutMs: number;
}): Promise<TauFinalistVerification> {
  if ((args.finalist.requiredInputs?.length ?? 0) > 0) {
    return unavailable(args.finalist.id, 'missing_required_input');
  }
  if ((args.finalist.unmetRequirements?.length ?? 0) > 0) {
    return {
      id: args.finalist.id,
      status: 'verified',
      eligible: false,
      cutoff: TAU_COMPUTER_SCIENCE_ACCEPTANCE_CUTOFF,
      ruleFingerprint: TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
      sourceUrl: TAU_COMPUTER_SCIENCE_REQUIREMENTS_URL,
    };
  }
  try {
    const proof = await runTauAdmissionsProof({
      fetcher: boundedFetcher(args.fetcher, args.timeoutMs),
      program: {
        targetId: 'tau-cs-legacy-live',
        pairId: 'tau_cs__tau',
        id: 'tau_cs',
        name: 'Computer Science',
        nodeId: TAU_COMPUTER_SCIENCE_NODE_ID,
        externalId: TAU_COMPUTER_SCIENCE_PROGRAM_IDS[0],
        scoreField: TAU_COMPUTER_SCIENCE_SCORE_FIELD,
      },
      applicant: {
        psychometric: args.finalist.psychometric,
        bagrutAverage: args.finalist.bagrutAverage,
        exactSciencesBonusEligible: args.finalist.hasQualifiedMathAndPhysics,
        extraInputs: { tauBagrutAverage: args.finalist.bagrutAverage },
      },
    });
    const score = numericValue(proof.normalizedPayload.selectedScore);
    const cutoff = numericValue(proof.normalizedPayload.acceptanceThreshold);
    const currentFingerprint = proof.normalizedPayload.currentSourceFingerprint;
    const verdict = proof.normalizedPayload.derivedVerdict;
    if (
      proof.status !== 'succeeded' ||
      proof.capability !== 'decision_capable' ||
      proof.reviewedSourceFingerprint !== TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT ||
      currentFingerprint !== TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT ||
      cutoff !== TAU_COMPUTER_SCIENCE_ACCEPTANCE_CUTOFF
    ) {
      return unavailable(
        args.finalist.id,
        currentFingerprint && currentFingerprint !== TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT
          ? 'official_source_drift'
          : proof.status === 'partial'
            ? 'official_source_drift'
            : 'official_score_unavailable',
      );
    }
    if (score === undefined || (verdict !== 'accepted' && verdict !== 'below')) {
      return unavailable(args.finalist.id, 'official_score_unavailable');
    }

    return {
      id: args.finalist.id,
      status: 'verified',
      eligible: verdict === 'accepted',
      score,
      cutoff,
      scoreField: 'hatama_meduyakim',
      ruleFingerprint: TAU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
      sourceUrl: TAU_COMPUTER_SCIENCE_REQUIREMENTS_URL,
    };
  } catch {
    return unavailable(args.finalist.id, 'official_score_unavailable');
  }
}

function unavailable(
  id: string,
  reason: NonNullable<TauFinalistVerification['reason']>,
): TauFinalistVerification {
  return { id, status: 'unavailable', reason, sourceUrl: TAU_COMPUTER_SCIENCE_REQUIREMENTS_URL };
}

function boundedFetcher(fetcher: typeof fetch, timeoutMs: number): typeof fetch {
  return async (input, init) => fetchWithTimeout(fetcher, input, init ?? {}, timeoutMs);
}

async function fetchWithTimeout(
  fetcher: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function numericValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function cacheKeyFor(finalist: TauFinalist, secret: string): string {
  return createHmac('sha256', secret)
    .update(
      JSON.stringify({
        target: 'tau-computer-science',
        psychometric: finalist.psychometric,
        bagrutAverage: finalist.bagrutAverage,
        hasQualifiedMathAndPhysics: finalist.hasQualifiedMathAndPhysics,
        requiredInputs: finalist.requiredInputs,
        unmetRequirements: finalist.unmetRequirements,
      }),
    )
    .digest('hex');
}

function tauVerificationArtifactIsCurrent(): boolean {
  const artifact = TAU_COMPUTER_SCIENCE_PROGRAM_VERIFICATION_ARTIFACTS.tau_cs__tau;
  return (
    evaluateProgramVerification({
      contract: artifact.contract,
      fixtures: artifact.fixtures,
      currentAdmissionCycle: artifact.contract.admissionCycle,
      currentSourceFingerprint: artifact.contract.sourceFingerprint,
    }).capability === 'exact'
  );
}
