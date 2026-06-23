import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogueApiError, fetchCataloguePrograms } from '@/lib/catalogueClient';

describe('catalogueClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fails closed when the catalogue API returns an error payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: {
            code: 'CATALOGUE_DATABASE_NOT_READY',
            message: 'Catalogue database is not ready for runtime traffic.',
            details: ['Institutions missing calculator configs: tau'],
          },
          meta: {
            catalogueSourceMode: 'database',
            catalogueSource: 'database',
          },
        }),
      })
    );

    await expect(fetchCataloguePrograms()).rejects.toMatchObject<CatalogueApiError>({
      code: 'CATALOGUE_DATABASE_NOT_READY',
      message: 'Catalogue database is not ready for runtime traffic.',
      details: ['Institutions missing calculator configs: tau'],
      meta: {
        catalogueSourceMode: 'database',
        catalogueSource: 'database',
      },
    });
  });

  it('ignores additive measurement metadata on successful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ id: 'computer_science', name: 'Computer Science' }],
          meta: {
            catalogueSourceMode: 'database',
            catalogueSource: 'database',
            catalogueSnapshotCacheStatus: 'hit',
            durationMs: 12,
            responseBytes: 256,
            programCount: 1,
          },
        }),
      })
    );

    await expect(fetchCataloguePrograms()).resolves.toEqual([
      { id: 'computer_science', name: 'Computer Science' },
    ]);
  });
});
