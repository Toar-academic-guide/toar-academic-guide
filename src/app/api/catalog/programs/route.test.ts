import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoistedMocks = vi.hoisted(() => ({
  listCataloguePrograms: vi.fn(),
}));

vi.mock('@/server/catalogue/queries', () => ({
  CatalogueQueryError: class CatalogueQueryError extends Error {
    code: string;
    details: string[];
    meta?: Record<string, unknown>;
    status: number;

    constructor(
      code: string,
      message: string,
      options?: {
        details?: string[];
        meta?: Record<string, unknown>;
        status?: number;
      },
    ) {
      super(message);
      this.code = code;
      this.details = options?.details ?? [];
      this.meta = options?.meta;
      this.status = options?.status ?? 503;
    }
  },
  listCataloguePrograms: hoistedMocks.listCataloguePrograms,
}));

import { GET } from './route';
import { getStaticCataloguePrograms } from '@/lib/catalogueStatic';
import { CatalogueQueryError } from '@/server/catalogue/queries';
import type { CatalogueProgram } from '@/types/catalogue';

vi.mock('server-only', () => ({}));

describe('catalogue programs route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    hoistedMocks.listCataloguePrograms.mockReset();
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('adds measurement metadata to successful responses', async () => {
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: [{ id: 'computer_science', name: 'Computer Science' }],
      meta: {
        catalogueSourceMode: 'database',
        catalogueSource: 'database',
        catalogueSnapshotCacheStatus: 'miss',
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta).toMatchObject({
      catalogueSourceMode: 'database',
      catalogueSource: 'database',
      catalogueSnapshotCacheStatus: 'miss',
      programCount: 1,
    });
    expect(body.meta.durationMs).toEqual(expect.any(Number));
    expect(body.meta.responseBytes).toBe(Buffer.byteLength(JSON.stringify(body)));
  });

  it('requests Batch C fallback and measures exactly the programme list returned by the query', async () => {
    const haifaEngineering = getStaticCataloguePrograms().find(
      (program) => program.id === 'haifa_engineering',
    )!;
    const queryPrograms = [
      { id: 'computer_science', name: 'DB Computer Science' },
      haifaEngineering,
    ];
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: queryPrograms,
      meta: { catalogueSourceMode: 'database', catalogueSource: 'database', programCount: 1 },
    });

    const response = await GET();
    const body = await response.json();
    const programs = body.data as CatalogueProgram[];

    expect(response.status).toBe(200);
    expect(hoistedMocks.listCataloguePrograms).toHaveBeenCalledExactlyOnceWith({
      includeBatchCCodeFallback: true,
    });
    expect(programs).toEqual(queryPrograms);
    expect(programs.filter((program) => program.id === 'haifa_engineering')).toEqual([
      haifaEngineering,
    ]);
    expect(programs.some((program) => program.id === 'tau_datascience')).toBe(false);
    expect(programs.some((program) => program.id === 'not_a_real_programme_xyz')).toBe(false);
    expect(body.meta).toMatchObject({ catalogueSource: 'database', programCount: programs.length });
    expect(body.meta.responseBytes).toBe(Buffer.byteLength(JSON.stringify(body)));
  });

  it('keeps an existing Batch C DB row unchanged and in order without a duplicate', async () => {
    const haifaEngineering = getStaticCataloguePrograms().find(
      (program) => program.id === 'haifa_engineering',
    )!;
    const databasePrograms = [
      { ...haifaEngineering, id: 'database_only' },
      { ...haifaEngineering, name: 'DB engineering', updatedAt: '2026-10-29' },
    ];
    hoistedMocks.listCataloguePrograms.mockResolvedValue({
      data: databasePrograms,
      meta: { catalogueSourceMode: 'database', catalogueSource: 'database' },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(hoistedMocks.listCataloguePrograms).toHaveBeenCalledExactlyOnceWith({
      includeBatchCCodeFallback: true,
    });
    expect(body.data).toEqual(databasePrograms);
    expect(
      body.data.filter((program: CatalogueProgram) => program.id === haifaEngineering.id),
    ).toEqual([databasePrograms[1]]);
    expect(body.meta.programCount).toBe(body.data.length);
  });

  it('preserves catalogue query errors without returning fallback data', async () => {
    hoistedMocks.listCataloguePrograms.mockRejectedValue(
      new CatalogueQueryError('CATALOGUE_UNAVAILABLE', 'DB unavailable', {
        details: ['query failed'],
        meta: { catalogueSourceMode: 'database' },
        status: 503,
      }),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(hoistedMocks.listCataloguePrograms).toHaveBeenCalledExactlyOnceWith({
      includeBatchCCodeFallback: true,
    });
    expect(body.error).toEqual({
      code: 'CATALOGUE_UNAVAILABLE',
      message: 'DB unavailable',
      details: ['query failed'],
    });
    expect(body.data).toBeUndefined();
    expect(body.meta.programCount).toBeUndefined();
  });

  it('preserves unexpected errors without returning fallback data', async () => {
    hoistedMocks.listCataloguePrograms.mockRejectedValue(new Error('Unexpected failure'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(hoistedMocks.listCataloguePrograms).toHaveBeenCalledExactlyOnceWith({
      includeBatchCCodeFallback: true,
    });
    expect(body.error).toEqual({
      code: 'CATALOGUE_PROGRAMS_INTERNAL_ERROR',
      message: 'Unexpected failure',
    });
    expect(body.data).toBeUndefined();
  });
});
