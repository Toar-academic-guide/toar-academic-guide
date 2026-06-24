import 'server-only';

import { eq, inArray } from 'drizzle-orm';

import { UNIVERSITIES } from '@/data/degreesData';
import { getDb } from '@/db/client';
import {
  admissionRequirements,
  admissionThresholds,
  institutions,
  programInstitutions,
  programs,
  sourceUrls,
  universityCalculatorConfigs,
} from '@/db/schema';
import type {
  AdmissionRequirementRow,
  AdmissionThresholdRow,
  InstitutionRow,
  ProgramInstitutionRow,
  ProgramRow,
  SourceUrlRow,
  UniversityCalculatorConfigRow,
} from '@/db/types';
import { getCatalogueSourceMode, hasDatabaseUrl, isProductionRuntime } from '@/env';
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
}

export interface CatalogueReadinessSnapshot {
  institutions: Pick<InstitutionRow, 'id'>[];
  programs: Pick<ProgramRow, 'id' | 'admissionType'>[];
  programInstitutions: Pick<ProgramInstitutionRow, 'programId' | 'institutionId'>[];
  admissionThresholds: Pick<AdmissionThresholdRow, 'programId' | 'universityId' | 'thresholdValue'>[];
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
  inFlight: Promise<DatabaseSnapshotLoadResult> | null;
  snapshot: DatabaseCatalogueSnapshot | null;
}

const DATABASE_CATALOGUE_SNAPSHOT_TTL_MS = 60_000;

// This cache is intentionally process-local. It reduces duplicate snapshot
// rebuilds on one server instance, but it is not a distributed freshness layer.
const databaseCatalogueSnapshotCache: DatabaseCatalogueSnapshotCache = {
  expiresAt: 0,
  inFlight: null,
  snapshot: null,
};

function createMeta(
  catalogueSourceMode: CatalogueSourceMode,
  catalogueSource: CatalogueSource,
  fallbackReason?: string,
  cacheStatus?: CatalogueSnapshotCacheStatus
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
    }
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
  snapshot: CatalogueReadinessSnapshot
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
      }`
    );
  }

  const sekhemProgramIds = snapshot.programs
    .filter((program) => program.admissionType === 'sekhem')
    .map((program) => program.id);
  const thresholdProgramIds = new Set(snapshot.admissionThresholds.map((row) => row.programId));
  const sekhemProgramsMissingThresholds = sekhemProgramIds.filter(
    (programId) => !thresholdProgramIds.has(programId)
  );

  if (sekhemProgramsMissingThresholds.length > 0) {
    issues.push(
      `Sekhem programs missing thresholds: ${sekhemProgramsMissingThresholds.slice(0, 5).join(', ')}${
        sekhemProgramsMissingThresholds.length > 5 ? '…' : ''
      }`
    );
  }

  const requiredCalculatorInstitutionIds = new Set(
    snapshot.admissionThresholds
      .filter((row) => row.thresholdValue !== null)
      .map((row) => row.universityId)
  );
  for (const university of UNIVERSITIES) {
    requiredCalculatorInstitutionIds.add(university.id);
  }

  const availableCalculatorInstitutionIds = new Set(
    snapshot.universityCalculatorConfigs.map((row) => row.institutionId)
  );
  const missingCalculatorInstitutionIds = [...requiredCalculatorInstitutionIds].filter(
    (institutionId) => !availableCalculatorInstitutionIds.has(institutionId)
  );

  if (missingCalculatorInstitutionIds.length > 0) {
    issues.push(
      `Institutions missing calculator configs: ${missingCalculatorInstitutionIds.join(', ')}`
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
              institutionRows.map((row) => row.id)
            )
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

  return {
    institutions: institutionRows,
    universityCalculatorConfigs: calculatorConfigRows,
    programs: programRows,
    programInstitutions: relationRows,
    admissionRequirements: requirementRows,
    admissionThresholds: thresholdRows,
    sourceUrls: sourceRows,
  };
}

async function loadDatabaseCatalogueSnapshotWithCache(): Promise<DatabaseSnapshotLoadResult> {
  const now = Date.now();

  if (
    databaseCatalogueSnapshotCache.snapshot &&
    databaseCatalogueSnapshotCache.expiresAt > now
  ) {
    return {
      cacheStatus: 'hit',
      snapshot: databaseCatalogueSnapshotCache.snapshot,
    };
  }

  if (databaseCatalogueSnapshotCache.inFlight) {
    return databaseCatalogueSnapshotCache.inFlight;
  }

  const refreshPromise = (async () => {
    const snapshot = await loadDatabaseCatalogueSnapshot();
    databaseCatalogueSnapshotCache.snapshot = snapshot;
    databaseCatalogueSnapshotCache.expiresAt = Date.now() + DATABASE_CATALOGUE_SNAPSHOT_TTL_MS;

    return {
      cacheStatus: 'miss' as const,
      snapshot,
    };
  })();

  databaseCatalogueSnapshotCache.inFlight = refreshPromise;

  try {
    return await refreshPromise;
  } finally {
    databaseCatalogueSnapshotCache.inFlight = null;
  }
}

async function loadDatabaseCatalogueOrThrow(
  mode: CatalogueSourceMode
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
      }
    );
  }
}

function canUseStaticFallback(mode: CatalogueSourceMode): boolean {
  return mode === 'auto' && !isProductionRuntime();
}

function buildReadinessError(
  mode: CatalogueSourceMode,
  readiness: CatalogueReadinessResult
): CatalogueQueryError {
  return new CatalogueQueryError(
    'CATALOGUE_DATABASE_NOT_READY',
    'Catalogue database is not ready for runtime traffic.',
    {
      details: readiness.issues,
      meta: createMeta(mode, 'database'),
    }
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
      }
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

export async function listCatalogueInstitutions(): Promise<CatalogueQueryResult<CatalogueInstitution[]>> {
  const resolution = await resolveCatalogueSource();

  if (resolution.source === 'static') {
    return {
      data: getStaticCatalogueInstitutions(),
      meta: resolution.meta,
    };
  }

  const calculatorConfigsByInstitutionId = new Map(
    resolution.snapshot!.universityCalculatorConfigs.map((row) => [row.institutionId, row])
  );

  return {
    data: resolution.snapshot!.institutions.map((row) =>
      serializeInstitutionRow(row, calculatorConfigsByInstitutionId.get(row.id))
    ),
    meta: resolution.meta,
  };
}

export async function listCataloguePrograms(): Promise<CatalogueQueryResult<CatalogueProgram[]>> {
  const resolution = await resolveCatalogueSource();

  if (resolution.source === 'static') {
    return {
      data: getStaticCataloguePrograms(),
      meta: resolution.meta,
    };
  }

  const institutionIds = [
    ...new Set(resolution.snapshot!.programInstitutions.map((row) => row.institutionId)),
  ];
  const institutionRows =
    institutionIds.length === 0
      ? []
      : resolution.snapshot!.institutions.filter((row) => institutionIds.includes(row.id));
  const institutionsById = new Map(institutionRows.map((row) => [row.id, row]));

  return {
    data: resolution.snapshot!.programs.map((programRow) =>
      serializeProgramRow({
        program: programRow,
        relations: resolution.snapshot!.programInstitutions.filter(
          (row) => row.programId === programRow.id
        ),
        requirements: resolution.snapshot!.admissionRequirements.filter(
          (row) => row.programId === programRow.id
        ),
        thresholds: resolution.snapshot!.admissionThresholds.filter(
          (row) => row.programId === programRow.id
        ),
        sourceUrls: resolution.snapshot!.sourceUrls.filter((row) => row.programId === programRow.id),
        institutionsById,
      })
    ),
    meta: resolution.meta,
  };
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
