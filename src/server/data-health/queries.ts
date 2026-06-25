import 'server-only';

import { getOpsDb } from '@/db/opsClient';
import {
  admissionAlternativePaths,
  admissionFacts,
  admissionRequirements,
  admissionThresholds,
  admissionsSourceCandidates,
  ingestionJobs,
  institutions,
  programInstitutions,
  programs,
  reviewItems,
  sourceUrls,
  universityCalculatorConfigs,
} from '@/db/schema';
import { evaluateCatalogueReadiness } from '@/server/catalogue/queries';

const ISSUE_LIMIT = 5;
const DATA_HEALTH_QUERY_TIMEOUT_MS = 15000;
const DATA_HEALTH_UNAVAILABLE_MESSAGE = 'Operational data health is not configured.';
const DATA_HEALTH_TIMEOUT_MESSAGE =
  'Operational data health did not respond in time. Check OPS_DATABASE_URL and Supabase pooler connectivity.';

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
  decisionReadiness: {
    decisionReadyRequirementCount: number;
    missingFactCount: number;
    weakSourceCount: number;
    manualGateCount: number;
    alternativePathCount: number;
    requirementsMissingFacts: AdmissionRequirementIssue[];
    weakSources: SourceCandidateIssue[];
    manualGateRequirements: AdmissionRequirementIssue[];
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
  admissionsSourceCandidates: Array<{
    id: string;
    admissionRequirementId: string;
    programId: string;
    institutionId: string;
    origin: string;
    specificity: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  admissionFacts: Array<{
    id: string;
    admissionRequirementId: string;
    programId: string;
    institutionId: string;
    kind: string;
    field: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  admissionAlternativePaths: Array<{
    id: string;
    admissionRequirementId: string;
    programId: string;
    institutionId: string;
    kind: string;
  }>;
  ingestionJobs: IngestionJobRow[];
  reviewItems: ReviewItemRow[];
}

type IngestionJobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'needs_review';
type SourceDifficulty = 'easy' | 'browser_required' | 'hard_manual';
type ReviewItemStatus = 'pending' | 'approved' | 'rejected';

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

interface AdmissionRequirementIssue {
  admissionRequirementId: string;
  institutionId: string;
  programId: string;
}

interface SourceCandidateIssue extends AdmissionRequirementIssue {
  sourceCandidateId: string;
  confidence: 'high' | 'medium' | 'low';
  origin: string;
  specificity: string;
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
    decisionReadiness: buildDecisionReadinessSummary(rows),
    ingestion: buildIngestionSummary(rows.ingestionJobs),
    reviewQueue: buildReviewQueueSummary(rows.reviewItems),
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
    admissionsSourceCandidateRows,
    admissionFactRows,
    admissionAlternativePathRows,
    ingestionJobRows,
    reviewItemRows,
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
        id: admissionsSourceCandidates.id,
        admissionRequirementId: admissionsSourceCandidates.admissionRequirementId,
        programId: admissionsSourceCandidates.programId,
        institutionId: admissionsSourceCandidates.institutionId,
        origin: admissionsSourceCandidates.origin,
        specificity: admissionsSourceCandidates.specificity,
        confidence: admissionsSourceCandidates.confidence,
      })
      .from(admissionsSourceCandidates),
    db
      .select({
        id: admissionFacts.id,
        admissionRequirementId: admissionFacts.admissionRequirementId,
        programId: admissionFacts.programId,
        institutionId: admissionFacts.institutionId,
        kind: admissionFacts.kind,
        field: admissionFacts.field,
        confidence: admissionFacts.confidence,
      })
      .from(admissionFacts),
    db
      .select({
        id: admissionAlternativePaths.id,
        admissionRequirementId: admissionAlternativePaths.admissionRequirementId,
        programId: admissionAlternativePaths.programId,
        institutionId: admissionAlternativePaths.institutionId,
        kind: admissionAlternativePaths.kind,
      })
      .from(admissionAlternativePaths),
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
  ]);

  return {
    institutions: institutionRows,
    programs: programRows,
    programInstitutions: programInstitutionRows,
    admissionRequirements: admissionRequirementRows,
    admissionThresholds: admissionThresholdRows,
    sourceUrls: sourceUrlRows,
    universityCalculatorConfigs: calculatorConfigRows,
    admissionsSourceCandidates: admissionsSourceCandidateRows,
    admissionFacts: admissionFactRows,
    admissionAlternativePaths: admissionAlternativePathRows,
    ingestionJobs: ingestionJobRows,
    reviewItems: reviewItemRows,
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

function buildDecisionReadinessSummary(
  rows: DataHealthRows,
): DataHealthReadyReport['decisionReadiness'] {
  const factsByRequirementId = new Map<string, DataHealthRows['admissionFacts']>();
  const sourceCandidatesByRequirementId = new Map<
    string,
    DataHealthRows['admissionsSourceCandidates']
  >();

  for (const fact of rows.admissionFacts) {
    const existing = factsByRequirementId.get(fact.admissionRequirementId) ?? [];
    existing.push(fact);
    factsByRequirementId.set(fact.admissionRequirementId, existing);
  }

  for (const source of rows.admissionsSourceCandidates) {
    const existing = sourceCandidatesByRequirementId.get(source.admissionRequirementId) ?? [];
    existing.push(source);
    sourceCandidatesByRequirementId.set(source.admissionRequirementId, existing);
  }

  const requirementsMissingFacts = rows.admissionRequirements
    .filter((requirement) => (factsByRequirementId.get(requirement.id) ?? []).length === 0)
    .map((requirement) => ({
      admissionRequirementId: requirement.id,
      institutionId: requirement.institutionId,
      programId: requirement.programId,
    }));

  const weakSources = rows.admissionsSourceCandidates
    .filter((source) => source.confidence === 'low' || source.specificity === 'generic')
    .map((source) => ({
      sourceCandidateId: source.id,
      admissionRequirementId: source.admissionRequirementId,
      institutionId: source.institutionId,
      programId: source.programId,
      confidence: source.confidence,
      origin: source.origin,
      specificity: source.specificity,
    }));

  const manualGateRequirementIds = new Set(
    rows.admissionFacts
      .filter((fact) => fact.kind === 'manual_gate')
      .map((fact) => fact.admissionRequirementId),
  );
  const manualGateRequirements = rows.admissionRequirements
    .filter((requirement) => manualGateRequirementIds.has(requirement.id))
    .map((requirement) => ({
      admissionRequirementId: requirement.id,
      institutionId: requirement.institutionId,
      programId: requirement.programId,
    }));

  const decisionReadyRequirementCount = rows.admissionRequirements.filter((requirement) => {
    const facts = factsByRequirementId.get(requirement.id) ?? [];
    const sources = sourceCandidatesByRequirementId.get(requirement.id) ?? [];
    return facts.length > 0 && sources.length > 0 && facts.some((fact) => fact.kind !== 'unknown');
  }).length;

  return {
    decisionReadyRequirementCount,
    missingFactCount: requirementsMissingFacts.length,
    weakSourceCount: weakSources.length,
    manualGateCount: rows.admissionFacts.filter((fact) => fact.kind === 'manual_gate').length,
    alternativePathCount: rows.admissionAlternativePaths.length,
    requirementsMissingFacts: requirementsMissingFacts.slice(0, ISSUE_LIMIT),
    weakSources: weakSources.slice(0, ISSUE_LIMIT),
    manualGateRequirements: manualGateRequirements.slice(0, ISSUE_LIMIT),
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
