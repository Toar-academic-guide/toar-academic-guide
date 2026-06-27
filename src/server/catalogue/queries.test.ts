import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UNIVERSITIES } from '@/data/degreesData';
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

const hoistedMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getStaticCataloguePrograms: vi.fn(() => [
    {
      id: 'static_program',
      name: 'תוכנית סטטית',
      institution: 'אוניברסיטת בדיקה',
      type: 'academic',
      category: 'בדיקה',
      riasecScore: { R: 1, I: 1, A: 1, S: 1, E: 1, C: 1 },
      admissionType: 'requirements',
      admissionRequirements: [],
      linkedInstitutionIds: ['tau'],
    },
  ]),
  getStaticCatalogueInstitutions: vi.fn(() => [
    {
      id: 'tau',
      name: 'אוניברסיטת תל אביב',
      region: 'center',
    },
  ]),
}));

let mockEnv = {
  mode: 'static' as 'auto' | 'database' | 'static',
  hasDatabaseUrl: false,
  isProduction: false,
};

vi.mock('server-only', () => ({}));

vi.mock('@/env', () => ({
  getCatalogueSourceMode: () => mockEnv.mode,
  hasDatabaseUrl: () => mockEnv.hasDatabaseUrl,
  isProductionRuntime: () => mockEnv.isProduction,
}));

vi.mock('@/db/client', () => ({
  getDb: hoistedMocks.getDb,
}));

vi.mock('@/lib/catalogueStatic', () => ({
  getStaticCataloguePrograms: hoistedMocks.getStaticCataloguePrograms,
  getStaticCatalogueInstitutions: hoistedMocks.getStaticCatalogueInstitutions,
}));

import {
  CatalogueQueryError,
  evaluateCatalogueReadiness,
  listCataloguePrograms,
  resetDatabaseCatalogueSnapshotCache,
} from '@/server/catalogue/queries';

function createMockDb(dataset: {
  admissionAlternativePaths?: unknown[];
  admissionFacts?: unknown[];
  admissionRequirements?: unknown[];
  admissionThresholds?: unknown[];
  admissionsSourceCandidates?: unknown[];
  institutions?: unknown[];
  programInstitutions?: unknown[];
  programs?: unknown[];
  sourceUrls?: unknown[];
  universityCalculatorConfigs?: unknown[];
}) {
  const tableRows = new Map<object, unknown[]>([
    [institutions, dataset.institutions ?? []],
    [universityCalculatorConfigs, dataset.universityCalculatorConfigs ?? []],
    [programs, dataset.programs ?? []],
    [programInstitutions, dataset.programInstitutions ?? []],
    [admissionRequirements, dataset.admissionRequirements ?? []],
    [admissionThresholds, dataset.admissionThresholds ?? []],
    [sourceUrls, dataset.sourceUrls ?? []],
    [admissionsSourceCandidates, dataset.admissionsSourceCandidates ?? []],
    [admissionFacts, dataset.admissionFacts ?? []],
    [admissionAlternativePaths, dataset.admissionAlternativePaths ?? []],
  ]);

  const from = vi.fn((table: object) => ({
    then(resolve: (rows: unknown[]) => unknown) {
      return Promise.resolve(resolve(tableRows.get(table) ?? []));
    },
    where: vi.fn().mockResolvedValue(tableRows.get(table) ?? []),
  }));

  return {
    db: {
      select: vi.fn(() => ({
        from,
      })),
    },
    from,
  };
}

function createDatabaseBackedDataset() {
  return {
    institutions: [
      {
        id: 'tau',
        name: 'TAU',
        region: 'center',
        domain: null,
        logoUrl: null,
        programUrl: null,
        calculatorUrl: null,
        universityId: 'tau',
      },
    ],
    universityCalculatorConfigs: [
      ...UNIVERSITIES.map((university) => ({
        institutionId: university.id,
        formulaType: 'weighted_scaled',
        scaleDescription: 'Weighted scale',
        psyWeight: 0.5,
        bagrutWeight: 0.5,
        minPsychometric: null,
        minBagrut: null,
      })),
    ],
    programs: [
      {
        id: 'computer_science',
        name: 'Computer Science',
        institutionName: 'TAU',
        institutionId: 'tau',
        type: 'academic',
        category: 'Engineering',
        admissionType: 'requirements',
        riasecR: 1,
        riasecI: 1,
        riasecA: 1,
        riasecS: 1,
        riasecE: 1,
        riasecC: 1,
        isTauEngineering: false,
      },
    ],
    programInstitutions: [{ programId: 'computer_science', institutionId: 'tau' }],
    admissionRequirements: [],
    admissionThresholds: [],
    sourceUrls: [],
    admissionsSourceCandidates: [],
    admissionFacts: [],
    admissionAlternativePaths: [],
  };
}

describe('catalogue queries', () => {
  const universityInstitutionRows = UNIVERSITIES.map((university) => ({ id: university.id }));
  const universityConfigRows = UNIVERSITIES.map((university) => ({ institutionId: university.id }));

  beforeEach(() => {
    mockEnv = {
      mode: 'static',
      hasDatabaseUrl: false,
      isProduction: false,
    };
    vi.useRealTimers();
    resetDatabaseCatalogueSnapshotCache();
    hoistedMocks.getDb.mockReset();
    hoistedMocks.getStaticCataloguePrograms.mockClear();
    hoistedMocks.getStaticCatalogueInstitutions.mockClear();
  });

  it('serves static catalogue data when source mode is static', async () => {
    const result = await listCataloguePrograms();

    expect(result.data).toEqual(hoistedMocks.getStaticCataloguePrograms.mock.results[0]?.value);
    expect(result.meta).toEqual({
      catalogueSourceMode: 'static',
      catalogueSource: 'static',
    });
    expect(hoistedMocks.getDb).not.toHaveBeenCalled();
  });

  it('falls back to static data in auto mode for local environments without DATABASE_URL', async () => {
    mockEnv.mode = 'auto';

    const result = await listCataloguePrograms();

    expect(result.data).toEqual(hoistedMocks.getStaticCataloguePrograms.mock.results[0]?.value);
    expect(result.meta).toEqual({
      catalogueSourceMode: 'auto',
      catalogueSource: 'static',
      fallbackReason: 'DATABASE_URL is not configured.',
    });
  });

  it('falls back to static data in auto mode when the production database is unavailable', async () => {
    mockEnv.mode = 'auto';
    mockEnv.hasDatabaseUrl = true;
    mockEnv.isProduction = true;
    hoistedMocks.getDb.mockImplementation(() => {
      throw new Error('database offline');
    });

    const result = await listCataloguePrograms();

    expect(result.data).toEqual(hoistedMocks.getStaticCataloguePrograms.mock.results[0]?.value);
    expect(result.meta).toEqual({
      catalogueSourceMode: 'auto',
      catalogueSource: 'static',
      fallbackReason: 'Unable to load catalogue from the database.',
    });
  });

  it('fails closed in database mode when DATABASE_URL is missing', async () => {
    mockEnv.mode = 'database';

    await expect(listCataloguePrograms()).rejects.toMatchObject({
      code: 'CATALOGUE_DATABASE_CONFIG_MISSING',
      meta: {
        catalogueSourceMode: 'database',
        catalogueSource: 'database',
      },
    });
  });

  it('treats the seeded calculator coverage as part of catalogue readiness', () => {
    const readiness = evaluateCatalogueReadiness({
      institutions: universityInstitutionRows,
      programs: [
        { id: 'program_1', admissionType: 'sekhem' },
        { id: 'program_2', admissionType: 'requirements' },
      ],
      programInstitutions: [
        { programId: 'program_1', institutionId: 'tau' },
        { programId: 'program_2', institutionId: 'huji' },
      ],
      admissionThresholds: [{ programId: 'program_1', universityId: 'tau', thresholdValue: 650 }],
      universityCalculatorConfigs: universityConfigRows,
    });

    expect(readiness).toEqual({
      isReady: true,
      issues: [],
    });
  });

  it('does not require thresholds for requirements-only programmes', () => {
    const readiness = evaluateCatalogueReadiness({
      institutions: universityInstitutionRows,
      programs: [{ id: 'haifa_cs', admissionType: 'requirements' }],
      programInstitutions: [{ programId: 'haifa_cs', institutionId: 'haifa' }],
      admissionThresholds: [],
      universityCalculatorConfigs: universityConfigRows,
    });

    expect(readiness).toEqual({
      isReady: true,
      issues: [],
    });
  });

  it('blocks readiness when calculator configs are missing', () => {
    const missingInstitutionIds = ['tau', 'technion', 'bgu', 'haifa', 'biu', 'ariel'];
    const readiness = evaluateCatalogueReadiness({
      institutions: universityInstitutionRows,
      programs: [{ id: 'program_1', admissionType: 'sekhem' }],
      programInstitutions: [{ programId: 'program_1', institutionId: 'tau' }],
      admissionThresholds: [{ programId: 'program_1', universityId: 'tau', thresholdValue: 650 }],
      universityCalculatorConfigs: [{ institutionId: 'huji' }],
    });

    expect(readiness.isReady).toBe(false);
    expect(readiness.issues).toContain(
      `Institutions missing calculator configs: ${missingInstitutionIds.join(', ')}`,
    );
  });

  it('records cache misses on the first database-backed catalogue read', async () => {
    mockEnv.mode = 'database';
    mockEnv.hasDatabaseUrl = true;

    const { db } = createMockDb(createDatabaseBackedDataset());

    hoistedMocks.getDb.mockReturnValue(db);

    const result = await listCataloguePrograms();

    expect(result.meta.catalogueSourceMode).toBe('database');
    expect(result.meta.catalogueSource).toBe('database');
    expect(result.meta.catalogueSnapshotCacheStatus).toBe('miss');
  });

  it('reuses the cached snapshot for repeated database-backed reads within the TTL', async () => {
    mockEnv.mode = 'database';
    mockEnv.hasDatabaseUrl = true;

    const { db } = createMockDb(createDatabaseBackedDataset());

    hoistedMocks.getDb.mockReturnValue(db);

    const firstResult = await listCataloguePrograms();
    const secondResult = await listCataloguePrograms();

    expect(firstResult.meta.catalogueSnapshotCacheStatus).toBe('miss');
    expect(secondResult.meta.catalogueSnapshotCacheStatus).toBe('hit');
    expect(hoistedMocks.getDb).toHaveBeenCalledTimes(1);
  });

  it('reloads the snapshot after the TTL expires', async () => {
    mockEnv.mode = 'database';
    mockEnv.hasDatabaseUrl = true;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T00:00:00Z'));

    const { db } = createMockDb(createDatabaseBackedDataset());

    hoistedMocks.getDb.mockReturnValue(db);

    await listCataloguePrograms();
    vi.setSystemTime(new Date('2026-06-23T00:01:01Z'));
    const secondResult = await listCataloguePrograms();

    expect(secondResult.meta.catalogueSnapshotCacheStatus).toBe('miss');
    expect(hoistedMocks.getDb).toHaveBeenCalledTimes(2);
  });
});
