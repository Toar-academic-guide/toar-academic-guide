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

    constructor(code: string, message: string, options?: {
      details?: string[];
      meta?: Record<string, unknown>;
      status?: number;
    }) {
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
});
