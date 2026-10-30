import 'server-only';
import { after } from 'next/server';

import { withCanonicalInstitutionAliases } from '@/data/institutionAliases';

import { eq, inArray } from 'drizzle-orm';

import { UNIVERSITIES } from '@/data/degreesData';
import { RETIRED_PROGRAM_IDS } from '@/data/admissions/catalogueContentRepair';
import { getDb } from '@/db/client';
import {
  admissionAlternativePaths,
  admissionFacts,
  admissionRequirements,
  admissionThresholds,
  admissionsSourceCandidates,
  institutions,
  programInstitutions,
  programs,
  sourceUrls,
  universityCalculatorConfigs,
} from '@/db/schema';
import type {
  AdmissionAlternativePathRow,
  AdmissionFactRow,
  AdmissionRequirementRow,
  AdmissionThresholdRow,
  AdmissionsSourceCandidateRow,
  InstitutionRow,
  ProgramInstitutionRow,
  ProgramRow,
  SourceUrlRow,
  UniversityCalculatorConfigRow,
} from '@/db/types';
import { getCatalogueSourceMode, hasDatabaseUrl, isProductionRuntime } from '@/env';
import { withBatchCCatalogueFallback } from '@/lib/admissionsEvaluationProgram';
import { getStaticCatalogueInstitutions, getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import type {
  ApiMetaPayload,
  CatalogueInstitution,
  CatalogueProgram,
  CatalogueSource,
  CatalogueSnapshotCacheStatus,
  CatalogueSourceMode,
} from '@/types/catalogue';
import { serializeInstitutionRow, serializeProgramRow } from './serializers';

export interface CatalogueQueryResult<T> {
  data: T;
  meta: ApiMetaPayload;
  cacheable?: boolean;
}

export interface CatalogueReadinessSnapshot {
  institutions: Pick<InstitutionRow, 'id'>[];
  programs: Pick<ProgramRow, 'id' | 'admissionType'>[];
  programInstitutions: Pick<ProgramInstitutionRow, 'programId' | 'institutionId'>[];
  admissionThresholds: Pick<
    AdmissionThresholdRow,
    'programId' | 'universityId' | 'thresholdValue'
  >[];
  universityCalculatorConfigs: Pick<UniversityCalculatorConfigRow, 'institutionId'>[];
}

export interface CatalogueReadinessResult {
  isReady: boolean;
  issues: string[];
}

interface DatabaseCatalogueSnapshot extends CatalogueReadinessSnapshot {
  institutions: InstitutionRow[];
  programs: ProgramRow[];
  programInstitutions: ProgramInstitutionRow[];
  admissionRequirements: AdmissionRequirementRow[];
  admissionThresholds: AdmissionThresholdRow[];
  sourceUrls: SourceUrlRow[];
  admissionsSourceCandidates: AdmissionsSourceCandidateRow[];
  admissionFacts: AdmissionFactRow[];
  admissionAlternativePaths: AdmissionAlternativePathRow[];
  universityCalculatorConfigs: UniversityCalculatorConfigRow[];
}

interface DatabaseSnapshotLoadResult {
  cacheStatus: CatalogueSnapshotCacheStatus;
  snapshot: DatabaseCatalogueSnapshot;
}

interface CatalogueSourceResolution {
  source: CatalogueSource;
  meta: ApiMetaPayload;
  snapshot?: DatabaseCatalogueSnapshot;
}

interface DatabaseCatalogueSnapshotCache {
  expiresAt: number;
  loadedAt: number;
  inFlight: Promise<DatabaseSnapshotLoadResult> | null;
  snapshot: DatabaseCatalogueSnapshot | null;
}

const DATABASE_CATALOGUE_SNAPSHOT_TTL_MS = 5 * 60_000;
const DATABASE_CATALOGUE_SNAPSHOT_MAX_AGE_MS = 30 * 60_000;

// This cache is intentionally process-local. It reduces duplicate snapshot
// rebuilds on one server instance, but it is not a distributed freshness layer.
const databaseCatalogueSnapshotCache: DatabaseCatalogueSnapshotCache = {
  expiresAt: 0,
  loadedAt: 0,
  inFlight: null,
  snapshot: null,
};

function createMeta(
  catalogueSourceMode: CatalogueSourceMode,
  catalogueSource: CatalogueSource,
  fallbackReason?: string,
  cacheStatus?: CatalogueSnapshotCacheStatus,
): ApiMetaPayload {
  return {
    catalogueSourceMode,
    catalogueSource,
    ...(cacheStatus ? { catalogueSnapshotCacheStatus: cacheStatus } : {}),
    ...(fallbackReason ? { fallbackReason } : {}),
  };
}

export function resetDatabaseCatalogueSnapshotCache() {
  databaseCatalogueSnapshotCache.expiresAt = 0;
  databaseCatalogueSnapshotCache.loadedAt = 0;
  databaseCatalogueSnapshotCache.inFlight = null;
  databaseCatalogueSnapshotCache.snapshot = null;
}

export class CatalogueQueryError extends Error {
  code: string;
  details: string[];
  meta?: ApiMetaPayload;
  status: number;

  constructor(
    code: string,
    message: string,
    options?: {
      cause?: unknown;
      details?: string[];
      meta?: ApiMetaPayload;
      status?: number;
    },
  ) {
    super(message);
    this.name = 'CatalogueQueryError';
    this.code = code;
    this.cause = options?.cause;
    this.details = options?.details ?? [];
    this.meta = options?.meta;
    this.status = options?.status ?? 503;
  }
}

export function evaluateCatalogueReadiness(
  snapshot: CatalogueReadinessSnapshot,
): CatalogueReadinessResult {
  const issues: string[] = [];

  if (snapshot.institutions.length === 0) {
    issues.push('No catalogue institutions are seeded.');
  }

  if (snapshot.programs.length === 0) {
    issues.push('No catalogue programs are seeded.');
  }

  const linkedProgramIds = new Set(snapshot.programInstitutions.map((row) => row.programId));
  const programsMissingLinks = snapshot.programs
    .filter((program) => !linkedProgramIds.has(program.id))
    .map((program) => program.id);

  if (programsMissingLinks.length > 0) {
    issues.push(
      `Programs missing institution links: ${programsMissingLinks.slice(0, 5).join(', ')}${
        programsMissingLinks.length > 5 ? '…' : ''
      }`,
    );
  }

  const sekhemProgramIds = snapshot.programs
    .filter((program) => program.admissionType === 'sekhem')
    .map((program) => program.id);
  const thresholdProgramIds = new Set(snapshot.admissionThresholds.map((row) => row.programId));
  const sekhemProgramsMissingThresholds = sekhemProgramIds.filter(
    (programId) => !thresholdProgramIds.has(programId),
  );

  if (sekhemProgramsMissingThresholds.length > 0) {
    issues.push(
      `Sekhem programs missing thresholds: ${sekhemProgramsMissingThresholds.slice(0, 5).join(', ')}${
        sekhemProgramsMissingThresholds.length > 5 ? '…' : ''
      }`,
    );
  }

  const requiredCalculatorInstitutionIds = new Set(
    snapshot.admissionThresholds
      .filter((row) => row.thresholdValue !== null)
      .map((row) => row.universityId),
  );
  for (const university of UNIVERSITIES) {
    requiredCalculatorInstitutionIds.add(university.id);
  }

  const availableCalculatorInstitutionIds = new Set(
    snapshot.universityCalculatorConfigs.map((row) => row.institutionId),
  );
  const missingCalculatorInstitutionIds = [...requiredCalculatorInstitutionIds].filter(
    (institutionId) => !availableCalculatorInstitutionIds.has(institutionId),
  );

  if (missingCalculatorInstitutionIds.length > 0) {
    issues.push(
      `Institutions missing calculator configs: ${missingCalculatorInstitutionIds.join(', ')}`,
    );
  }

  return {
    isReady: issues.length === 0,
    issues,
  };
}

async function loadDatabaseCatalogueSnapshot(): Promise<DatabaseCatalogueSnapshot> {
  const db = getDb();
  const institutionRows = await db.select().from(institutions);
  const calculatorConfigRows =
    institutionRows.length === 0
      ? []
      : await db
          .select()
          .from(universityCalculatorConfigs)
          .where(
            inArray(
              universityCalculatorConfigs.institutionId,
              institutionRows.map((row) => row.id),
            ),
          );
  const programRows = await db.select().from(programs);

  if (programRows.length === 0) {
    return {
      institutions: institutionRows,
      universityCalculatorConfigs: calculatorConfigRows,
      programs: [],
      programInstitutions: [],
      admissionRequirements: [],
      admissionThresholds: [],
      sourceUrls: [],
      admissionsSourceCandidates: [],
      admissionFacts: [],
      admissionAlternativePaths: [],
    };
  }

  const programIds = programRows.map((row) => row.id);
  const relationRows = await db
    .select()
    .from(programInstitutions)
    .where(inArray(programInstitutions.programId, programIds));
  const requirementRows = await db
    .select()
    .from(admissionRequirements)
    .where(inArray(admissionRequirements.programId, programIds));
  const thresholdRows = await db
    .select()
    .from(admissionThresholds)
    .where(inArray(admissionThresholds.programId, programIds));
  const sourceRows = await db
    .select()
    .from(sourceUrls)
    .where(inArray(sourceUrls.programId, programIds));
  const sourceCandidateRows = await db
    .select()
    .from(admissionsSourceCandidates)
    .where(inArray(admissionsSourceCandidates.programId, programIds));
  const admissionFactRows = await db
    .select()
    .from(admissionFacts)
    .where(inArray(admissionFacts.programId, programIds));
  const alternativePathRows = await db
    .select()
    .from(admissionAlternativePaths)
    .where(inArray(admissionAlternativePaths.programId, programIds));

  return {
    institutions: institutionRows,
    universityCalculatorConfigs: calculatorConfigRows,
    programs: programRows,
    programInstitutions: relationRows,
    admissionRequirements: requirementRows,
    admissionThresholds: thresholdRows,
    sourceUrls: sourceRows,
    admissionsSourceCandidates: sourceCandidateRows,
    admissionFacts: admissionFactRows,
    admissionAlternativePaths: alternativePathRows,
  };
}

async function loadDatabaseCatalogueSnapshotWithCache(): Promise<DatabaseSnapshotLoadResult> {
  const now = Date.now();

  if (databaseCatalogueSnapshotCache.snapshot && databaseCatalogueSnapshotCache.expiresAt > now) {
    return {
      cacheStatus: 'hit',
      snapshot: databaseCatalogueSnapshotCache.snapshot,
    };
  }

  const staleSnapshot = databaseCatalogueSnapshotCache.snapshot;
  const canServeStale =
    staleSnapshot &&
    now - databaseCatalogueSnapshotCache.loadedAt < DATABASE_CATALOGUE_SNAPSHOT_MAX_AGE_MS;
  let refreshPromise = databaseCatalogueSnapshotCache.inFlight;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const snapshot = await loadDatabaseCatalogueSnapshot();
      const readiness = evaluateCatalogueReadiness(snapshot);
      // Never overwrite the last good DB snapshot with degraded/fallback data.
      if (readiness.isReady) {
        databaseCatalogueSnapshotCache.snapshot = snapshot;
        databaseCatalogueSnapshotCache.loadedAt = Date.now();
        databaseCatalogueSnapshotCache.expiresAt = Date.now() + DATABASE_CATALOGUE_SNAPSHOT_TTL_MS;
      } else if (canServeStale) {
        throw buildReadinessError(getCatalogueSourceMode(), readiness);
      }
      return { cacheStatus: 'miss' as const, snapshot };
    })().finally(() => {
      databaseCatalogueSnapshotCache.inFlight = null;
    });
    databaseCatalogueSnapshotCache.inFlight = refreshPromise;
    if (canServeStale) {
      const background = refreshPromise.catch(() => undefined);
      try {
        after(() => background.then(() => {}));
      } catch {
        /* Scripts/tests have no request scope; the refresh is already running. */
      }
    }
  }
  if (canServeStale) return { cacheStatus: 'stale', snapshot: staleSnapshot };
  return refreshPromise;
}

async function loadDatabaseCatalogueOrThrow(
  mode: CatalogueSourceMode,
): Promise<DatabaseSnapshotLoadResult> {
  try {
    return await loadDatabaseCatalogueSnapshotWithCache();
  } catch (error) {
    throw new CatalogueQueryError(
      'CATALOGUE_DATABASE_UNAVAILABLE',
      'Unable to load catalogue from the database.',
      {
        cause: error,
        meta: createMeta(mode, 'database'),
      },
    );
  }
}

function canUseStaticFallback(mode: CatalogueSourceMode): boolean {
  return mode === 'auto' && !isProductionRuntime();
}

function buildReadinessError(
  mode: CatalogueSourceMode,
  readiness: CatalogueReadinessResult,
): CatalogueQueryError {
  return new CatalogueQueryError(
    'CATALOGUE_DATABASE_NOT_READY',
    'Catalogue database is not ready for runtime traffic.',
    {
      details: readiness.issues,
      meta: createMeta(mode, 'database'),
    },
  );
}

async function resolveCatalogueSource(): Promise<CatalogueSourceResolution> {
  const mode = getCatalogueSourceMode();

  if (mode === 'static') {
    return {
      source: 'static',
      meta: createMeta(mode, 'static'),
    };
  }

  if (!hasDatabaseUrl()) {
    if (canUseStaticFallback(mode)) {
      return {
        source: 'static',
        meta: createMeta(mode, 'static', 'DATABASE_URL is not configured.'),
      };
    }

    throw new CatalogueQueryError(
      'CATALOGUE_DATABASE_CONFIG_MISSING',
      'DATABASE_URL is required for database-backed catalogue mode.',
      {
        details: ['Set DATABASE_URL or switch CATALOGUE_SOURCE_MODE to static for local fallback.'],
        meta: createMeta(mode, 'database'),
      },
    );
  }

  try {
    const { cacheStatus, snapshot } = await loadDatabaseCatalogueOrThrow(mode);
    const readiness = evaluateCatalogueReadiness(snapshot);

    if (!readiness.isReady) {
      if (canUseStaticFallback(mode)) {
        return {
          source: 'static',
          meta: createMeta(mode, 'static', readiness.issues[0]),
        };
      }

      throw buildReadinessError(mode, readiness);
    }

    return {
      source: 'database',
      meta: createMeta(mode, 'database', undefined, cacheStatus),
      snapshot,
    };
  } catch (error) {
    if (error instanceof CatalogueQueryError && canUseStaticFallback(mode)) {
      return {
        source: 'static',
        meta: createMeta(mode, 'static', error.details[0] ?? error.message),
      };
    }

    throw error;
  }
}

export async function listCatalogueInstitutions(): Promise<
  CatalogueQueryResult<CatalogueInstitution[]>
> {
  const resolution = await resolveCatalogueSource();

  if (resolution.source === 'static') {
    return {
      data: getStaticCatalogueInstitutions(),
      meta: resolution.meta,
    };
  }

  const calculatorConfigsByInstitutionId = new Map(
    resolution.snapshot!.universityCalculatorConfigs.map((row) => [row.institutionId, row]),
  );

  return {
    data: withCanonicalInstitutionAliases(
      resolution.snapshot!.institutions.map((row) =>
        serializeInstitutionRow(row, calculatorConfigsByInstitutionId.get(row.id)),
      ),
    ),
    meta: resolution.meta,
  };
}

// BGU has no law degree; preserve the shared programme for other institutions.
function isListedProgramInstitution(row: { programId: string; institutionId: string }): boolean {
  return row.programId !== 'law' || row.institutionId !== 'bgu';
}

export async function listCataloguePrograms(options?: {
  includeBatchCCodeFallback?: boolean;
}): Promise<CatalogueQueryResult<CatalogueProgram[]>> {
  const resolution = await resolveCatalogueSource();

  if (resolution.source === 'static') {
    const data = getStaticCataloguePrograms();
    return {
      data: options?.includeBatchCCodeFallback ? withBatchCCatalogueFallback(data) : data,
      meta: resolution.meta,
    };
  }

  const snapshot = resolution.snapshot!;
  const institutionIds = [...new Set(snapshot.programInstitutions.map((row) => row.institutionId))];
  const institutionRows =
    institutionIds.length === 0
      ? []
      : snapshot.institutions.filter((row) => institutionIds.includes(row.id));
  const institutionsById = new Map(institutionRows.map((row) => [row.id, row]));
  const hasListedDance = snapshot.programs.some(
    (program) => program.id === 'jerusalem_academy_dance' && program.isListed !== false,
  );

  const result = {
    data: snapshot.programs
      .filter((row) => {
        // Rollback preserves the allocated ID as an archive for saved references.
        if (row.id === 'jerusalem_academy_dance' && row.isListed === false) return false;
        if (!RETIRED_PROGRAM_IDS.includes(row.id)) return true;
        // Until the packet is applied, serialize the original dance row under
        // its corrected ID. Once present, the persisted canonical row owns it.
        return row.id === 'jerusalem_academy_graphic_design' && !hasListedDance;
      })
      .map((programRow) =>
        serializeProgramRow({
          program: programRow,
          relations: snapshot.programInstitutions.filter(
            (row) => row.programId === programRow.id && isListedProgramInstitution(row),
          ),
          requirements: snapshot.admissionRequirements.filter(
            (row) => row.programId === programRow.id && isListedProgramInstitution(row),
          ),
          thresholds: snapshot.admissionThresholds.filter(
            (row) => row.programId === programRow.id && isListedProgramInstitution(row),
          ),
          sourceUrls: snapshot.sourceUrls.filter(
            (row) => row.programId === programRow.id && isListedProgramInstitution(row),
          ),
          admissionsSourceCandidates: snapshot.admissionsSourceCandidates.filter(
            (row) => row.programId === programRow.id && isListedProgramInstitution(row),
          ),
          admissionFacts: snapshot.admissionFacts.filter(
            (row) => row.programId === programRow.id && isListedProgramInstitution(row),
          ),
          admissionAlternativePaths: snapshot.admissionAlternativePaths.filter(
            (row) => row.programId === programRow.id && isListedProgramInstitution(row),
          ),
          institutionsById,
        }),
      ),
    meta: resolution.meta,
  };

  if (!options?.includeBatchCCodeFallback) return result;
  const data = withBatchCCatalogueFallback(result.data);
  return { ...result, data, ...(data.length > result.data.length ? { cacheable: false } : {}) };
}

export async function getRequirementIdsForProgram(programId: string): Promise<string[]> {
  if (!hasDatabaseUrl()) {
    return [];
  }

  const db = getDb();
  const rows = await db
    .select({ id: admissionRequirements.id })
    .from(admissionRequirements)
    .where(eq(admissionRequirements.programId, programId));

  return rows.map((row) => row.id);
}
