import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import { getDb } from '@/db/client';
import { reviewItems, sourceFreshnessStates } from '@/db/schema';
import {
  createDrizzleReviewResolutionRepository,
  rejectReviewItem,
} from '@/server/ingestion/reviewResolution';

vi.mock('@/db/client', () => ({
  getDb: vi.fn(() => {
    throw new Error('Live DB forbidden');
  }),
}));

const id = '0b38bb88-4c4f-4b4a-a74e-18802ff29961';
const args = [id, '--actor', 'operator'];
const sourceId = 'university-engineering-live';
const reviewedAt = new Date('2026-10-25T10:00:00Z');

// Dynamic loading makes each missing CLI behavior visible in the initial red test count.
async function run(
  argv: string[],
  dependencies: Record<string, unknown>,
  exit: (code: number) => void,
) {
  const module = await import('./reject-admissions-review.mjs');
  return module.runAdmissionsReviewRejectionCli(argv, dependencies, exit);
}

type Row = Record<string, unknown>;

// Evaluate the real repository's Drizzle predicates against isolated rows, as in
// reviewResolution.transaction.test.ts. No SQL is sent to a database.
function fixture(itemOverrides: Row = {}, stateOverrides: Row = {}) {
  let item: Row = {
    id,
    status: 'pending',
    targetField: 'sourceFreshness',
    proposedValue: {
      sourceId,
      normalizedFingerprint: 'v2',
      normalizedDecisionPayload: { minimum: 90 },
    },
    ...itemOverrides,
  };
  let state: Row = {
    sourceId,
    status: 'changed_needs_review',
    latestReviewItemId: id,
    latestFailureReason: 'changed',
    nextAction: 'review',
    updatedAt: new Date('2026-10-24'),
    ...stateOverrides,
  };
  const dialect = new PgDialect();
  const matches = (condition: SQL, row: Row) => {
    const query = dialect.sqlToQuery(condition);
    return [...query.sql.matchAll(/"\w+"\."(\w+)" = \$(\d+)/g)].every(([, column, param]) => {
      const key = column.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
      return row[key] === query.params[Number(param) - 1];
    });
  };
  const writes = vi.fn();
  const transaction = vi.fn(async (operation: (tx: unknown) => Promise<unknown>) => {
    const beforeItem = { ...item };
    const beforeState = { ...state };
    try {
      return await operation(database(true));
    } catch (error) {
      item = beforeItem;
      state = beforeState;
      throw error;
    }
  });
  const database = (inTransaction: boolean): unknown => ({
    select: () => ({
      from: (table: unknown) => ({
        where: (condition: SQL) => {
          const read = () => {
            const row = table === reviewItems ? item : state;
            return matches(condition, row) ? [{ ...row }] : [];
          };
          return {
            limit: () => ({
              then: (resolve: (rows: Row[]) => unknown, reject: (error: unknown) => unknown) =>
                Promise.resolve().then(read).then(resolve, reject),
              for: () => Promise.resolve(read()),
            }),
          };
        },
      }),
    }),
    update: (table: unknown) => ({
      set: (values: Row) => ({
        where: (condition: SQL) => {
          let result: Row[] | undefined;
          const write = () => {
            if (result) return result;
            expect(inTransaction).toBe(true);
            const row = table === reviewItems ? item : state;
            if (matches(condition, row)) {
              writes(table, values);
              result = [Object.assign(row, values)];
            } else {
              result = [];
            }
            return result;
          };
          return {
            returning: () => Promise.resolve().then(write),
            then: (resolve: (rows: Row[]) => unknown, reject: (error: unknown) => unknown) =>
              Promise.resolve().then(write).then(resolve, reject),
          };
        },
      }),
    }),
    transaction,
  });
  const db = database(false) as Parameters<typeof createDrizzleReviewResolutionRepository>[0];
  const repository = createDrizzleReviewResolutionRepository(db);
  const reject = (reviewId: string, options: Parameters<typeof rejectReviewItem>[1]) =>
    rejectReviewItem(reviewId, { ...options, repository, reviewedAt });
  return { reject, item: () => item, state: () => state, transaction, writes };
}

describe('reject admissions review CLI', () => {
  it.each([
    [...args, '--triggering-actor'],
    [...args, '--triggering-actor', ''],
    [...args, '--triggering-actor', ' \t\n '],
    [...args, '--triggering-actor', '--extra'],
    [...args, '--triggering-actor', 'github-operator', '--triggering-actor', 'duplicate'],
    [...args, '--triggering-actor', 'github-operator', '--extra'],
    [...args, '--unknown', 'github-operator'],
  ])(
    'rejects invalid triggering actor arguments %j before loading the database',
    async (...argv) => {
      const reject = vi.fn();
      const createViteServer = vi.fn();
      const exit = vi.fn();
      const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
      const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
      await run(argv as string[], { reject, createViteServer }, exit);
      expect(exit).toHaveBeenCalledExactlyOnceWith(1);
      expect(stderr).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('Usage:'));
      expect(stdout).not.toHaveBeenCalled();
      expect(reject).not.toHaveBeenCalled();
      expect(createViteServer).not.toHaveBeenCalled();
    },
  );

  it.each(['rejected', 'not_found', 'already_resolved', 'resolution_failed'])(
    'adds the triggering actor and preserves the operator on every %s audit line',
    async (status) => {
      const entries = [
        {
          event: 'admissions_review_item_resolved',
          action: 'reject',
          reviewItemId: id,
          actor: 'operator',
          status,
        },
        {
          event: 'admissions_review_item_resolved',
          action: 'reject',
          reviewItemId: id,
          actor: 'operator',
          status,
        },
      ];
      const reject = vi.fn(
        async (
          _id: string,
          options: {
            actor: string;
            auditLog: (entry: Record<string, unknown>) => void;
          },
        ) => {
          expect(options.actor).toBe('operator');
          for (const entry of entries) options.auditLog(entry);
          if (status === 'resolution_failed') throw new Error('sensitive DB error');
          return { status };
        },
      );
      const createViteServer = vi.fn();
      const exit = vi.fn();
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
      await run(
        [...args, '--triggering-actor', ' github-operator '],
        { reject, createViteServer },
        exit,
      );
      expect(reject).toHaveBeenCalledOnce();
      const auditLines = stderr.mock.calls.filter(([line]) => String(line).startsWith('{'));
      expect(auditLines).toHaveLength(entries.length);
      expect(auditLines.map(([line]) => JSON.parse(line))).toEqual(
        entries.map((entry) => ({ ...entry, triggeringActor: 'github-operator' })),
      );
      expect(exit).toHaveBeenCalledExactlyOnceWith(status === 'rejected' ? 0 : 1);
      expect(createViteServer).not.toHaveBeenCalled();
    },
  );

  it.each([
    [],
    ['bad-id', '--actor', 'operator'],
    [id],
    [id, '--actor', ' '],
    [id, '--actor'],
    [...args, '--extra'],
    [id, '--actor', 'operator', '--actor', 'duplicate'],
    [id, '--actor', '--extra'],
    [id, '--unknown', 'operator'],
  ])('rejects invalid arguments %j without loading the database runtime', async (...argv) => {
    const reject = vi.fn();
    const createViteServer = vi.fn();
    const exit = vi.fn();
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    await run(argv as string[], { reject, createViteServer }, exit);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(stderr).toHaveBeenCalledExactlyOnceWith(
      'Usage: node scripts/reject-admissions-review.mjs <reviewItemId> --actor <name>',
    );
    expect(stdout).not.toHaveBeenCalled();
    expect(reject).not.toHaveBeenCalled();
    expect(createViteServer).not.toHaveBeenCalled();
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each(['rejected', 'not_found', 'already_resolved'])(
    'prints JSON and exits correctly for %s',
    async (status) => {
      const result =
        status === 'already_resolved' ? { status, reviewItemStatus: 'approved' } : { status };
      const reject = vi.fn().mockResolvedValue(result);
      const createViteServer = vi.fn();
      const exit = vi.fn();
      const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
      await run([id, '--actor', ' operator '], { reject, createViteServer }, exit);
      expect(reject).toHaveBeenCalledExactlyOnceWith(
        id,
        expect.objectContaining({ actor: 'operator', auditLog: expect.any(Function) }),
      );
      expect(stdout).toHaveBeenCalledExactlyOnceWith(JSON.stringify(result));
      expect(exit).toHaveBeenCalledExactlyOnceWith(status === 'rejected' ? 0 : 1);
      expect(createViteServer).not.toHaveBeenCalled();
    },
  );

  it('rejects a pending item, clears its freshness row in one transaction and audits once', async () => {
    const f = fixture();
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exit = vi.fn();
    await run(args, { reject: f.reject }, exit);
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
    expect(stdout).toHaveBeenCalledExactlyOnceWith('{"status":"rejected"}');
    expect(f.item()).toMatchObject({ status: 'rejected', reviewedAt });
    expect(f.state()).toEqual({
      sourceId,
      status: 'fresh',
      latestReviewItemId: null,
      latestFailureReason: null,
      nextAction: null,
      updatedAt: reviewedAt,
    });
    expect(f.transaction).toHaveBeenCalledOnce();
    expect(f.writes).toHaveBeenCalledTimes(2);
    expect(stderr).toHaveBeenCalledTimes(1);
    expect(JSON.parse(stderr.mock.calls[0][0])).toEqual({
      event: 'admissions_review_item_resolved',
      action: 'reject',
      reviewItemId: id,
      sourceId,
      actor: 'operator',
      status: 'rejected',
      previousFreshnessStatus: 'changed_needs_review',
      newFreshnessStatus: 'fresh',
    });
    expect(getDb).not.toHaveBeenCalled();
  });

  it('rejects the item while preserving a freshness row pointing to another item', async () => {
    const f = fixture({}, { latestReviewItemId: '4e4b45c6-2a0a-48df-b23a-3821ed235cd8' });
    const before = { ...f.state() };
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const exit = vi.fn();
    await run(args, { reject: f.reject }, exit);
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
    expect(stdout).toHaveBeenCalledExactlyOnceWith('{"status":"rejected"}');
    expect(f.item()).toMatchObject({ status: 'rejected', reviewedAt });
    expect(f.state()).toEqual(before);
    expect(f.transaction).toHaveBeenCalledOnce();
    expect(f.writes).toHaveBeenCalledTimes(1);
    expect(getDb).not.toHaveBeenCalled();
  });

  it.each(['approved', 'rejected'])(
    'prints already_resolved without writes for an already %s item',
    async (status) => {
      const f = fixture({ status });
      const beforeItem = { ...f.item() };
      const beforeState = { ...f.state() };
      const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const exit = vi.fn();
      await run(args, { reject: f.reject }, exit);
      expect(exit).toHaveBeenCalledExactlyOnceWith(1);
      expect(stdout).toHaveBeenCalledExactlyOnceWith(
        JSON.stringify({ status: 'already_resolved', reviewItemStatus: status }),
      );
      expect(f.item()).toEqual(beforeItem);
      expect(f.state()).toEqual(beforeState);
      expect(f.transaction).not.toHaveBeenCalled();
      expect(f.writes).not.toHaveBeenCalled();
      expect(getDb).not.toHaveBeenCalled();
    },
  );

  it('sanitizes thrown resolution errors and exits non-zero', async () => {
    const reject = vi
      .fn()
      .mockRejectedValue(new Error('postgresql://user:secret@host/db?token=secret'));
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exit = vi.fn();
    await run(args, { reject }, exit);
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledExactlyOnceWith('Review rejection failed.');
  });

  it.each([false, true])(
    'closes the DB pool and Vite after resolution (throws: %s)',
    async (throws) => {
      const reject = throws
        ? vi.fn().mockRejectedValue(new Error('sensitive DB error'))
        : vi.fn().mockResolvedValue({ status: 'rejected' });
      const closeDb = vi.fn();
      const close = vi.fn();
      const exit = vi.fn();
      const ssrLoadModule = vi.fn(async (path: string) =>
        path.includes('reviewResolution') ? { rejectReviewItem: reject } : { closeDb },
      );
      const createViteServer = vi.fn(async () => ({ ssrLoadModule, close }));
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await run(args, { createViteServer }, exit);
      expect(ssrLoadModule.mock.calls.map(([path]) => path)).toEqual([
        '/src/db/client.ts',
        '/src/server/ingestion/reviewResolution.ts',
      ]);
      expect(reject).toHaveBeenCalledExactlyOnceWith(
        id,
        expect.objectContaining({ actor: 'operator', auditLog: expect.any(Function) }),
      );
      expect(closeDb).toHaveBeenCalledOnce();
      expect(close).toHaveBeenCalledOnce();
      expect(closeDb.mock.invocationCallOrder[0]).toBeLessThan(close.mock.invocationCallOrder[0]);
      expect(close.mock.invocationCallOrder[0]).toBeLessThan(exit.mock.invocationCallOrder[0]);
      expect(exit).toHaveBeenCalledExactlyOnceWith(throws ? 1 : 0);
    },
  );

  it.each(['database', 'runtime'])(
    'sanitizes %s cleanup errors and exits non-zero',
    async (failure) => {
      const reject = vi.fn().mockResolvedValue({ status: 'rejected' });
      const closeDb =
        failure === 'database'
          ? vi.fn().mockRejectedValue(new Error('sensitive DB error'))
          : vi.fn();
      const close =
        failure === 'runtime'
          ? vi.fn().mockRejectedValue(new Error('sensitive runtime error'))
          : vi.fn();
      const ssrLoadModule = vi.fn(async (path: string) =>
        path.includes('reviewResolution') ? { rejectReviewItem: reject } : { closeDb },
      );
      const createViteServer = vi.fn(async () => ({ ssrLoadModule, close }));
      const exit = vi.fn();
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
      await run(args, { createViteServer }, exit);
      expect(closeDb).toHaveBeenCalledOnce();
      expect(close).toHaveBeenCalledOnce();
      expect(exit).toHaveBeenCalledExactlyOnceWith(1);
      expect(stderr).toHaveBeenCalledExactlyOnceWith(
        failure === 'database' ? 'Database cleanup failed.' : 'Runtime cleanup failed.',
      );
    },
  );
});
