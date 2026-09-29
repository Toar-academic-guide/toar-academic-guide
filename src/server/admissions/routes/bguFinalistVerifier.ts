import 'server-only';

import type { BagrutSubjectRecord } from '@/types';
import { bagrutExamSubjects } from '@/lib/bagrutSubjectRecord';
import {
  BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT,
  BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
  BGU_COMPUTER_SCIENCE_SOURCE_URL,
  BGU_COMPUTER_SCIENCE_VERIFICATION_METADATA_BY_PAIR_ID,
} from '@/data/admissions/bguComputerScienceVerification';
import { evaluateBguComputerScienceGates } from '@/server/admissions/bguComputerSciencePolicy';
import { evaluateProgramVerification } from '@/server/admissions/verification/programVerification';
import { runBguAdmissionsProof } from '@/server/ingestion/adapters/bguAdmissions';

const MAX_BGU_FINALISTS = 8;
const DEFAULT_TIMEOUT_MS = 5000;

export interface BguFinalist {
  id: string;
  psychometric: number;
  bagrutAverage: number;
  quantitativeSubscore: number;
  verbalSubscore: number;
  englishSubscore: number;
  languageRequirementsConfirmed: boolean;
  subjectRecord: BagrutSubjectRecord;
}

export interface BguFinalistVerification {
  id: string;
  status: 'verified' | 'unavailable';
  eligible?: boolean;
  score?: number;
  cutoff?: number;
  ruleFingerprint?: string;
  unmetRequirements?: string[];
  sourceUrl: string;
  reason?:
    | 'official_source_unavailable'
    | 'official_source_drift'
    | 'fixture_mismatch'
    | 'invalid_finalist_input'
    | 'finalist_limit_exceeded'
    | 'circuit_open';
}

export interface BguFinalistCircuit {
  isOpen(): boolean;
  recordSuccess(): void;
  recordFailure(): void;
}

export function createBguFinalistCircuit(failureThreshold = 3): BguFinalistCircuit {
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

export async function verifyBguComputerScienceFinalists(args: {
  finalists: BguFinalist[];
  fetcher?: typeof fetch;
  circuit?: BguFinalistCircuit;
  timeoutMs?: number;
  verificationArtifactCurrent?: () => boolean;
}): Promise<BguFinalistVerification[]> {
  if (args.finalists.length > MAX_BGU_FINALISTS) {
    return args.finalists.map((finalist) => unavailable(finalist.id, 'finalist_limit_exceeded'));
  }
  if (!(args.verificationArtifactCurrent ?? bguVerificationArtifactIsCurrent)()) {
    return args.finalists.map((finalist) => unavailable(finalist.id, 'fixture_mismatch'));
  }

  const fetcher = args.fetcher ?? fetch;
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const results: BguFinalistVerification[] = [];

  for (const finalist of args.finalists) {
    if (args.circuit?.isOpen()) {
      results.push(unavailable(finalist.id, 'circuit_open'));
      continue;
    }

    const verification = await verifyFinalist(finalist, fetcher, timeoutMs);
    if (verification.status === 'verified') args.circuit?.recordSuccess();
    else args.circuit?.recordFailure();
    results.push(verification);
  }

  return results;
}

async function verifyFinalist(
  finalist: BguFinalist,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<BguFinalistVerification> {
  if (!validFinalist(finalist)) return unavailable(finalist.id, 'invalid_finalist_input');

  const gates = evaluateBguComputerScienceGates({
    psychometric: finalist.psychometric,
    quantitativeSubscore: finalist.quantitativeSubscore,
    subjects: bagrutExamSubjects(finalist.subjectRecord),
    languageRequirementsConfirmed: finalist.languageRequirementsConfirmed,
  });
  if (!gates.eligibleForScoreComparison) {
    return {
      id: finalist.id,
      status: 'verified',
      eligible: false,
      cutoff: BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT.acceptanceThreshold,
      ruleFingerprint: BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
      unmetRequirements: gates.unmetRequirements,
      sourceUrl: BGU_COMPUTER_SCIENCE_SOURCE_URL,
    };
  }

  try {
    const artifact = BGU_COMPUTER_SCIENCE_VERIFICATION_METADATA_BY_PAIR_ID.bgu_cs__bgu;
    const proof = await runBguAdmissionsProof({
      fetcher: boundedFetcher(fetcher, timeoutMs),
      program: {
        targetId: artifact.contract.source.targetId,
        pairId: artifact.contract.pairId,
        id: artifact.contract.programId,
        name: 'Computer Science',
        externalId: artifact.contract.officialProgramId,
        searchText: artifact.contract.source.url,
      },
      applicant: {
        psychometric: finalist.psychometric,
        bagrutAverage: finalist.bagrutAverage,
        extraInputs: {
          bguBagrutAverage: finalist.bagrutAverage,
          psychometricMath: finalist.quantitativeSubscore,
          psychometricVerbal: finalist.verbalSubscore,
          psychometricEnglish: finalist.englishSubscore,
          bguLanguageRequirementsConfirmed: finalist.languageRequirementsConfirmed,
          bagrutSubjectRecord: finalist.subjectRecord,
        },
      },
    });
    const score = numericValue(proof.normalizedPayload.selectedScore);
    const cutoff = numericValue(proof.normalizedPayload.acceptanceThreshold);
    const fingerprint = proof.normalizedPayload.sourceFingerprint;
    const verdict = proof.normalizedPayload.derivedVerdict;
    if (
      proof.status !== 'succeeded' ||
      proof.capability !== 'decision_capable' ||
      fingerprint !== BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT ||
      cutoff !== BGU_COMPUTER_SCIENCE_REVIEWED_RULE_SNAPSHOT.acceptanceThreshold
    ) {
      return unavailable(
        finalist.id,
        proof.status === 'partial' ? 'official_source_drift' : 'official_source_unavailable',
      );
    }
    if (score === undefined || (verdict !== 'accepted' && verdict !== 'below')) {
      return unavailable(finalist.id, 'official_source_unavailable');
    }

    return {
      id: finalist.id,
      status: 'verified',
      eligible: verdict === 'accepted',
      score,
      cutoff,
      ruleFingerprint: BGU_COMPUTER_SCIENCE_SOURCE_FINGERPRINT,
      unmetRequirements: [],
      sourceUrl: BGU_COMPUTER_SCIENCE_SOURCE_URL,
    };
  } catch {
    return unavailable(finalist.id, 'official_source_unavailable');
  }
}

function validFinalist(finalist: BguFinalist): boolean {
  const validInteger = (value: number, min: number, max: number) =>
    Number.isInteger(value) && value >= min && value <= max;
  return (
    validInteger(finalist.psychometric, 200, 800) &&
    Number.isFinite(finalist.bagrutAverage) &&
    finalist.bagrutAverage >= 50 &&
    finalist.bagrutAverage <= 130 &&
    validInteger(finalist.quantitativeSubscore, 50, 150) &&
    validInteger(finalist.verbalSubscore, 50, 150) &&
    validInteger(finalist.englishSubscore, 50, 150) &&
    Array.isArray(finalist.subjectRecord.subjects)
  );
}

function unavailable(
  id: string,
  reason: NonNullable<BguFinalistVerification['reason']>,
): BguFinalistVerification {
  return { id, status: 'unavailable', reason, sourceUrl: BGU_COMPUTER_SCIENCE_SOURCE_URL };
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

function boundedFetcher(fetcher: typeof fetch, timeoutMs: number): typeof fetch {
  return async (input, init) => fetchWithTimeout(fetcher, input, init ?? {}, timeoutMs);
}

function numericValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function bguVerificationArtifactIsCurrent(): boolean {
  const artifact = BGU_COMPUTER_SCIENCE_VERIFICATION_METADATA_BY_PAIR_ID.bgu_cs__bgu;
  return (
    evaluateProgramVerification({
      contract: artifact.contract,
      fixtures: artifact.fixtures,
      currentAdmissionCycle: artifact.contract.admissionCycle,
      currentSourceFingerprint: artifact.contract.sourceFingerprint,
    }).capability === 'exact'
  );
}
