import { randomUUID } from 'node:crypto';

import { sql as query } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, describe, expect, it, vi } from 'vitest';

import * as schema from '@/db/schema';
import {
  approveReviewItem,
  createDrizzleReviewResolutionRepository,
  rejectReviewItem,
} from './reviewResolution';

vi.mock('server-only', () => ({}));

const enabled = process.env.SOURCE_FRESHNESS_DB_INTEGRATION === '1';
const url = process.env.DATABASE_URL ?? 'postgresql://unused';
if (enabled && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) {
  throw new Error('Use disposable localhost PostgreSQL only.');
}

describe.skipIf(!enabled)('review resolution as admissions_automation with PostgreSQL', () => {
  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql, { schema });
  type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
  const reviewedAt = new Date('2026-10-25T10:00:00.000Z');
  afterAll(async () => sql.end());

  async function fixture(
    run: (tx: Transaction, id: string, sourceId: string) => Promise<void>,
    status: 'pending' | 'approved' | 'rejected' = 'pending',
  ) {
    const rollback = new Error('fixture rollback');
    try {
      await db.transaction(async (tx) => {
        const sourceId = `resolution-${randomUUID()}`;
        const jobId = randomUUID();
        const payloadId = randomUUID();
        const id = randomUUID();
        await tx.execute(query`insert into ingestion_sources (id, difficulty, source_url)
          values (${sourceId}, 'easy', 'https://example.com/resolution')`);
        await tx.execute(query`insert into ingestion_jobs (id, source_id, status, difficulty)
          values (${jobId}, ${sourceId}, 'needs_review', 'easy')`);
        await tx.execute(query`insert into ingestion_payloads (id, job_id, payload)
          values (${payloadId}, ${jobId}, '{}'::jsonb)`);
        await tx.execute(query`insert into review_items (id, payload_id, target_field, proposed_value, status)
          values (${id}, ${payloadId}, 'sourceFreshness', ${JSON.stringify({
            sourceId,
            normalizedFingerprint: 'resolution-fingerprint',
            normalizedDecisionPayload: { threshold: 700 },
          })}::jsonb, ${status})`);
        await tx.execute(query`insert into source_freshness_states
          (source_id, source_class, capability, status, latest_review_item_id,
           latest_failure_reason, next_action)
          values (${sourceId}, 'official_html', 'decision_capable', 'changed_needs_review',
            ${id}, 'review required', 'resolve review')`);
        await tx.execute(query`set local role admissions_automation`);
        const [role] = await tx.execute(query`select current_user as role`);
        expect(role.role).toBe('admissions_automation');
        await run(tx, id, sourceId);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  }

  it.each(['approve', 'reject'] as const)(
    '%s resolves both tables through the real Drizzle repository under the restricted role',
    async (action) =>
      fixture(async (tx, id, sourceId) => {
        const repository = createDrizzleReviewResolutionRepository(tx);
        const auditLog = vi.fn();
        const resolve = action === 'approve' ? approveReviewItem : rejectReviewItem;
        const expectedStatus = action === 'approve' ? 'approved' : 'rejected';
        expect(
          await resolve(id, { repository, reviewedAt, actor: 'integration-test', auditLog }),
        ).toEqual({ status: expectedStatus });
        const [review] = await tx.execute(
          query`select status, reviewed_at from review_items where id = ${id}`,
        );
        expect(review.status).toBe(expectedStatus);
        expect(new Date(review.reviewed_at as string)).toEqual(reviewedAt);
        const [freshness] =
          await tx.execute(query`select status, latest_review_item_id, latest_failure_reason,
        next_action, updated_at from source_freshness_states where source_id = ${sourceId}`);
        expect(freshness).toEqual({
          status: 'fresh',
          latest_review_item_id: null,
          latest_failure_reason: null,
          next_action: null,
          updated_at: expect.any(String),
        });
        expect(new Date(freshness.updated_at as string)).toEqual(reviewedAt);
        expect(auditLog).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            status: expectedStatus,
            previousFreshnessStatus: 'changed_needs_review',
            newFreshnessStatus: 'fresh',
          }),
        );
      }),
  );

  it.each(['approved', 'rejected'] as const)('cannot update a %s item', async (status) =>
    fixture(async (tx, id) => {
      const rows =
        await tx.execute(query`update review_items set status = 'rejected', reviewed_at = now()
        where id = ${id} returning id`);
      expect(rows.count).toBe(0);
      const reopen = await tx.execute(
        query`update review_items set status = 'pending' where id = ${id} returning id`,
      );
      expect(reopen.count).toBe(0);
    }, status),
  );

  it('rejects a pending-to-pending update through WITH CHECK', async () => {
    await expect(
      fixture(async (tx, id) => {
        await tx.execute(query`update review_items set status = 'pending' where id = ${id}`);
      }),
    ).rejects.toMatchObject({
      cause: { code: '42501', message: expect.stringContaining('row-level security') },
    });
  });

  it('rejects updates to columns outside status/reviewed_at', async () => {
    await expect(
      fixture(async (tx, id) => {
        await tx.execute(query`update review_items set target_field = 'other' where id = ${id}`);
      }),
    ).rejects.toMatchObject({ cause: { code: '42501' } });
  });
});
