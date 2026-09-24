import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

const sourceFreshnessDbIntegrationEnabled = process.env.SOURCE_FRESHNESS_DB_INTEGRATION === '1';
const describeWithPostgres = sourceFreshnessDbIntegrationEnabled ? describe : describe.skip;
const databaseUrl = process.env.DATABASE_URL;
if (sourceFreshnessDbIntegrationEnabled && !databaseUrl) {
  throw new Error('DATABASE_URL is required when SOURCE_FRESHNESS_DB_INTEGRATION=1.');
}

describeWithPostgres('source freshness review handoff permissions with PostgreSQL', () => {
  const sql = postgres(databaseUrl ?? 'postgresql://unused', { max: 1, prepare: false });
  const sourceId = `freshness-handoff-${randomUUID()}`;
  const jobId = randomUUID();
  const payloadId = randomUUID();
  const reviewItemId = randomUUID();

  beforeAll(async () => {
    await sql`
      insert into public.ingestion_sources (id, difficulty, source_url)
      values (${sourceId}, 'easy', 'https://example.com/freshness-handoff')
    `;
  });

  afterAll(async () => {
    await sql`delete from public.ingestion_sources where id = ${sourceId}`;
    await sql.end({ timeout: 5 });
  });

  it('allows admissions automation to create the complete private handoff, but not read it', async () => {
    await sql.begin(async (transaction) => {
      await transaction`set local role admissions_automation`;
      await transaction`
        insert into public.ingestion_jobs (
          id,
          source_id,
          status,
          difficulty,
          started_at,
          completed_at
        )
        values (
          ${jobId},
          ${sourceId},
          'needs_review',
          'easy',
          now(),
          now()
        )
      `;
      await transaction`
        insert into public.ingestion_payloads (id, job_id, payload)
        values (${payloadId}, ${jobId}, ${JSON.stringify({ sourceId })}::jsonb)
      `;
      await transaction`
        insert into public.review_items (id, payload_id, target_field, proposed_value)
        values (
          ${reviewItemId},
          ${payloadId},
          'sourceFreshness',
          ${JSON.stringify({ sourceId })}::jsonb
        )
      `;
    });

    await expect(
      sql.begin(async (transaction) => {
        await transaction`set local role admissions_automation`;
        await transaction`select id from public.review_items where id = ${reviewItemId}`;
      }),
    ).rejects.toThrow();
  });
});
