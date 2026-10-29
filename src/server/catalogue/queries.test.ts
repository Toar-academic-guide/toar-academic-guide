import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UNIVERSITIES } from '@/data/degreesData';
import reviewedManifest from '@/data/admissions/reviewedManifest.json';
import technionWinterManifest from '@/server/admissions/__fixtures__/technionWinterManifest.json';
import staleTechnionCatalogue from '@/test/fixtures/technionStaleCatalogue.json';
import {
  getPublicProgramPageData,
  getPublicProgramRequirementSources,
} from '@/lib/publicCataloguePages';
import { selectRequirementTiles } from '@/lib/requirementTiles';
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
  evaluateCatalogueReadiness,
  listCataloguePrograms,
  listCatalogueInstitutions,
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

  it('sweep38 delists only BGU law and removes its attached catalogue data', async () => {
    mockEnv = { mode: 'database', hasDatabaseUrl: true, isProduction: true };
    const base = createDatabaseBackedDataset();
    const dataset = {
      ...base,
      institutions: ['tau', 'bgu'].map((id) => ({
        ...base.institutions[0],
        id,
        name: id,
        universityId: id,
      })),
      programs: [{ ...base.programs[0], id: 'law', institutionId: null }],
      programInstitutions: ['tau', 'bgu'].map((institutionId) => ({
        programId: 'law',
        institutionId,
      })),
      admissionRequirements: ['tau', 'bgu'].map((institutionId) => ({
        id: `law:${institutionId}`,
        programId: 'law',
        institutionId,
        admissionRequirements: [institutionId],
        specificAdmissionNotes: [institutionId],
      })),
      admissionThresholds: ['tau', 'bgu'].map((institutionId) => ({
        id: `law:${institutionId}:sekhem`,
        programId: 'law',
        institutionId,
        universityId: institutionId,
        thresholdKind: 'sekhem',
        thresholdValue: 700,
      })),
      sourceUrls: ['tau', 'bgu'].map((institutionId) => ({
        id: `law:${institutionId}:url`,
        programId: 'law',
        institutionId,
        admissionRequirementId: `law:${institutionId}`,
        kind: 'program',
        url: `https://${institutionId}.ac.il/law`,
      })),
      admissionFacts: ['tau', 'bgu'].map((institutionId) => ({
        id: `law:${institutionId}:fact`,
        programId: 'law',
        institutionId,
        admissionRequirementId: `law:${institutionId}`,
        field: 'psychometric',
        kind: 'numeric_gate',
        valueNumber: 700,
      })),
    };
    hoistedMocks.getDb.mockReturnValue(createMockDb(dataset).db);
    const law = (await listCataloguePrograms()).data.find((row) => row.id === 'law')!;
    expect(law.linkedInstitutionIds).toEqual(['tau']);
    expect(law.institutionDetails?.map((row) => row.institutionName)).toEqual(['tau']);
    expect(law.admissionRequirements).toEqual(['tau']);
    expect(law.thresholds).toEqual({ tau: 700 });
    expect(JSON.stringify(law)).not.toContain('bgu');
    expect(law.institutionDetails![0].admissionFacts).toHaveLength(1);
  });

  it.each(['technion_ee', 'technion_me'])(
    'resolves %s winter page data from its published DB row, independently of legacy rows and display notes',
    async (programId) => {
      mockEnv = { mode: 'database', hasDatabaseUrl: true, isProduction: true };
      const changes = technionWinterManifest.changes;
      const change = reviewedManifest.changes.find((item) => item.target.programId === programId)!;
      expect(change.target).toEqual({ programId, institutionId: 'technion', cycle: '2027' });
      const captured = staleTechnionCatalogue.find((item) => item.id === programId)!;
      const base = createDatabaseBackedDataset();
      const thresholdRows = changes.map((item) => ({
        id: `${item.target.programId}:technion:technion:sekhem`,
        programId: item.target.programId,
        institutionId: 'technion',
        universityId: 'technion',
        thresholdKind: 'sekhem',
        thresholdValue: item.before,
      }));
      const dataset = {
        ...base,
        institutions: [
          {
            ...base.institutions[0],
            id: 'technion',
            name: captured.institution,
            universityId: 'technion',
          },
        ],
        programs: changes.map((item) => ({
          ...base.programs[0],
          id: item.target.programId,
          institutionId: 'technion',
          institutionName: captured.institution,
          name: item.target.programId,
          admissionType: 'sekhem',
        })),
        programInstitutions: changes.map((item) => ({
          programId: item.target.programId,
          institutionId: 'technion',
        })),
        admissionThresholds: thresholdRows,
        admissionRequirements: [
          {
            ...captured.institutionDetails[0],
            id: `${programId}:technion`,
            programId,
            institutionId: 'technion',
            admissionRequirements: captured.admissionRequirements,
          },
        ],
      };
      const { db, from } = createMockDb(dataset);
      hoistedMocks.getDb.mockReturnValue(db);

      const before = (await getPublicProgramPageData(programId))!;
      expect(before.program.thresholds?.technion).toBe(change.before);

      // Supply the publication's after-value on this exact row. Leave the
      // legacy alias stale to catch accidentally reading its old cutoff.
      thresholdRows.find((row) => row.programId === programId)!.thresholdValue = change.after;
      resetDatabaseCatalogueSnapshotCache();
      const published = (await getPublicProgramPageData(programId))!;
      expect(published.isGeneral).toBe(false);
      expect(published.program.thresholds?.technion).toBe(programId === 'technion_ee' ? 91.5 : 87);
      const source = (await getPublicProgramRequirementSources(published)).technion;
      expect(source.sourceProgramId).toBe(programId);
      expect(source.program.thresholds?.technion).toBe(change.after);
      // Approved test update, Jorje 2026-10-28
      expect(source.requirements).toEqual([
        `בחורף תשפ"ז: סכם ${change.after}`,
        'מתמטיקה: 5 יחידות בציון 70 לפחות; בעלי 4 יחידות או ציון נמוך מ־70 ב־5 יחידות נדרשים לבחינת סיווג במתמטיקה בציון 70 לפחות.',
        'פטור מבחינת הסיווג במתמטיקה: קורס חדו״א א׳ (20406) באוניברסיטה הפתוחה בציון 65 לפחות.',
        '5 יח"ל פיזיקה — חובה',
      ]);
      expect(
        selectRequirementTiles({
          program: source.program,
          institutionId: 'technion',
          requirements: source.requirements,
        }).model,
      ).toBeUndefined();
      expect(from).toHaveBeenCalledWith(admissionThresholds);
      expect(from).toHaveBeenCalledWith(admissionRequirements);
      expect(hoistedMocks.getStaticCataloguePrograms).not.toHaveBeenCalled();
    },
  );

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
    const missingInstitutionIds = [
      'tau',
      'technion',
      'bgu',
      'haifa',
      'biu',
      'ariel',
      'reichman',
      'afeka',
      'hit',
    ];
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

describe('graphic-design identity repairs across the database cutover', () => {
  beforeEach(() => {
    hoistedMocks.getStaticCataloguePrograms.mockClear();
    mockEnv = { mode: 'database', hasDatabaseUrl: true, isProduction: true };
    resetDatabaseCatalogueSnapshotCache();
  });

  it.each(['before', 'during', 'after', 'rolled_back'] as const)(
    'publishes one dance row and one TAU music row %s the packet',
    async (state) => {
      const dataset = createDatabaseBackedDataset();
      const affected = [
        ['jerusalem_academy_graphic_design', 'jerusalem_academy', 'מוזיקה ומחול'],
        ['rubin_graphic_design', 'rubin', 'מוזיקה'],
        ['spieldocs_graphic_design', 'spieldocs', 'קולנוע ותסריטאות'],
        ['samspiegel_documentary', 'spieldocs', 'קולנוע דוקומנטרי'],
        ['rubin_classical', 'rubin', 'מוזיקה קלאסית – ביצוע'],
      ];
      if (state !== 'before')
        affected.push(['jerusalem_academy_dance', 'jerusalem_academy', 'תואר ראשון במחול']);
      dataset.programs = affected.map(([id, institutionId, name]) => ({
        ...dataset.programs[0],
        id,
        institutionId,
        name,
        institutionName:
          institutionId === 'rubin'
            ? 'בית הספר למוזיקה ע"ש בוכמן-מהטה – אוניברסיטת תל אביב'
            : institutionId === 'jerusalem_academy'
              ? 'האקדמיה למוזיקה ולמחול ירושלים'
              : 'בית הספר לקולנוע ולטלוויזיה ע"ש סם שפיגל',
        isListed:
          state === 'rolled_back'
            ? id !== 'jerusalem_academy_dance'
            : state !== 'after' || !id.endsWith('graphic_design'),
      }));
      dataset.programInstitutions = dataset.programs.map((p) => ({
        programId: p.id,
        institutionId: p.institutionId,
      }));
      const { db } = createMockDb(dataset);
      hoistedMocks.getDb.mockReturnValue(db);
      const result = await listCataloguePrograms();
      expect(result.meta.catalogueSource).toBe('database');
      expect(result.data.map((p) => p.id).sort()).toEqual([
        'jerusalem_academy_dance',
        'rubin_classical',
      ]);
      expect(result.data.find((p) => p.id === 'jerusalem_academy_dance')).toMatchObject({
        name: 'תואר ראשון במחול',
        isListed: true,
        awardedCredential: 'B.Dance',
        institutionDetails: [expect.objectContaining({ durationYears: 4 })],
      });
      expect(result.data.find((p) => p.id === 'rubin_classical')).toMatchObject({
        name: 'תואר ראשון במוזיקה',
        awardedCredential: 'B.Mus.',
        institutionDetails: [expect.objectContaining({ durationYears: 4 })],
      });
      expect(hoistedMocks.getStaticCataloguePrograms).not.toHaveBeenCalled();
    },
  );
});

it('lists one canonical Braude institution for all persisted aliases without mutating raw rows', async () => {
  mockEnv = { mode: 'database', hasDatabaseUrl: true, isProduction: true };
  resetDatabaseCatalogueSnapshotCache();
  const dataset = createDatabaseBackedDataset();
  dataset.institutions.push({
    ...dataset.institutions[0],
    id: 'ort_braude',
    name: 'בראודה',
    universityId: 'ort_braude',
  });
  const { db } = createMockDb(dataset);
  hoistedMocks.getDb.mockReturnValue(db);
  const { data, meta } = await listCatalogueInstitutions();
  expect(meta.catalogueSource).toBe('database');
  expect(data.find((i) => i.id === 'braude')).toMatchObject({
    id: 'braude',
    name: 'המכללה האקדמית להנדסה אורט בראודה',
    region: 'north',
    domain: 'braude.ac.il',
  });
  expect(
    data.filter((i) => ['braude', 'ort_braude', 'mon_12220708942'].includes(i.id)),
  ).toHaveLength(1);
  expect(data.find((i) => i.id === 'ort_braude')).toBeUndefined();
  expect(dataset.institutions.find((i) => i.id === 'ort_braude')?.name).toBe('בראודה');
  expect(dataset.institutions.some((i) => i.id === 'braude')).toBe(false);
});

it('lists Braude once when the database contains both aliases and the canonical Monday stub', async () => {
  mockEnv = { mode: 'database', hasDatabaseUrl: true, isProduction: true };
  resetDatabaseCatalogueSnapshotCache();
  const base = createDatabaseBackedDataset();
  const dataset = {
    ...base,
    institutions: [
      ...base.institutions,
      ...['ort_braude', 'mon_12220708942', 'braude'].map((id) => ({
        ...base.institutions[0],
        id,
        name: 'המכללה האקדמית להנדסה בראודה',
        domain: 'w3.braude.ac.il',
        programUrl: 'https://w3.braude.ac.il/department/mechina/',
        logoUrl: 'https://braude.ac.il/existing-logo.png',
      })),
    ],
  };
  hoistedMocks.getDb.mockReturnValue(createMockDb(dataset).db);
  const result = await listCatalogueInstitutions();
  const rows = result.data.filter((row) =>
    ['ort_braude', 'mon_12220708942', 'braude'].includes(row.id),
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    id: 'braude',
    name: 'המכללה האקדמית להנדסה אורט בראודה',
    region: 'north',
    domain: 'braude.ac.il',
    programUrl: 'https://www.braude.ac.il',
    logoUrl: 'https://braude.ac.il/existing-logo.png',
  });
  expect(dataset.institutions.filter((row) => row.domain === 'w3.braude.ac.il')).toHaveLength(3);
});
