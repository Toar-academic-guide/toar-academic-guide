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
  const report = await proofRunner({
    applicant: options.applicant,
    fetcher: options.fetcher,
    includeCapabilityMatrix: options.includeCapabilityMatrix ?? true,
    targetIds: options.targetIds,
  });

  if (options.dryRun) {
    return {
      report,
      persistence: null,
    };
  }

  const repository = options.repository ?? createDrizzleSourceFreshnessRepository();
  const persistence = await persistAdmissionsSourceProofs({
    checkedAt: options.checkedAt,
    proofs: report.results.map((result) => result.proof),
    repository,
  });

  return {
    report,
    persistence,
  };
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
