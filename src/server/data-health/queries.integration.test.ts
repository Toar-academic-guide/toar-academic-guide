import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getOpsDb } from '@/db/opsClient';
import { getDataHealthReport } from './queries';

const enabled = process.env.DATA_HEALTH_DB_INTEGRATION === '1';
if (enabled && !process.env.OPS_DATABASE_URL) {
  throw new Error('OPS_DATABASE_URL is required when DATA_HEALTH_DB_INTEGRATION=1.');
}

describe.skipIf(!enabled)('data health with the real read-only database role', () => {
  afterAll(async () => {
    await getOpsDb().$client.end();
    globalThis.__toarAcademicGuideOpsDb__ = undefined;
  });

  it('loads the complete dashboard as ops_readonly', async () => {
    const { rows } = await getOpsDb().$client.query('select current_user as role');
    expect(rows[0].role).toBe('ops_readonly');
    const report = await getDataHealthReport();
    expect(report.status).toBe('ready');
  });

  it.each([
    'select notes from public.ingestion_sources limit 0',
    'select proposed_value from public.review_items limit 0',
    'select payload from public.ingestion_payloads limit 0',
    'update public.ingestion_jobs set error_text = null where false',
    'delete from public.review_items where false',
  ])('keeps raw data and writes restricted: %s', async (query) => {
    await expect(getOpsDb().$client.query(query)).rejects.toMatchObject({ code: '42501' });
  });
});
