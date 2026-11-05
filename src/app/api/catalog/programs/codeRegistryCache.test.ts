import { beforeEach, expect, it, vi } from 'vitest';
import { UNIVERSITIES } from '@/data/degreesData';
import {
  institutions,
  programInstitutions,
  programs,
  universityCalculatorConfigs,
} from '@/db/schema';

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/db/client', () => ({ getDb: mocks.getDb }));
vi.mock('@/env', () => ({
  getCatalogueSourceMode: () => 'database',
  hasDatabaseUrl: () => true,
  isProductionRuntime: () => true,
}));

import { GET } from './route';
import { resetDatabaseCatalogueSnapshotCache } from '@/server/catalogue/queries';

beforeEach(() => {
  resetDatabaseCatalogueSnapshotCache();
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

it('CDN-caches a database snapshot merged with deployment code-registry programmes', async () => {
  const rows = new Map<object, unknown[]>([
    [institutions, [{ id: 'tau', name: 'TAU', region: 'center' }]],
    [
      universityCalculatorConfigs,
      UNIVERSITIES.map(({ id }) => ({
        institutionId: id,
        formulaType: 'weighted_scaled',
      })),
    ],
    [
      programs,
      [
        {
          id: 'database_program',
          name: 'Database programme',
          type: 'academic',
          category: 'Engineering',
          admissionType: 'requirements',
          institutionId: 'tau',
          riasecR: 1,
          riasecI: 1,
          riasecA: 1,
          riasecS: 1,
          riasecE: 1,
          riasecC: 1,
        },
      ],
    ],
    [programInstitutions, [{ programId: 'database_program', institutionId: 'tau' }]],
  ]);
  mocks.getDb.mockReturnValue({
    select: () => ({
      from: (table: object) => {
        const result = Promise.resolve(rows.get(table) ?? []);
        return Object.assign(result, { where: () => result });
      },
    }),
  });

  const response = await GET();
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.meta.catalogueSource).toBe('database');
  expect(body.meta.fallbackReason).toBeUndefined();
  expect(body.data[0].id).toBe('database_program');
  expect(body.data.some((program: { id: string }) => program.id === 'haifa_engineering')).toBe(
    true,
  );
  expect(body.data.length).toBeGreaterThan(1);
  expect(response.headers.get('cache-control')).toBe(
    'public, s-maxage=120, stale-while-revalidate=600',
  );
});
