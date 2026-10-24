vi.mock('server-only', () => ({}));
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { execute, transaction, getDb } = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn(),
  getDb: vi.fn(),
}));
vi.mock('@/db/client', () => ({ getDb }));
import { saveEnquiryBackup } from './repository';
import { PgDialect } from 'drizzle-orm/pg-core';

const enquiry = {
  requestId: 'b783a6d4-0428-4ddd-827f-82d33251be52',
  name: 'בדיקת MyWay',
  phone: '0501234567',
  programId: 'bgu_cs',
  institutionId: 'bgu',
  programName: 'מדעי המחשב',
  institutionName: 'בן גוריון',
  sourcePath: '/#inquiry',
  consent: true as const,
  resultStatus: 'accepted' as const,
  bagrut: 105.5,
  psychometric: 680,
  evaluationInput: {
    degreeId: 'bgu_cs',
    bagrut: 105.5,
    psychometric: 680,
    extraInputs: { bguBagrutAverage: 112.75, psychometricMath: 135 },
  },
  attribution: {
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: 'fall_2026',
    referrer: 'https://example.com/article',
  },
  createdAt: new Date('2026-10-24T12:00:00Z'),
};
describe('private enquiry backup', () => {
  beforeEach(() => {
    execute.mockReset().mockResolvedValue({ rows: [] });
    transaction.mockReset().mockImplementation((fn) => fn({ execute }));
    getDb.mockReturnValue({ transaction });
  });
  it('stores the full consented lead through a parameterized insert-only function with a bounded transaction', async () => {
    await saveEnquiryBackup(enquiry);
    const queries = execute.mock.calls.map(([query]) => new PgDialect().sqlToQuery(query));
    expect(queries[0].sql).toMatch(/statement_timeout/);
    expect(queries[1].sql).toContain('public.store_enquiry');
    const payload = JSON.parse(queries[1].params[0] as string);
    expect(payload).toMatchObject({ ...enquiry, createdAt: '2026-10-24T12:00:00.000Z' });
    expect(payload.bagrut).toBe(105.5);
    expect(payload.psychometric).toBe(680);
    expect(payload.evaluationInput).toEqual(enquiry.evaluationInput);
    expect(payload).not.toHaveProperty('bagrut_band');
    expect(payload).not.toHaveProperty('psychometric_band');
    expect(payload.consentText).toContain('MyWay');
    expect(queries[1].sql).not.toContain(enquiry.phone);
  });
  it('propagates missing-table failure to the independent delivery coordinator', async () => {
    execute.mockRejectedValue(new Error('42P01'));
    await expect(saveEnquiryBackup(enquiry)).rejects.toThrow('42P01');
  });
});
