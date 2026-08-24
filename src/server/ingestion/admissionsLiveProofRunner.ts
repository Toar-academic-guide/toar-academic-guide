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
import { runTechnionAdmissionsProof } from './adapters/technionAdmissions';
import { OFFICIAL_PROGRAM_PROOF_CAPTURES_BY_TARGET_ID } from '@/data/admissions/officialProgramProofCaptures';
import { getFormulaPairVerificationEntry } from '@/data/admissions/formulaBackedVerificationLedger';
import { withBoundedOfficialResponse } from './boundedOfficialFetch';

export interface AdmissionsLiveProofOptions {
  applicant?: AdmissionsApplicantInput;
  fetcher?: typeof fetch;
  includeCapabilityMatrix?: boolean;
  targetIds?: string[];
  institutionId?: string;
  limit?: number;
  offset?: number;
  requestTimeoutMs?: number;
  controlledFixturesByTargetId?: Record<string, readonly ControlledLiveFixture[]>;
  onResult?: (result: AdmissionsSourceProofEvaluation) => Promise<void>;
}

export interface ControlledLiveFixture {
  captureId: string;
  applicant: AdmissionsApplicantInput;
  expected: {
    score: number;
    verdict: 'accepted' | 'below' | 'eligible_to_apply' | 'pending';
  };
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
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const MAX_CONCURRENT_TARGETS = 3;
const STATIC_OFFICIAL_SOURCE_URLS = new Set([
  'https://go.huji.ac.il/jjson/huji.json.gz',
  'https://admissions.technion.ac.il/sechem-for-admission/%D7%9E%D7%A1%D7%9C%D7%95%D7%9C%D7%99-%D7%94%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%9C%D7%A4%D7%99-%D7%90%D7%A4%D7%99%D7%A7%D7%99-%D7%94%D7%A7%D7%91%D7%9C%D7%94/',
]);

export async function runAdmissionsLiveProof(
  options: AdmissionsLiveProofOptions = {},
): Promise<AdmissionsLiveProofReport> {
  const selectedTargets = options.includeCapabilityMatrix
    ? filterTargets(admissionsSourceTargets, options.targetIds)
    : selectAdmissionsSourceTargets(options.targetIds);
  const targets = batchTargets(selectedTargets, options);
  const fetcher = cacheStaticOfficialSourceFetches(
    withBoundedOfficialResponse(options.fetcher ?? fetch, {
      timeoutMs: options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    }),
  );
  const results = await runTargetsWithBoundedConcurrency(targets, {
    ...options,
    fetcher,
  });

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

async function runTargetsWithBoundedConcurrency(
  targets: AdmissionsSourceTarget[],
  options: AdmissionsLiveProofOptions,
): Promise<AdmissionsSourceProofEvaluation[]> {
  const results = new Array<AdmissionsSourceProofEvaluation>(targets.length);
  const queued = targets.map((target, index) => ({
    target,
    index,
    host: new URL(target.officialUrl).host,
  }));
  const activeHosts = new Set<string>();
  const running = new Set<Promise<void>>();

  while (queued.length > 0 || running.size > 0) {
    while (running.size < MAX_CONCURRENT_TARGETS) {
      const nextIndex = queued.findIndex((item) => !activeHosts.has(item.host));
      if (nextIndex === -1) break;
      const next = queued.splice(nextIndex, 1)[0]!;
      activeHosts.add(next.host);
      const task = runControlledTarget(next.target, options)
        .then(async (proof) => {
          const result = evaluateAdmissionsSourceProof(proof);
          results[next.index] = result;
          await options.onResult?.(result);
        })
        .finally(() => activeHosts.delete(next.host));
      running.add(task);
      void task.then(
        () => running.delete(task),
        () => running.delete(task),
      );
    }
    if (running.size > 0) await Promise.race(running);
  }

  return results;
}

async function runControlledTarget(
  target: AdmissionsSourceTarget,
  options: AdmissionsLiveProofOptions,
): Promise<AdmissionsSourceProof> {
  const fixtures =
    options.controlledFixturesByTargetId?.[target.id] ??
    CONTROLLED_FIXTURES_BY_TARGET_ID[target.id] ??
    [];
  const fixtureCoverageError = controlledFixtureCoverageError(fixtures);
  if (fixtureCoverageError) {
    return withholdUncapturedProof(await runTarget(target, options), fixtureCoverageError);
  }

  const proofs: AdmissionsSourceProof[] = [];
  for (const fixture of fixtures) {
    proofs.push(await runTarget(target, { ...options, applicant: fixture.applicant }));
  }
  const mismatches = proofs.flatMap((proof, index) => compareFixture(proof, fixtures[index]));
  const finalProof = proofs[proofs.length - 1]!;

  if (mismatches.length > 0 || proofs.some((proof) => proof.status !== 'succeeded')) {
    return withholdUncapturedProof(
      finalProof,
      [
        'The controlled proof did not reproduce every independently captured fixture.',
        ...mismatches,
      ].join(' '),
    );
  }

  return {
    ...finalProof,
    decisionProvenance: 'verified_derivation',
    reviewedSourceFingerprint: reviewedSourceFingerprintFor(target),
    normalizedPayload: {
      ...finalProof.normalizedPayload,
      controlledFixtureCaptureIds: fixtures.map((fixture) => fixture.captureId),
    },
  };
}

function reviewedSourceFingerprintFor(target: AdmissionsSourceTarget): string | undefined {
  const pairId = target.defaultProgram?.pairId;
  if (!pairId) return undefined;
  return getFormulaPairVerificationEntry(pairId)?.liveProof.sourceFingerprint ?? undefined;
}

function controlledFixtureCoverageError(
  fixtures: readonly ControlledLiveFixture[],
): string | undefined {
  const hasEligibleFixture = fixtures.some(
    (fixture) =>
      fixture.expected.verdict === 'accepted' || fixture.expected.verdict === 'eligible_to_apply',
  );
  const hasBelowFixture = fixtures.some((fixture) => fixture.expected.verdict === 'below');
  const uniqueCaptureIds = new Set(fixtures.map((fixture) => fixture.captureId));

  if (fixtures.length < 2 || !hasEligibleFixture || !hasBelowFixture) {
    return 'A controlled proof requires independently captured eligible and below-threshold fixtures.';
  }
  if (uniqueCaptureIds.size !== fixtures.length) {
    return 'A controlled proof requires unique capture identifiers for every fixture.';
  }

  return undefined;
}

const CONTROLLED_FIXTURES_BY_TARGET_ID: Record<string, readonly ControlledLiveFixture[]> =
  OFFICIAL_PROGRAM_PROOF_CAPTURES_BY_TARGET_ID;

function compareFixture(proof: AdmissionsSourceProof, fixture: ControlledLiveFixture): string[] {
  const score =
    numericPayloadValue(proof.normalizedPayload.selectedScore) ??
    numericPayloadValue(proof.normalizedPayload.weightedScore);
  const verdict = proof.normalizedPayload.derivedVerdict;
  const mismatches: string[] = [];

  if (score !== fixture.expected.score) {
    mismatches.push(`${fixture.captureId} score mismatch.`);
  }
  if (verdict !== fixture.expected.verdict) {
    mismatches.push(`${fixture.captureId} verdict mismatch.`);
  }

  return mismatches;
}

function numericPayloadValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function withholdUncapturedProof(
  proof: AdmissionsSourceProof,
  limitation: string,
): AdmissionsSourceProof {
  if (proof.status === 'failed' || proof.status === 'blocked') {
    return proof;
  }

  return {
    ...proof,
    capability: 'score_only',
    proofLevel: 'partial_official',
    status: 'partial',
    limitations: [...proof.limitations, limitation],
    nextAction:
      'Capture independent official eligible and below-threshold responses, then rerun the controlled comparison before activation.',
  };
}

function cacheStaticOfficialSourceFetches(fetcher: typeof fetch): typeof fetch {
  const cachedResponses = new Map<string, Promise<Response>>();

  return async (input, init) => {
    const request = new Request(input, init);
    const isStaticOfficialSource =
      request.method === 'GET' && STATIC_OFFICIAL_SOURCE_URLS.has(request.url);

    if (!isStaticOfficialSource) return fetcher(input, init);

    const cacheKey = request.url;
    let response = cachedResponses.get(cacheKey);
    if (!response) {
      response = fetcher(input, init);
      cachedResponses.set(cacheKey, response);
      response.catch(() => cachedResponses.delete(cacheKey));
    }

    return (await response).clone();
  };
}

async function runTarget(
  target: AdmissionsSourceTarget,
  options: AdmissionsLiveProofOptions,
): Promise<AdmissionsSourceProof> {
  if (target.adapterId === 'haifa' && target.category === 'exact') {
    return runHaifaAdmissionsProof({
      applicant: options.applicant ?? target.defaultApplicant ?? DEFAULT_APPLICANT,
      fetcher: options.fetcher,
      program: target.defaultProgram,
    });
  }

  if (target.adapterId === 'tau' && target.category === 'exact') {
    return runTauAdmissionsProof({
      applicant: options.applicant ?? target.defaultApplicant ?? DEFAULT_APPLICANT,
      fetcher: options.fetcher,
      program: target.defaultProgram,
    });
  }

  if (target.adapterId === 'huji' && target.category === 'exact') {
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

  if (target.adapterId === 'technion' && target.category === 'exact') {
    return runTechnionAdmissionsProof({
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

function batchTargets(
  targets: AdmissionsSourceTarget[],
  options: Pick<AdmissionsLiveProofOptions, 'institutionId' | 'limit' | 'offset'>,
) {
  const byInstitution = options.institutionId
    ? targets.filter((target) => target.institutionId === options.institutionId)
    : targets;
  const offset = Math.max(0, options.offset ?? 0);
  const limit = options.limit === undefined ? undefined : Math.max(0, options.limit);
  return limit === undefined
    ? byInstitution.slice(offset)
    : byInstitution.slice(offset, offset + limit);
}
