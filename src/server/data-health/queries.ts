import 'server-only';

import { eq } from 'drizzle-orm';

import type { InstitutionId } from '@/data/institutions';
import { getOpsDb } from '@/db/opsClient';
import {
  admissionAlternativePaths,
  admissionFacts,
  admissionRequirements,
  admissionThresholds,
  admissionsSourceCandidates,
  ingestionJobs,
  ingestionPayloads,
  ingestionSources,
  institutions,
  programInstitutions,
  programs,
  reviewItems,
  sourceFreshnessStates,
  sourceUrls,
  universityCalculatorConfigs,
} from '@/db/schema';
import type { SourceFreshnessStateRow } from '@/db/types';
import { buildAdmissionsCapabilityMatrix } from '@/server/admissions/capabilityMatrix';
import { evaluateCatalogueReadiness } from '@/server/catalogue/queries';
import {
  parseSourceFreshnessProposedValue,
  type SourceFreshnessProposedValue,
} from '@/server/ingestion/reviewTypes';
import type {
  AdmissionsEvaluationCapability,
  AdmissionsRequiredInput,
} from '@/types/admissionsEvaluation';
import type { CatalogueInstitution, CatalogueProgram } from '@/types/catalogue';
import type { UniversityId } from '@/types';

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
  decisionEvidence: {
    rows: AdmissionsEvidenceRow[];
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
  institutions: Array<{
    id: string;
    name: string;
    region: 'center' | 'north' | 'south' | 'any';
    domain: string | null;
    logoUrl: string | null;
    programUrl: string | null;
    calculatorUrl: string | null;
    universityId: string | null;
  }>;
  programs: Array<{
    id: string;
    name: string;
    institutionName: string;
    institutionId: string | null;
    type: 'academic' | 'certificate' | 'vocational';
    category: string;
    admissionType: 'sekhem' | 'requirements';
  }>;
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
  universityCalculatorConfigs: Array<{
    institutionId: string;
    formulaType: 'weighted_scaled' | 'technion_linear' | 'minimum_floors';
    psyWeight: number | null;
    bagrutWeight: number | null;
    minPsychometric: number | null;
    minBagrut: number | null;
    scaleDescription: string;
  }>;
  ingestionSources: IngestionSourceRow[];
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

type ReviewItemDetailStatus = ReviewItemStatus;

interface ReviewItemDetailRow {
  id: string;
  payloadId: string;
  admissionRequirementId: string | null;
  targetField: string;
  proposedValue: unknown;
  status: ReviewItemDetailStatus;
  createdAt: Date;
  reviewedAt: Date | null;
}

interface ReviewItemDetailPayloadRow {
  createdAt: Date;
}

interface ReviewItemDetailSourceRow {
  id: string;
  institutionId: string | null;
  programId: string | null;
  sourceUrl: string;
}

interface ReviewItemDetailFreshnessRow {
  sourceId: string;
  sourceClass: FreshnessSourceClass;
  capability: FreshnessCapability;
  status: SourceFreshnessStatus;
  lastCheckedAt: Date | null;
  lastSuccessfulCheckAt: Date | null;
  lastChangedAt: Date | null;
  latestReviewItemId: string | null;
  nextAction: string | null;
}

export interface ReviewItemDetail {
  id: string;
  payloadId: string;
  payloadCreatedAt: string | null;
  admissionRequirementId: string | null;
  targetField: string;
  status: ReviewItemDetailStatus;
  createdAt: string;
  reviewedAt: string | null;
  actionEligibility: {
    canApprove: boolean;
    canReject: boolean;
    approveBlockedReason: string | null;
  };
  evidence: {
    sourceId: string | null;
    institutionId: string | null;
    programId: string | null;
    sourceUrl: string | null;
    sourceClass: FreshnessSourceClass | null;
    capability: FreshnessCapability | null;
    freshnessStatus: SourceFreshnessStatus | null;
    latestReviewItemId: string | null;
    normalizedFingerprint: string | null;
    normalizedDecisionPayload: Array<{ key: string; value: string }>;
    reproducedFields: string[];
    limitations: string[];
    nextAction: string | null;
  };
}

export type ReviewItemDetailResult =
  | {
      status: 'found';
      item: ReviewItemDetail;
    }
  | {
      status: 'not_found';
    };

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

export interface AdmissionsEvidenceRow {
  programId: string;
  programName: string;
  institutionId: string;
  institutionName: string;
  evidenceMode: AdmissionsEvaluationCapability;
  severity: 'attention' | 'normal' | 'informational';
  sourceTargetId: string | null;
  officialSourceUrl: string | null;
  adapterId: string | null;
  externalProgramId: string | null;
  freshnessStatus: DashboardSourceFreshnessStatus | null;
  blockedReason: string | null;
  requiredInputs: AdmissionsRequiredInput[];
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

export async function getReviewItemDetail(reviewItemId: string): Promise<ReviewItemDetailResult> {
  const db = getOpsDb();
  const [reviewItem] = await db
    .select({
      id: reviewItems.id,
      payloadId: reviewItems.payloadId,
      admissionRequirementId: reviewItems.admissionRequirementId,
      targetField: reviewItems.targetField,
      proposedValue: reviewItems.proposedValue,
      status: reviewItems.status,
      createdAt: reviewItems.createdAt,
      reviewedAt: reviewItems.reviewedAt,
    })
    .from(reviewItems)
    .where(eq(reviewItems.id, reviewItemId))
    .limit(1);

  if (!reviewItem) {
    return { status: 'not_found' };
  }

  const sourceId = sourceIdFromReviewItem(reviewItem);
  const [payload, source, freshness] = await Promise.all([
    db
      .select({
        createdAt: ingestionPayloads.createdAt,
      })
      .from(ingestionPayloads)
      .where(eq(ingestionPayloads.id, reviewItem.payloadId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    sourceId
      ? db
          .select({
            id: ingestionSources.id,
            institutionId: ingestionSources.institutionId,
            programId: ingestionSources.programId,
            sourceUrl: ingestionSources.sourceUrl,
          })
          .from(ingestionSources)
          .where(eq(ingestionSources.id, sourceId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    sourceId
      ? db
          .select({
            sourceId: sourceFreshnessStates.sourceId,
            sourceClass: sourceFreshnessStates.sourceClass,
            capability: sourceFreshnessStates.capability,
            status: sourceFreshnessStates.status,
            lastCheckedAt: sourceFreshnessStates.lastCheckedAt,
            lastSuccessfulCheckAt: sourceFreshnessStates.lastSuccessfulCheckAt,
            lastChangedAt: sourceFreshnessStates.lastChangedAt,
            latestReviewItemId: sourceFreshnessStates.latestReviewItemId,
            nextAction: sourceFreshnessStates.nextAction,
          })
          .from(sourceFreshnessStates)
          .where(eq(sourceFreshnessStates.sourceId, sourceId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
  ]);

  return {
    status: 'found',
    item: buildReviewItemDetail({
      reviewItem,
      payload: payload ?? null,
      source,
      freshness,
    }),
  };
}

export function buildReviewItemDetail({
  freshness,
  payload,
  reviewItem,
  source,
}: {
  reviewItem: ReviewItemDetailRow;
  payload: ReviewItemDetailPayloadRow | null;
  source: ReviewItemDetailSourceRow | null;
  freshness: ReviewItemDetailFreshnessRow | null;
}): ReviewItemDetail {
  const parsed =
    reviewItem.targetField === 'sourceFreshness'
      ? parseSourceFreshnessProposedValue(reviewItem.proposedValue)
      : null;
  const sourceFreshnessValue = parsed?.ok ? parsed.value : null;
  const isPending = reviewItem.status === 'pending';
  const canApprove =
    isPending &&
    reviewItem.targetField === 'sourceFreshness' &&
    sourceFreshnessValue !== null &&
    freshness?.latestReviewItemId === reviewItem.id;

  return {
    id: reviewItem.id,
    payloadId: reviewItem.payloadId,
    payloadCreatedAt: payload?.createdAt.toISOString() ?? null,
    admissionRequirementId: reviewItem.admissionRequirementId,
    targetField: reviewItem.targetField,
    status: reviewItem.status,
    createdAt: reviewItem.createdAt.toISOString(),
    reviewedAt: reviewItem.reviewedAt?.toISOString() ?? null,
    actionEligibility: {
      canApprove,
      canReject: isPending,
      approveBlockedReason: approveBlockedReason(reviewItem, sourceFreshnessValue, freshness),
    },
    evidence: {
      sourceId: sourceFreshnessValue?.sourceId ?? freshness?.sourceId ?? source?.id ?? null,
      institutionId: source?.institutionId ?? null,
      programId: source?.programId ?? null,
      sourceUrl: source?.sourceUrl ?? null,
      sourceClass: freshness?.sourceClass ?? null,
      capability: freshness?.capability ?? null,
      freshnessStatus: freshness?.status ?? null,
      latestReviewItemId: freshness?.latestReviewItemId ?? null,
      normalizedFingerprint: sourceFreshnessValue?.normalizedFingerprint ?? null,
      normalizedDecisionPayload: previewRecord(
        sourceFreshnessValue?.normalizedDecisionPayload ?? {},
      ),
      reproducedFields: sourceFreshnessValue?.reproducedFields ?? [],
      limitations: sourceFreshnessValue?.limitations ?? [],
      nextAction: sourceFreshnessValue?.nextAction ?? freshness?.nextAction ?? null,
    },
  };
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
    decisionEvidence: buildDecisionEvidenceSummary(rows, now),
    ingestion: buildIngestionSummary(rows.ingestionJobs),
    reviewQueue: buildReviewQueueSummary(rows.reviewItems),
    freshness: buildSourceFreshnessSummary(rows, now),
  };
}

async function loadDataHealthRows(): Promise<DataHealthRows> {
  const db = getOpsDb();

  const institutionRows = await db
    .select({
      id: institutions.id,
      name: institutions.name,
      region: institutions.region,
      domain: institutions.domain,
      logoUrl: institutions.logoUrl,
      programUrl: institutions.programUrl,
      calculatorUrl: institutions.calculatorUrl,
      universityId: institutions.universityId,
    })
    .from(institutions);
  const programRows = await db
    .select({
      id: programs.id,
      name: programs.name,
      institutionName: programs.institutionName,
      institutionId: programs.institutionId,
      type: programs.type,
      category: programs.category,
      admissionType: programs.admissionType,
    })
    .from(programs);
  const programInstitutionRows = await db
    .select({
      programId: programInstitutions.programId,
      institutionId: programInstitutions.institutionId,
    })
    .from(programInstitutions);
  const admissionRequirementRows = await db
    .select({
      id: admissionRequirements.id,
      programId: admissionRequirements.programId,
      institutionId: admissionRequirements.institutionId,
    })
    .from(admissionRequirements);
  const admissionThresholdRows = await db
    .select({
      id: admissionThresholds.id,
      programId: admissionThresholds.programId,
      institutionId: admissionThresholds.institutionId,
      universityId: admissionThresholds.universityId,
      thresholdValue: admissionThresholds.thresholdValue,
    })
    .from(admissionThresholds);
  const sourceUrlRows = await db
    .select({
      id: sourceUrls.id,
      admissionRequirementId: sourceUrls.admissionRequirementId,
      programId: sourceUrls.programId,
      institutionId: sourceUrls.institutionId,
      url: sourceUrls.url,
    })
    .from(sourceUrls);
  const calculatorConfigRows = await db
    .select({
      institutionId: universityCalculatorConfigs.institutionId,
      formulaType: universityCalculatorConfigs.formulaType,
      psyWeight: universityCalculatorConfigs.psyWeight,
      bagrutWeight: universityCalculatorConfigs.bagrutWeight,
      minPsychometric: universityCalculatorConfigs.minPsychometric,
      minBagrut: universityCalculatorConfigs.minBagrut,
      scaleDescription: universityCalculatorConfigs.scaleDescription,
    })
    .from(universityCalculatorConfigs);
  const ingestionSourceRows = await db
    .select({
      id: ingestionSources.id,
      institutionId: ingestionSources.institutionId,
      programId: ingestionSources.programId,
      difficulty: ingestionSources.difficulty,
      sourceUrl: ingestionSources.sourceUrl,
    })
    .from(ingestionSources);
  const admissionsSourceCandidateRows = await db
    .select({
      id: admissionsSourceCandidates.id,
      admissionRequirementId: admissionsSourceCandidates.admissionRequirementId,
      programId: admissionsSourceCandidates.programId,
      institutionId: admissionsSourceCandidates.institutionId,
      origin: admissionsSourceCandidates.origin,
      specificity: admissionsSourceCandidates.specificity,
      confidence: admissionsSourceCandidates.confidence,
    })
    .from(admissionsSourceCandidates);
  const admissionFactRows = await db
    .select({
      id: admissionFacts.id,
      admissionRequirementId: admissionFacts.admissionRequirementId,
      programId: admissionFacts.programId,
      institutionId: admissionFacts.institutionId,
      kind: admissionFacts.kind,
      field: admissionFacts.field,
      confidence: admissionFacts.confidence,
    })
    .from(admissionFacts);
  const admissionAlternativePathRows = await db
    .select({
      id: admissionAlternativePaths.id,
      admissionRequirementId: admissionAlternativePaths.admissionRequirementId,
      programId: admissionAlternativePaths.programId,
      institutionId: admissionAlternativePaths.institutionId,
      kind: admissionAlternativePaths.kind,
    })
    .from(admissionAlternativePaths);
  const ingestionJobRows = await db
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
    .from(ingestionJobs);
  const reviewItemRows = await db
    .select({
      id: reviewItems.id,
      payloadId: reviewItems.payloadId,
      admissionRequirementId: reviewItems.admissionRequirementId,
      targetField: reviewItems.targetField,
      status: reviewItems.status,
      createdAt: reviewItems.createdAt,
      reviewedAt: reviewItems.reviewedAt,
    })
    .from(reviewItems);
  const sourceFreshnessStateRows = await db
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
      rawFingerprint: sourceFreshnessStates.rawFingerprint,
      normalizedFingerprint: sourceFreshnessStates.normalizedFingerprint,
      normalizedDecisionPayload: sourceFreshnessStates.normalizedDecisionPayload,
      latestReviewItemId: sourceFreshnessStates.latestReviewItemId,
      nextAction: sourceFreshnessStates.nextAction,
      createdAt: sourceFreshnessStates.createdAt,
      updatedAt: sourceFreshnessStates.updatedAt,
    })
    .from(sourceFreshnessStates);

  return {
    institutions: institutionRows,
    programs: programRows,
    programInstitutions: programInstitutionRows,
    admissionRequirements: admissionRequirementRows,
    admissionThresholds: admissionThresholdRows,
    sourceUrls: sourceUrlRows,
    universityCalculatorConfigs: calculatorConfigRows,
    ingestionSources: ingestionSourceRows,
    admissionsSourceCandidates: admissionsSourceCandidateRows,
    admissionFacts: admissionFactRows,
    admissionAlternativePaths: admissionAlternativePathRows,
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

function buildDecisionEvidenceSummary(
  rows: DataHealthRows,
  now: Date,
): DataHealthReadyReport['decisionEvidence'] {
  const catalogueInstitutions = buildCapabilityInstitutions(rows);
  const institutionById = new Map(
    catalogueInstitutions.map((institution) => [institution.id, institution]),
  );
  const freshnessStatesBySourceId = new Map(
    rows.sourceFreshnessStates.map((row) => [row.sourceId, row] as const),
  );

  const evidenceRows = buildCapabilityPrograms(rows).flatMap((program) =>
    buildAdmissionsCapabilityMatrix({
      program,
      institutions: catalogueInstitutions,
      freshnessStatesBySourceId,
      now,
    }).map((entry) => {
      const institution = institutionById.get(entry.institutionId as InstitutionId);
      const showOfficialMetadata =
        entry.capability !== 'estimated' &&
        entry.capability !== 'unsupported' &&
        entry.capability !== 'missing';

      return {
        programId: program.id,
        programName: program.name,
        institutionId: entry.institutionId,
        institutionName:
          institution?.name ?? entry.sourceTarget?.institutionName ?? entry.institutionId,
        evidenceMode: entry.capability,
        severity: evidenceSeverity(entry.capability),
        sourceTargetId: showOfficialMetadata ? (entry.sourceTarget?.id ?? null) : null,
        officialSourceUrl: showOfficialMetadata ? (entry.sourceTarget?.officialUrl ?? null) : null,
        adapterId: showOfficialMetadata ? (entry.sourceTarget?.adapterId ?? null) : null,
        externalProgramId: entry.exactTarget?.program.externalId ?? null,
        freshnessStatus:
          showOfficialMetadata && entry.freshnessState
            ? classifySourceFreshnessStatus(entry.freshnessState, now)
            : null,
        blockedReason: showOfficialMetadata
          ? (entry.freshnessState?.blockedReason ?? entry.sourceTarget?.blockedReason ?? null)
          : null,
        requiredInputs: showOfficialMetadata ? (entry.requiredInputs ?? []) : [],
      };
    }),
  );

  return {
    rows: evidenceRows.toSorted(compareAdmissionsEvidenceRows),
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

function buildCapabilityInstitutions(rows: DataHealthRows): CatalogueInstitution[] {
  const configByInstitutionId = new Map(
    rows.universityCalculatorConfigs.map((config) => [config.institutionId, config] as const),
  );

  return rows.institutions.map((institution) => {
    const calculatorConfig = configByInstitutionId.get(institution.id);

    return {
      id: institution.id as InstitutionId,
      name: institution.name,
      region: institution.region,
      domain: institution.domain ?? undefined,
      logoUrl: institution.logoUrl ?? undefined,
      programUrl: institution.programUrl ?? undefined,
      calculatorUrl: institution.calculatorUrl ?? undefined,
      universityId: (institution.universityId as UniversityId | null) ?? undefined,
      calculatorConfig: calculatorConfig
        ? {
            formulaType: calculatorConfig.formulaType,
            scaleDescription: calculatorConfig.scaleDescription,
            sekhemWeight:
              calculatorConfig.psyWeight !== null && calculatorConfig.bagrutWeight !== null
                ? {
                    psy: calculatorConfig.psyWeight,
                    bag: calculatorConfig.bagrutWeight,
                  }
                : undefined,
            minPsychometric: calculatorConfig.minPsychometric ?? undefined,
            minBagrut: calculatorConfig.minBagrut ?? undefined,
          }
        : undefined,
    };
  });
}

function buildCapabilityPrograms(rows: DataHealthRows): CatalogueProgram[] {
  const linkedInstitutionIdsByProgramId = new Map<string, string[]>();
  const thresholdsByProgramId = new Map<string, Record<string, number | null>>();

  for (const row of rows.programInstitutions) {
    const existing = linkedInstitutionIdsByProgramId.get(row.programId) ?? [];
    existing.push(row.institutionId);
    linkedInstitutionIdsByProgramId.set(row.programId, existing);
  }

  for (const row of rows.admissionThresholds) {
    const existing = thresholdsByProgramId.get(row.programId) ?? {};
    existing[row.institutionId] = row.thresholdValue;
    thresholdsByProgramId.set(row.programId, existing);
  }

  return rows.programs.map((program) => ({
    id: program.id,
    name: program.name,
    institution: program.institutionName,
    institutionId: (program.institutionId as InstitutionId | null) ?? undefined,
    type: program.type as CatalogueProgram['type'],
    category: program.category,
    profileScore: {
      AN: 0,
      TE: 0,
      CR: 0,
      SO: 0,
      LE: 0,
      OR: 0,
      DI: 0,
      ER: 0,
    },
    admissionType: program.admissionType,
    admissionRequirements: [],
    thresholds: thresholdsByProgramId.get(program.id) as CatalogueProgram['thresholds'],
    linkedInstitutionIds: linkedInstitutionIdsByProgramId.get(program.id) ?? [],
  }));
}

function evidenceSeverity(
  capability: AdmissionsEvaluationCapability,
): AdmissionsEvidenceRow['severity'] {
  if (capability === 'blocked' || capability === 'stale') {
    return 'attention';
  }

  if (capability === 'missing' || capability === 'unsupported') {
    return 'informational';
  }

  return 'normal';
}

function compareAdmissionsEvidenceRows(
  left: AdmissionsEvidenceRow,
  right: AdmissionsEvidenceRow,
): number {
  const severity =
    evidenceSeverityPriority(left.severity) - evidenceSeverityPriority(right.severity);
  if (severity !== 0) {
    return severity;
  }

  const institution = left.institutionName.localeCompare(right.institutionName, 'en');
  if (institution !== 0) {
    return institution;
  }

  return left.programName.localeCompare(right.programName, 'en');
}

function evidenceSeverityPriority(severity: AdmissionsEvidenceRow['severity']): number {
  switch (severity) {
    case 'attention':
      return 0;
    case 'normal':
      return 1;
    case 'informational':
      return 2;
    default:
      return 3;
  }
}

function sourceIdFromReviewItem(reviewItem: ReviewItemDetailRow): string | null {
  if (reviewItem.targetField !== 'sourceFreshness') {
    return null;
  }

  const parsed = parseSourceFreshnessProposedValue(reviewItem.proposedValue);
  return parsed.ok ? parsed.value.sourceId : null;
}

function approveBlockedReason(
  reviewItem: ReviewItemDetailRow,
  sourceFreshnessValue: SourceFreshnessProposedValue | null,
  freshness: ReviewItemDetailFreshnessRow | null,
): string | null {
  if (reviewItem.status !== 'pending') {
    return 'Review item has already been resolved.';
  }

  if (reviewItem.targetField !== 'sourceFreshness') {
    return `Approval is not supported for target field "${reviewItem.targetField}".`;
  }

  if (!sourceFreshnessValue) {
    return 'Source freshness proposed value is invalid.';
  }

  if (freshness?.latestReviewItemId !== reviewItem.id) {
    return 'Source freshness state no longer points at this review item.';
  }

  return null;
}

function previewRecord(record: Record<string, unknown>): Array<{ key: string; value: string }> {
  return Object.entries(record)
    .slice(0, 8)
    .map(([key, value]) => ({
      key,
      value: previewValue(value),
    }));
}

function previewValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.slice(0, 140);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null || value === undefined) {
    return 'null';
  }

  return JSON.stringify(value).slice(0, 140);
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
