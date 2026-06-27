import 'server-only';

import { getOpsDb } from '@/db/opsClient';
import { buildAdmissionsCapabilityMatrix } from '@/server/admissions/capabilityMatrix';
import type { AdmissionsEvaluationCapability } from '@/types/admissionsEvaluation';
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
  publicAdmissions: {
    totalPairs: number;
    unclassifiedCount: number;
    degradedRuntimeCount: number;
    totalsByCapability: Partial<Record<AdmissionsEvaluationCapability, number>>;
    rows: PublicAdmissionsCapabilitySummary[];
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
    thresholdKind: 'sekhem' | 'direct_psychometric';
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

interface PublicAdmissionsCapabilitySummary {
  programId: string;
  programName: string;
  institutionId: string;
  institutionName: string;
  capability: AdmissionsEvaluationCapability;
  sourceId: string | null;
  reason: string | null;
}

export async function getDataHealthReport(now = new Date()): Promise<DataHealthReport> {
  try {
    const rows = await loadDataHealthRows();
    return summarizeDataHealthRows(rows, now);
  } catch {
    return {
      status: 'unavailable',
      message: 'Operational data health is not configured.',
    };
  }
}

export function summarizeDataHealthRows(
  rows: DataHealthRows,
  now = new Date()
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
    publicAdmissions: buildPublicAdmissionsSummary(rows, now),
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
    db
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
      .from(institutions),
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
        thresholdKind: admissionThresholds.thresholdKind,
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
        formulaType: universityCalculatorConfigs.formulaType,
        psyWeight: universityCalculatorConfigs.psyWeight,
        bagrutWeight: universityCalculatorConfigs.bagrutWeight,
        minPsychometric: universityCalculatorConfigs.minPsychometric,
        minBagrut: universityCalculatorConfigs.minBagrut,
        scaleDescription: universityCalculatorConfigs.scaleDescription,
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

function buildPublicAdmissionsSummary(
  rows: DataHealthRows,
  now: Date
): DataHealthReadyReport['publicAdmissions'] {
  const calculatorConfigByInstitutionId = new Map(
    rows.universityCalculatorConfigs.map((row) => [row.institutionId, row])
  );
  const allInstitutions = rows.institutions.map((row) => ({
    id: row.id,
    name: row.name,
    region: row.region,
    ...(row.domain ? { domain: row.domain } : {}),
    ...(row.logoUrl ? { logoUrl: row.logoUrl } : {}),
    ...(row.programUrl ? { programUrl: row.programUrl } : {}),
    ...(row.calculatorUrl ? { calculatorUrl: row.calculatorUrl } : {}),
    ...(row.universityId ? { universityId: row.universityId } : {}),
    ...(calculatorConfigByInstitutionId.has(row.id)
      ? { calculatorConfig: toCatalogueCalculatorConfig(calculatorConfigByInstitutionId.get(row.id)!) }
      : {}),
  }));

  const freshnessStatesBySourceId = new Map(
    rows.sourceFreshnessStates.map((row) => [row.sourceId, row])
  );

  const capabilityRows = rows.programs.flatMap((programRow) => {
    const linkedInstitutionIds = rows.programInstitutions
      .filter((relation) => relation.programId === programRow.id)
      .map((relation) => relation.institutionId);
    const thresholds = rows.admissionThresholds.filter((threshold) => threshold.programId === programRow.id);
    const thresholdMap: Record<string, number | null> = {};
    const directPsychometricMap: Record<string, number> = {};

    for (const threshold of thresholds) {
      if (threshold.thresholdKind === 'sekhem') {
        thresholdMap[threshold.universityId] = threshold.thresholdValue;
      } else if (threshold.thresholdValue !== null) {
        directPsychometricMap[threshold.universityId] = threshold.thresholdValue;
      }
    }

    const capabilityEntries = buildAdmissionsCapabilityMatrix({
      program: {
        id: programRow.id,
        name: programRow.name,
        institution: 'Unknown institution',
        type: 'academic',
        category: 'unknown',
        profileScore: ZERO_PROFILE_SCORE,
        admissionType: programRow.admissionType,
        admissionRequirements: [],
        linkedInstitutionIds,
        ...(Object.keys(thresholdMap).length > 0 ? { thresholds: thresholdMap } : {}),
        ...(Object.keys(directPsychometricMap).length > 0
          ? { directPsychometric: directPsychometricMap }
          : {}),
      },
      institutions: allInstitutions,
      freshnessStatesBySourceId,
      now,
    });

    return capabilityEntries.map((entry) => {
      const institution = allInstitutions.find((row) => row.id === entry.institutionId);

      return {
        programId: programRow.id,
        programName: programRow.name,
        institutionId: entry.institutionId,
        institutionName: institution?.name ?? entry.institutionId,
        capability: entry.capability,
        sourceId: entry.exactTarget?.targetId ?? entry.sourceTarget?.id ?? null,
        reason: describePublicAdmissionsCapability(entry),
      };
    });
  });

  return {
    totalPairs: rows.programInstitutions.length,
    unclassifiedCount: Math.max(rows.programInstitutions.length - capabilityRows.length, 0),
    degradedRuntimeCount: capabilityRows.filter((row) => row.capability === 'stale').length,
    totalsByCapability: countBy(capabilityRows, (row) => row.capability),
    rows: capabilityRows.toSorted(comparePublicAdmissionsRows).slice(0, ISSUE_LIMIT),
  };
}

function buildCoverageSummary(rows: DataHealthRows): DataHealthReadyReport['coverage'] {
  const sourceRequirementIds = new Set(rows.sourceUrls.map((row) => row.admissionRequirementId));
  const sourceProgramIds = new Set(rows.sourceUrls.map((row) => row.programId));
  const relationByProgramId = new Map(
    rows.programInstitutions.map((row) => [row.programId, row.institutionId])
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

function buildIngestionSummary(
  rows: IngestionJobRow[]
): DataHealthReadyReport['ingestion'] {
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

function buildReviewQueueSummary(
  rows: ReviewItemRow[]
): DataHealthReadyReport['reviewQueue'] {
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
  now: Date
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
  now: Date
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
  now: Date
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
  right: SourceFreshnessSummary
): number {
  const priority =
    freshnessStatusPriority(left.status) - freshnessStatusPriority(right.status);
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

const ZERO_PROFILE_SCORE = {
  AN: 0,
  TE: 0,
  CR: 0,
  SO: 0,
  LE: 0,
  OR: 0,
  DI: 0,
  ER: 0,
} as const;

function toCatalogueCalculatorConfig(row: DataHealthRows['universityCalculatorConfigs'][number]) {
  return {
    formulaType: row.formulaType,
    scaleDescription: row.scaleDescription,
    ...(row.psyWeight !== null && row.bagrutWeight !== null
      ? {
          sekhemWeight: {
            psy: row.psyWeight,
            bag: row.bagrutWeight,
          },
        }
      : {}),
    ...(row.minPsychometric !== null ? { minPsychometric: row.minPsychometric } : {}),
    ...(row.minBagrut !== null ? { minBagrut: row.minBagrut } : {}),
  };
}

function describePublicAdmissionsCapability(
  row: ReturnType<typeof buildAdmissionsCapabilityMatrix>[number]
): string | null {
  switch (row.capability) {
    case 'exact':
      return 'Verified exact official-source mapping is ready for public evaluation.';
    case 'estimated':
      return 'Reviewed local formula and threshold support an estimate only.';
    case 'score_only':
      return 'Official source is score-only, so public output stays estimated.';
    case 'blocked':
      return row.sourceTarget?.blockedReason ?? 'Official source requires a blocked browser or manual lane.';
    case 'stale':
      return row.freshnessState?.latestFailureReason ?? 'Exact source freshness is stale or failed.';
    case 'missing':
      return 'No reviewed source or formula coverage exists for this linked pair.';
    case 'needs_input':
      return 'Exact source requires extra psychometric subscores before public evaluation.';
    case 'unsupported':
      return row.sourceTarget?.limitations[0] ?? 'Linked pair is not mapped for supported public evaluation.';
  }
}

function comparePublicAdmissionsRows(
  left: PublicAdmissionsCapabilitySummary,
  right: PublicAdmissionsCapabilitySummary
): number {
  const priority = capabilityPriority(left.capability) - capabilityPriority(right.capability);
  if (priority !== 0) {
    return priority;
  }

  return (
    left.programId.localeCompare(right.programId) ||
    left.institutionId.localeCompare(right.institutionId)
  );
}

function capabilityPriority(capability: AdmissionsEvaluationCapability): number {
  const priorities: Record<AdmissionsEvaluationCapability, number> = {
    stale: 0,
    blocked: 1,
    missing: 2,
    unsupported: 3,
    needs_input: 4,
    score_only: 5,
    estimated: 6,
    exact: 7,
  };

  return priorities[capability];
}

function countBy<T, K extends string>(rows: T[], getKey: (row: T) => K): Record<K, number> {
  return rows.reduce<Record<K, number>>((counts, row) => {
    const key = getKey(row);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {} as Record<K, number>);
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
