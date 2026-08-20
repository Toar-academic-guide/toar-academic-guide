import { hasDatabaseUrl } from '@/env';
import {
  runAdmissionsLiveProof,
  type AdmissionsLiveProofOptions,
  type AdmissionsLiveProofReport,
} from './admissionsLiveProofRunner';
import {
  createDrizzleSourceFreshnessRepository,
  persistAdmissionsSourceProofs,
  type PersistAdmissionsSourceProofsResult,
  type SourceFreshnessRepository,
} from './sourceFreshness';
import type { AdmissionsSourceProof } from './admissionsSourceAdapters';

export interface AdmissionsSourceFreshnessRunnerOptions extends Pick<
  AdmissionsLiveProofOptions,
  'applicant' | 'fetcher' | 'targetIds'
> {
  checkedAt?: Date;
  dryRun?: boolean;
  includeCapabilityMatrix?: boolean;
  proofRunner?: (options: AdmissionsLiveProofOptions) => Promise<AdmissionsLiveProofReport>;
  repository?: SourceFreshnessRepository;
}

export interface AdmissionsSourceFreshnessRunResult {
  persistence: PersistAdmissionsSourceProofsResult | null;
  report: AdmissionsLiveProofReport;
}

export function parseAdmissionsSourceFreshnessArgs(argv: string[]): {
  dryRun: boolean;
  includeCapabilityMatrix: boolean;
  targetIds?: string[];
} {
  const targetIds: string[] = [];
  let dryRun = false;
  let includeCapabilityMatrix = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--exact-only') {
      includeCapabilityMatrix = false;
    } else if (arg === '--all') {
      includeCapabilityMatrix = true;
    } else if (arg === '--target' && argv[index + 1]) {
      targetIds.push(argv[index + 1]);
      index += 1;
    }
  }

  return {
    dryRun,
    includeCapabilityMatrix,
    targetIds: targetIds.length > 0 ? targetIds : undefined,
  };
}

export async function runAdmissionsSourceFreshness(
  options: AdmissionsSourceFreshnessRunnerOptions = {},
): Promise<AdmissionsSourceFreshnessRunResult> {
  assertAdmissionsSourceFreshnessConfig(options);

  const proofRunner = options.proofRunner ?? runAdmissionsLiveProof;
  const repository = options.dryRun
    ? undefined
    : (options.repository ?? createDrizzleSourceFreshnessRepository());
  let persistence = repository ? emptyPersistenceSummary() : null;
  const persistedSourceIds = new Set<string>();
  const persistResult = async (proof: AdmissionsSourceProof) => {
    if (!repository || !persistence || persistedSourceIds.has(proof.id)) return;
    const result = await persistAdmissionsSourceProofs({
      checkedAt: options.checkedAt,
      proofs: [proof],
      repository,
    });
    persistedSourceIds.add(proof.id);
    addPersistenceSummary(persistence, result);
  };
  const report = await proofRunner({
    applicant: options.applicant,
    fetcher: options.fetcher,
    includeCapabilityMatrix: options.includeCapabilityMatrix ?? true,
    targetIds: options.targetIds,
    onResult: async (result) => persistResult(result.proof),
  });

  if (options.dryRun) {
    return {
      report,
      persistence: null,
    };
  }

  for (const result of report.results) {
    await persistResult(result.proof);
  }

  return {
    report,
    persistence,
  };
}

function emptyPersistenceSummary(): PersistAdmissionsSourceProofsResult {
  return {
    total: 0,
    blocked: 0,
    changed_needs_review: 0,
    failed: 0,
    fresh: 0,
    reviewsCreated: 0,
  };
}

function addPersistenceSummary(
  target: PersistAdmissionsSourceProofsResult,
  source: PersistAdmissionsSourceProofsResult,
): void {
  target.total += source.total;
  target.blocked += source.blocked;
  target.changed_needs_review += source.changed_needs_review;
  target.failed += source.failed;
  target.fresh += source.fresh;
  target.reviewsCreated += source.reviewsCreated;
}

function assertAdmissionsSourceFreshnessConfig(
  options: AdmissionsSourceFreshnessRunnerOptions,
): void {
  if (options.dryRun || options.repository || hasDatabaseUrl()) {
    return;
  }

  throw new Error(
    'Missing DATABASE_URL. Configure DATABASE_URL before running persisted admissions source freshness checks, or pass --dry-run.',
  );
}
