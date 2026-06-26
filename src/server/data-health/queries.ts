import 'server-only';

import { getOpsDb } from '@/db/opsClient';
import {
  admissionRequirements,
  admissionThresholds,
  ingestionJobs,
  ingestionSources,
  institutions,
  programInstitutions,
  programs,
  reviewItems,
  sourceFreshnessStates,
  sourceUrls,
  universityCalculatorConfigs,
} from '@/db/schema';
import { evaluateCatalogueReadiness } from '@/server/catalogue/queries';

const ISSUE_LIMIT = 5;
const DATA_HEALTH_QUERY_TIMEOUT_MS = 15000;
const DATA_HEALTH_UNAVAILABLE_MESSAGE = 'Operational data health is not configured.';
const DATA_HEALTH_TIMEOUT_MESSAGE =
  'Operational data health did not respond in time. Check OPS_DATABASE_URL and Supabase pooler connectivity.';
const SOURCE_FRESHNESS_STALE_AFTER_MS = 8 * 24 * 60 * 60 * 1000;

export type DataHealthReport =
  | DataHealthReadyReport
  | {
      status: 'unavailable';
      message: string;
    };

export interface DataHealthReadyReport {
  status: 'ready';
  generatedAt: string;
  readiness: {
    isReady: boolean;
    issues: string[];
    counts: DataHealthCounts;
  };
  coverage: {
    missingRequirementSourceCount: number;
    missingProgramSourceCount: number;
    missingRequirementSources: MissingRequirementSource[];
    missingProgramSources: MissingProgramSource[];
  };
  ingestion: {
    totalJobs: number;
    jobsByStatus: Partial<Record<IngestionJobStatus, number>>;
    jobsByDifficulty: Partial<Record<SourceDifficulty, number>>;
    oldestActiveJobs: IngestionJobSummary[];
    recentFailures: IngestionJobSummary[];
  };
  reviewQueue: {
    pendingCount: number;
    pendingByTargetField: Record<string, number>;
    oldestPendingItem: ReviewItemSummary | null;
    recentReviewedItems: ReviewItemSummary[];
  };
  freshness: {
    staleAfterDays: number;
    totalsByStatus: Partial<Record<DashboardSourceFreshnessStatus, number>>;
    rows: SourceFreshnessSummary[];
  };
}

export interface DataHealthRows {
  institutions: Array<{ id: string }>;
  programs: Array<{ id: string; name: string; admissionType: 'sekhem' | 'requirements' }>;
  programInstitutions: Array<{ programId: string; institutionId: string }>;
  admissionRequirements: Array<{
    id: string;
    programId: string;
    institutionId: string;
  }>;
  admissionThresholds: Array<{
    id: string;
    programId: string;
    institutionId: string;
    universityId: string;
    thresholdValue: number | null;
  }>;
  sourceUrls: Array<{
    id: string;
    admissionRequirementId: string;
    programId: string;
    institutionId: string;
    url: string;
  }>;
  universityCalculatorConfigs: Array<{ institutionId: string }>;
  ingestionSources: IngestionSourceRow[];
  ingestionJobs: IngestionJobRow[];
  reviewItems: ReviewItemRow[];
  sourceFreshnessStates: SourceFreshnessStateRow[];
}

type IngestionJobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'needs_review';
type SourceDifficulty = 'easy' | 'browser_required' | 'hard_manual';
type ReviewItemStatus = 'pending' | 'approved' | 'rejected';
type FreshnessSourceClass =
  | 'api_static_json'
  | 'browser_required'
  | 'official_html'
  | 'pdf_text'
  | 'score_only_calculator';
type FreshnessCapability = 'blocked' | 'decision_capable' | 'score_only';
type SourceFreshnessStatus = 'blocked' | 'changed_needs_review' | 'failed' | 'fresh';
type DashboardSourceFreshnessStatus = SourceFreshnessStatus | 'never_checked' | 'stale';

interface IngestionSourceRow {
  id: string;
  institutionId: string | null;
  programId: string | null;
  difficulty: SourceDifficulty;
  sourceUrl: string;
}

interface IngestionJobRow {
  id: string;
  sourceId: string;
  status: IngestionJobStatus;
  difficulty: SourceDifficulty;
  startedAt: Date | null;
  completedAt: Date | null;
  errorText: string | null;
  createdAt: Date;
}

interface ReviewItemRow {
  id: string;
  payloadId: string;
  admissionRequirementId: string | null;
  targetField: string;
  status: ReviewItemStatus;
  createdAt: Date;
  reviewedAt: Date | null;
}

interface SourceFreshnessStateRow {
  sourceId: string;
  sourceClass: FreshnessSourceClass;
  capability: FreshnessCapability;
  status: SourceFreshnessStatus;
  lastCheckedAt: Date | null;
  lastSuccessfulCheckAt: Date | null;
  lastChangedAt: Date | null;
  latestFailureReason: string | null;
  blockedReason: string | null;
  latestReviewItemId: string | null;
  nextAction: string | null;
}

interface DataHealthCounts {
  institutions: number;
  programs: number;
  programInstitutions: number;
  admissionRequirements: number;
  admissionThresholds: number;
  sourceUrls: number;
  universityCalculatorConfigs: number;
}

interface MissingRequirementSource {
  admissionRequirementId: string;
  institutionId: string;
  programId: string;
}

interface MissingProgramSource {
  institutionId: string | null;
  programId: string;
  programName: string;
}

interface IngestionJobSummary {
  id: string;
  sourceId: string;
  status: IngestionJobStatus;
  difficulty: SourceDifficulty;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorText: string | null;
}

interface ReviewItemSummary {
  id: string;
  payloadId: string;
  admissionRequirementId: string | null;
  targetField: string;
  status: ReviewItemStatus;
  createdAt: string;
  reviewedAt: string | null;
}

interface GetDataHealthReportOptions {
  timeoutMs?: number;
}

class DataHealthTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Data health query timed out after ${timeoutMs}ms`);
    this.name = 'DataHealthTimeoutError';
  }
}

interface SourceFreshnessSummary {
  sourceId: string;
  institutionId: string | null;
  programId: string | null;
  sourceUrl: string;
  status: DashboardSourceFreshnessStatus;
  sourceClass: FreshnessSourceClass | null;
  capability: FreshnessCapability | null;
  lastCheckedAt: string | null;
  lastSuccessfulCheckAt: string | null;
  lastChangedAt: string | null;
  reason: string | null;
  latestReviewItemId: string | null;
  nextAction: string | null;
}

export async function getDataHealthReport(
  now = new Date(),
  options: GetDataHealthReportOptions = {},
): Promise<DataHealthReport> {
  try {
    const rows = await withTimeout(
      loadDataHealthRows(),
      options.timeoutMs ?? DATA_HEALTH_QUERY_TIMEOUT_MS,
    );
    return summarizeDataHealthRows(rows, now);
  } catch (error) {
    return {
      status: 'unavailable',
      message:
        error instanceof DataHealthTimeoutError
          ? DATA_HEALTH_TIMEOUT_MESSAGE
          : DATA_HEALTH_UNAVAILABLE_MESSAGE,
    };
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new DataHealthTimeoutError(timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export function summarizeDataHealthRows(
  rows: DataHealthRows,
  now = new Date(),
): DataHealthReadyReport {
  const readiness = evaluateCatalogueReadiness({
    institutions: rows.institutions,
    programs: rows.programs,
    programInstitutions: rows.programInstitutions,
    admissionThresholds: rows.admissionThresholds,
    universityCalculatorConfigs: rows.universityCalculatorConfigs,
  });

  return {
    status: 'ready',
    generatedAt: now.toISOString(),
    readiness: {
      isReady: readiness.isReady,
      issues: readiness.issues,
      counts: {
        institutions: rows.institutions.length,
        programs: rows.programs.length,
        programInstitutions: rows.programInstitutions.length,
        admissionRequirements: rows.admissionRequirements.length,
        admissionThresholds: rows.admissionThresholds.length,
        sourceUrls: rows.sourceUrls.length,
        universityCalculatorConfigs: rows.universityCalculatorConfigs.length,
      },
    },
    coverage: buildCoverageSummary(rows),
    ingestion: buildIngestionSummary(rows.ingestionJobs),
    reviewQueue: buildReviewQueueSummary(rows.reviewItems),
    freshness: buildSourceFreshnessSummary(rows, now),
  };
}

async function loadDataHealthRows(): Promise<DataHealthRows> {
  const db = getOpsDb();

  const [
    institutionRows,
    programRows,
    programInstitutionRows,
    admissionRequirementRows,
    admissionThresholdRows,
    sourceUrlRows,
    calculatorConfigRows,
    ingestionSourceRows,
    ingestionJobRows,
    reviewItemRows,
    sourceFreshnessStateRows,
  ] = await Promise.all([
    db.select({ id: institutions.id }).from(institutions),
    db
      .select({
        id: programs.id,
        name: programs.name,
        admissionType: programs.admissionType,
      })
      .from(programs),
    db
      .select({
        programId: programInstitutions.programId,
        institutionId: programInstitutions.institutionId,
      })
      .from(programInstitutions),
    db
      .select({
        id: admissionRequirements.id,
        programId: admissionRequirements.programId,
        institutionId: admissionRequirements.institutionId,
      })
      .from(admissionRequirements),
    db
      .select({
        id: admissionThresholds.id,
        programId: admissionThresholds.programId,
        institutionId: admissionThresholds.institutionId,
        universityId: admissionThresholds.universityId,
        thresholdValue: admissionThresholds.thresholdValue,
      })
      .from(admissionThresholds),
    db
      .select({
        id: sourceUrls.id,
        admissionRequirementId: sourceUrls.admissionRequirementId,
        programId: sourceUrls.programId,
        institutionId: sourceUrls.institutionId,
        url: sourceUrls.url,
      })
      .from(sourceUrls),
    db
      .select({
        institutionId: universityCalculatorConfigs.institutionId,
      })
      .from(universityCalculatorConfigs),
    db
      .select({
        id: ingestionSources.id,
        institutionId: ingestionSources.institutionId,
        programId: ingestionSources.programId,
        difficulty: ingestionSources.difficulty,
        sourceUrl: ingestionSources.sourceUrl,
      })
      .from(ingestionSources),
    db
      .select({
        id: ingestionJobs.id,
        sourceId: ingestionJobs.sourceId,
        status: ingestionJobs.status,
        difficulty: ingestionJobs.difficulty,
        startedAt: ingestionJobs.startedAt,
        completedAt: ingestionJobs.completedAt,
        errorText: ingestionJobs.errorText,
        createdAt: ingestionJobs.createdAt,
      })
      .from(ingestionJobs),
    db
      .select({
        id: reviewItems.id,
        payloadId: reviewItems.payloadId,
        admissionRequirementId: reviewItems.admissionRequirementId,
        targetField: reviewItems.targetField,
        status: reviewItems.status,
        createdAt: reviewItems.createdAt,
        reviewedAt: reviewItems.reviewedAt,
      })
      .from(reviewItems),
    db
      .select({
        sourceId: sourceFreshnessStates.sourceId,
        sourceClass: sourceFreshnessStates.sourceClass,
        capability: sourceFreshnessStates.capability,
        status: sourceFreshnessStates.status,
        lastCheckedAt: sourceFreshnessStates.lastCheckedAt,
        lastSuccessfulCheckAt: sourceFreshnessStates.lastSuccessfulCheckAt,
        lastChangedAt: sourceFreshnessStates.lastChangedAt,
        latestFailureReason: sourceFreshnessStates.latestFailureReason,
        blockedReason: sourceFreshnessStates.blockedReason,
        latestReviewItemId: sourceFreshnessStates.latestReviewItemId,
        nextAction: sourceFreshnessStates.nextAction,
      })
      .from(sourceFreshnessStates),
  ]);

  return {
    institutions: institutionRows,
    programs: programRows,
    programInstitutions: programInstitutionRows,
    admissionRequirements: admissionRequirementRows,
    admissionThresholds: admissionThresholdRows,
    sourceUrls: sourceUrlRows,
    universityCalculatorConfigs: calculatorConfigRows,
    ingestionSources: ingestionSourceRows,
    ingestionJobs: ingestionJobRows,
    reviewItems: reviewItemRows,
    sourceFreshnessStates: sourceFreshnessStateRows,
  };
}

function buildCoverageSummary(rows: DataHealthRows): DataHealthReadyReport['coverage'] {
  const sourceRequirementIds = new Set(rows.sourceUrls.map((row) => row.admissionRequirementId));
  const sourceProgramIds = new Set(rows.sourceUrls.map((row) => row.programId));
  const relationByProgramId = new Map(
    rows.programInstitutions.map((row) => [row.programId, row.institutionId]),
  );

  const missingRequirementSources = rows.admissionRequirements
    .filter((row) => !sourceRequirementIds.has(row.id))
    .map((row) => ({
      admissionRequirementId: row.id,
      institutionId: row.institutionId,
      programId: row.programId,
    }));
  const missingProgramSources = rows.programs
    .filter((row) => !sourceProgramIds.has(row.id))
    .map((row) => ({
      institutionId: relationByProgramId.get(row.id) ?? null,
      programId: row.id,
      programName: row.name,
    }));

  return {
    missingRequirementSourceCount: missingRequirementSources.length,
    missingProgramSourceCount: missingProgramSources.length,
    missingRequirementSources: missingRequirementSources.slice(0, ISSUE_LIMIT),
    missingProgramSources: missingProgramSources.slice(0, ISSUE_LIMIT),
  };
}

function buildIngestionSummary(rows: IngestionJobRow[]): DataHealthReadyReport['ingestion'] {
  const activeStatuses = new Set<IngestionJobStatus>(['pending', 'running', 'needs_review']);

  return {
    totalJobs: rows.length,
    jobsByStatus: countBy(rows, (row) => row.status),
    jobsByDifficulty: countBy(rows, (row) => row.difficulty),
    oldestActiveJobs: rows
      .filter((row) => activeStatuses.has(row.status))
      .toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, ISSUE_LIMIT)
      .map(serializeIngestionJob),
    recentFailures: rows
      .filter((row) => row.status === 'failed')
      .toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, ISSUE_LIMIT)
      .map(serializeIngestionJob),
  };
}

function buildReviewQueueSummary(rows: ReviewItemRow[]): DataHealthReadyReport['reviewQueue'] {
  const pendingItems = rows.filter((row) => row.status === 'pending');
  const oldestPendingItem =
    pendingItems
      .toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(serializeReviewItem)[0] ?? null;

  return {
    pendingCount: pendingItems.length,
    pendingByTargetField: countBy(pendingItems, (row) => row.targetField),
    oldestPendingItem,
    recentReviewedItems: rows
      .filter((row) => row.status !== 'pending' && row.reviewedAt)
      .toSorted((a, b) => (b.reviewedAt?.getTime() ?? 0) - (a.reviewedAt?.getTime() ?? 0))
      .slice(0, ISSUE_LIMIT)
      .map(serializeReviewItem),
  };
}

function buildSourceFreshnessSummary(
  rows: DataHealthRows,
  now: Date,
): DataHealthReadyReport['freshness'] {
  const statesBySourceId = new Map(rows.sourceFreshnessStates.map((row) => [row.sourceId, row]));
  const freshnessRows = rows.ingestionSources
    .map((source) => serializeSourceFreshness(source, statesBySourceId.get(source.id), now))
    .toSorted(compareSourceFreshnessRows);

  return {
    staleAfterDays: SOURCE_FRESHNESS_STALE_AFTER_MS / (24 * 60 * 60 * 1000),
    totalsByStatus: countBy(freshnessRows, (row) => row.status),
    rows: freshnessRows.slice(0, ISSUE_LIMIT),
  };
}

function serializeSourceFreshness(
  source: IngestionSourceRow,
  state: SourceFreshnessStateRow | undefined,
  now: Date,
): SourceFreshnessSummary {
  if (!state) {
    return {
      sourceId: source.id,
      institutionId: source.institutionId,
      programId: source.programId,
      sourceUrl: source.sourceUrl,
      status: 'never_checked',
      sourceClass: null,
      capability: null,
      lastCheckedAt: null,
      lastSuccessfulCheckAt: null,
      lastChangedAt: null,
      reason: null,
      latestReviewItemId: null,
      nextAction: null,
    };
  }

  const status = classifySourceFreshnessStatus(state, now);

  return {
    sourceId: source.id,
    institutionId: source.institutionId,
    programId: source.programId,
    sourceUrl: source.sourceUrl,
    status,
    sourceClass: state.sourceClass,
    capability: state.capability,
    lastCheckedAt: state.lastCheckedAt?.toISOString() ?? null,
    lastSuccessfulCheckAt: state.lastSuccessfulCheckAt?.toISOString() ?? null,
    lastChangedAt: state.lastChangedAt?.toISOString() ?? null,
    reason: state.latestFailureReason ?? state.blockedReason,
    latestReviewItemId: state.latestReviewItemId,
    nextAction: state.nextAction,
  };
}

function classifySourceFreshnessStatus(
  state: SourceFreshnessStateRow,
  now: Date,
): DashboardSourceFreshnessStatus {
  if (state.status !== 'fresh') {
    return state.status;
  }

  if (
    !state.lastSuccessfulCheckAt ||
    now.getTime() - state.lastSuccessfulCheckAt.getTime() > SOURCE_FRESHNESS_STALE_AFTER_MS
  ) {
    return 'stale';
  }

  return 'fresh';
}

function compareSourceFreshnessRows(
  left: SourceFreshnessSummary,
  right: SourceFreshnessSummary,
): number {
  const priority = freshnessStatusPriority(left.status) - freshnessStatusPriority(right.status);
  if (priority !== 0) {
    return priority;
  }

  const leftChecked = left.lastCheckedAt ? Date.parse(left.lastCheckedAt) : 0;
  const rightChecked = right.lastCheckedAt ? Date.parse(right.lastCheckedAt) : 0;
  return leftChecked - rightChecked || left.sourceId.localeCompare(right.sourceId);
}

function freshnessStatusPriority(status: DashboardSourceFreshnessStatus): number {
  const priorities: Record<DashboardSourceFreshnessStatus, number> = {
    changed_needs_review: 0,
    failed: 1,
    stale: 2,
    blocked: 3,
    never_checked: 4,
    fresh: 5,
  };

  return priorities[status];
}

function countBy<T, K extends string>(rows: T[], getKey: (row: T) => K): Record<K, number> {
  return rows.reduce<Record<K, number>>(
    (counts, row) => {
      const key = getKey(row);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    },
    {} as Record<K, number>,
  );
}

function serializeIngestionJob(row: IngestionJobRow): IngestionJobSummary {
  return {
    id: row.id,
    sourceId: row.sourceId,
    status: row.status,
    difficulty: row.difficulty,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    errorText: row.errorText,
  };
}

function serializeReviewItem(row: ReviewItemRow): ReviewItemSummary {
  return {
    id: row.id,
    payloadId: row.payloadId,
    admissionRequirementId: row.admissionRequirementId,
    targetField: row.targetField,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}
