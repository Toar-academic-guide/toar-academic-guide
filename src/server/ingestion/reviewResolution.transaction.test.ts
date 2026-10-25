import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { getDb } from '@/db/client';
import { reviewItems, sourceFreshnessStates } from '@/db/schema';
import { approveReviewItem, createDrizzleReviewResolutionRepository, rejectReviewItem } from './reviewResolution';

vi.mock('@/db/client', () => ({ getDb: vi.fn(() => { throw new Error('Live DB forbidden'); }) }));

const reviewedAt = new Date('2026-10-25T10:00:00Z');
const id = '0b38bb88-4c4f-4b4a-a74e-18802ff29961';
const sourceId = 'university-engineering-live';
const proposedValue = { sourceId, normalizedFingerprint: 'v2', normalizedDecisionPayload: { minimum: 90 } };

type Row = Record<string, unknown>;

// Execute the actual repository's Drizzle predicates against isolated rows. No SQL is sent anywhere.
function fixture(itemOverrides: Row = {}, stateOverrides: Row = {}) {
  let item: Row = { id, status: 'pending', targetField: 'sourceFreshness', proposedValue, ...itemOverrides };
  let state: Row = { sourceId, status: 'changed_needs_review', latestReviewItemId: id,
    latestFailureReason: 'changed', nextAction: 'review', updatedAt: new Date('2026-10-24'), ...stateOverrides };
  const dialect = new PgDialect();
  const matches = (condition: SQL, row: Row) => {
    const query = dialect.sqlToQuery(condition);
    return [...query.sql.matchAll(/"\w+"\."(\w+)" = \$(\d+)/g)].every(([, column, param]) => {
      const key = column.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      return row[key] === query.params[Number(param) - 1];
    });
  };
  let failStateWrite = false;
  let raceOnItemWrite = false;
  const database = (inTransaction: boolean): unknown => ({
    select: () => ({ from: (table: unknown) => ({ where: (condition: SQL) => {
      const read = () => {
        const row = table === reviewItems ? item : state;
        return matches(condition, row) ? [{ ...row }] : [];
      };
      return { limit: () => ({ then: (resolve: (rows: Row[]) => unknown, reject: (error: unknown) => unknown) => Promise.resolve().then(read).then(resolve, reject),
        for: () => Promise.resolve(read()) }) };
    } }) }),
    update: (table: unknown) => ({ set: (values: Row) => ({ where: (condition: SQL) => {
      let result: Row[] | undefined;
      const write = () => {
        if (result) return result;
        if (table === sourceFreshnessStates && failStateWrite) throw new Error('simulated write failure');
        if (table === reviewItems && raceOnItemWrite) { item.status = 'approved'; raceOnItemWrite = false; }
        const row = table === reviewItems ? item : state;
        result = matches(condition, row) ? [Object.assign(row, values)] : [];
        if (table === sourceFreshnessStates) expect(inTransaction).toBe(true);
        return result;
      };
      return { returning: () => Promise.resolve().then(write),
        then: (resolve: (rows: Row[]) => unknown, reject: (error: unknown) => unknown) => Promise.resolve().then(write).then(resolve, reject) };
    } }) }),
    transaction: vi.fn(async (operation: (tx: unknown) => Promise<unknown>) => {
      const beforeItem = { ...item }; const beforeState = { ...state };
      try { return await operation(database(true)); }
      catch (error) { item = beforeItem; state = beforeState; throw error; }
    }),
  });
  const db = database(false) as Parameters<typeof createDrizzleReviewResolutionRepository>[0];
  return { repository: createDrizzleReviewResolutionRepository(db), db,
    item: () => item, state: () => state,
    failStateWrite: () => { failStateWrite = true; }, raceOnItemWrite: () => { raceOnItemWrite = true; } };
}

describe('review resolution transactions and audit', () => {
  it.each(['approve', 'reject'] as const)('clears a stuck source through %s and logs the committed transition once', async (action) => {
    const f = fixture();
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const resolve = action === 'approve' ? approveReviewItem : rejectReviewItem;
    expect(await resolve(id, { repository: f.repository, reviewedAt, actor: 'admin-id' })).toEqual({ status: action === 'approve' ? 'approved' : 'rejected' });
    expect(f.state()).toMatchObject({ status: 'fresh', latestReviewItemId: null, latestFailureReason: null, nextAction: null, updatedAt: reviewedAt });
    expect(f.item()).toMatchObject({ status: action === 'approve' ? 'approved' : 'rejected', reviewedAt });
    expect(f.db!.transaction).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledExactlyOnceWith({ event: 'admissions_review_item_resolved', action, reviewItemId: id,
      sourceId, actor: 'admin-id', status: action === 'approve' ? 'approved' : 'rejected',
      previousFreshnessStatus: 'changed_needs_review', newFreshnessStatus: 'fresh' });
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each(['approve', 'reject'] as const)('%s leaves a newer review pointer alone', async (action) => {
    const f = fixture({}, { latestReviewItemId: 'newer-review' }); const before = { ...f.state() };
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const result = await (action === 'approve' ? approveReviewItem : rejectReviewItem)(id, { repository: f.repository, reviewedAt, actor: 'admin-id' });
    expect(result.status).toBe(action === 'approve' ? 'stale_review' : 'rejected');
    expect(f.state()).toEqual(before);
    expect(log).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ sourceId, previousFreshnessStatus: 'changed_needs_review', newFreshnessStatus: 'changed_needs_review' }));
  });

  it('returns already_resolved without changing the row for a non-pending rejection', async () => {
    const f = fixture({ status: 'approved' }); const before = { ...f.state() };
    expect(await rejectReviewItem(id, { repository: f.repository, reviewedAt })).toEqual({ status: 'already_resolved', reviewItemStatus: 'approved' });
    expect(f.state()).toEqual(before); expect(f.db!.transaction).not.toHaveBeenCalled();
  });

  it.each([{ targetField: 'programDescription' }, { proposedValue: { sourceId } }])('rejects without touching freshness for an unrelated or malformed item %j', async (overrides) => {
    const f = fixture(overrides); const before = { ...f.state() };
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(await rejectReviewItem(id, { repository: f.repository, reviewedAt, actor: 'admin-id' })).toEqual({ status: 'rejected' });
    expect(f.item()).toMatchObject({ status: 'rejected', reviewedAt }); expect(f.state()).toEqual(before);
    expect(log).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ sourceId: null, previousFreshnessStatus: null, newFreshnessStatus: null }));
  });

  it('rolls rejection back if clearing freshness fails', async () => {
    const f = fixture(); f.failStateWrite();
    await expect(rejectReviewItem(id, { repository: f.repository, reviewedAt })).rejects.toThrow('simulated write failure');
    expect(f.item().status).toBe('pending'); expect(f.state().status).toBe('changed_needs_review');
  });

  it('does not clear freshness if rejection loses the pending-item race', async () => {
    const f = fixture(); f.raceOnItemWrite(); const before = { ...f.state() };
    expect(await rejectReviewItem(id, { repository: f.repository, reviewedAt })).toEqual({ status: 'already_resolved', reviewItemStatus: 'approved' });
    expect(f.state()).toEqual(before);
  });

  it.each([
    [null, 'not_found'],
    [{ status: 'rejected' }, 'already_resolved'],
    [{ targetField: 'other' }, 'unsupported_target'],
    [{ proposedValue: {} }, 'invalid_proposed_value'],
  ] as const)('audits unsuccessful approvals once: %s', async (overrides, status) => {
    const f = fixture(overrides ?? {});
    if (overrides === null) vi.spyOn(f.repository, 'getReviewItem').mockResolvedValue(null);
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect((await approveReviewItem(id, { repository: f.repository, actor: 'operator' })).status).toBe(status);
    expect(log).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ event: 'admissions_review_item_resolved', action: 'approve', reviewItemId: id, actor: 'operator', status, previousFreshnessStatus: null, newFreshnessStatus: null }));
  });

  it('audits a rolled-back approval without claiming a committed transition', async () => {
    const f = fixture(); f.failStateWrite();
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect(await approveReviewItem(id, { repository: f.repository, actor: 'operator' })).toEqual({ status: 'publication_failed' });
    expect(f.item().status).toBe('pending'); expect(f.state().status).toBe('changed_needs_review');
    expect(log).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ status: 'publication_failed', sourceId, previousFreshnessStatus: null, newFreshnessStatus: null }));
  });
});
