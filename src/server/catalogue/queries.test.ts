import { beforeEach, describe, expect, it, vi } from 'vitest';

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

var mockEnv = {
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
} from '@/server/catalogue/queries';

describe('catalogue queries', () => {
  beforeEach(() => {
    mockEnv = {
      mode: 'static',
      hasDatabaseUrl: false,
      isProduction: false,
    };
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

  it('fails closed in database mode when DATABASE_URL is missing', async () => {
    mockEnv.mode = 'database';

    await expect(listCataloguePrograms()).rejects.toMatchObject<CatalogueQueryError>({
      code: 'CATALOGUE_DATABASE_CONFIG_MISSING',
      meta: {
        catalogueSourceMode: 'database',
        catalogueSource: 'database',
      },
    });
  });

  it('treats the seeded calculator coverage as part of catalogue readiness', () => {
    const readiness = evaluateCatalogueReadiness({
      institutions: [{ id: 'tau' }, { id: 'huji' }, { id: 'technion' }, { id: 'bgu' }],
      programs: [
        { id: 'program_1', admissionType: 'sekhem' },
        { id: 'program_2', admissionType: 'requirements' },
      ],
      programInstitutions: [
        { programId: 'program_1', institutionId: 'tau' },
        { programId: 'program_2', institutionId: 'huji' },
      ],
      admissionThresholds: [{ programId: 'program_1', universityId: 'tau', thresholdValue: 650 }],
      universityCalculatorConfigs: [
        { institutionId: 'tau' },
        { institutionId: 'huji' },
        { institutionId: 'technion' },
        { institutionId: 'bgu' },
      ],
    });

    expect(readiness).toEqual({
      isReady: true,
      issues: [],
    });
  });

  it('blocks readiness when calculator configs are missing', () => {
    const readiness = evaluateCatalogueReadiness({
      institutions: [{ id: 'tau' }, { id: 'huji' }, { id: 'technion' }, { id: 'bgu' }],
      programs: [{ id: 'program_1', admissionType: 'sekhem' }],
      programInstitutions: [{ programId: 'program_1', institutionId: 'tau' }],
      admissionThresholds: [{ programId: 'program_1', universityId: 'tau', thresholdValue: 650 }],
      universityCalculatorConfigs: [{ institutionId: 'huji' }],
    });

    expect(readiness.isReady).toBe(false);
    expect(readiness.issues).toContain('Institutions missing calculator configs: tau, technion, bgu');
  });
});
