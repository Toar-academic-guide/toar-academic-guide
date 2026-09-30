import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '@/db/schema';

vi.mock('server-only', () => ({}));

import {
  createAdmissionsReleasePublisher,
  createDrizzleAdmissionsReleaseRepository,
} from './admissionsReleasePublisher';
import { buildOperationalProofReviewRun } from './operationalProofRun';

const publicationDbIntegrationEnabled = process.env.PUBLICATION_DB_INTEGRATION === '1';
const describeWithPostgres = publicationDbIntegrationEnabled ? describe : describe.skip;
const databaseUrl = process.env.DATABASE_URL;
if (publicationDbIntegrationEnabled && !databaseUrl) {
  throw new Error('DATABASE_URL is required when PUBLICATION_DB_INTEGRATION=1.');
}
const repositoryCommit = 'abcdef1234567';
const proofScenario = 'proof-plan001-20260820';
const operationalProof = buildOperationalProofReviewRun({
  runKey: proofScenario,
  proofScenario,
  checkedAt: new Date('2026-08-20T00:00:00.000Z'),
});
const manifest = {
  ...operationalProof.manifest,
  changes: operationalProof.manifest.changes.filter(
    (change) => change.target.institutionId === 'tau' && change.target.programId === 'tau_cs',
  ),
};
const programId = manifest.changes[0]!.target.programId;

describeWithPostgres('admissions release publisher with PostgreSQL', () => {
  const sql = postgres(databaseUrl ?? 'postgresql://unused', { max: 1, prepare: false });
  const db = drizzle(sql, { schema });
  const publisher = createAdmissionsReleasePublisher(createDrizzleAdmissionsReleaseRepository(db));

  beforeAll(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await sql.end({ timeout: 5 });
  });

  it('persists a controlled proof failure and retries the same release identity', async () => {
    const input = { manifest, repositoryCommit };

    await expect(
      publisher.publish({
        ...input,
        proofFailureStage: 'after_attempt_started',
        proofConfirmationId: proofScenario,
      }),
    ).rejects.toThrow('Controlled operational-proof failure after publication attempt started.');

    const [failedRelease] = await sql<
      Array<{ id: string; status: string; published_at: string | null }>
    >`
      select id, status, published_at
      from public.admission_releases
      where repository_commit = ${repositoryCommit}
    `;
    expect(failedRelease).toMatchObject({ status: 'failed', published_at: null });

    const failedAttempts = await sql<
      Array<{ release_id: string; status: string; error_message: string | null }>
    >`
      select release_id, status, error_message
      from public.admission_publication_attempts
      where release_id = ${failedRelease!.id}
      order by started_at
    `;
    expect(failedAttempts).toEqual([
      expect.objectContaining({
        release_id: failedRelease!.id,
        status: 'failed',
        error_message: expect.any(String),
      }),
    ]);

    await expect(publisher.publish(input)).resolves.toMatchObject({
      status: 'published',
      releaseId: failedRelease!.id,
    });

    const [publishedRelease] = await sql<
      Array<{ id: string; status: string; published_at: string | null }>
    >`
      select id, status, published_at
      from public.admission_releases
      where repository_commit = ${repositoryCommit}
    `;
    expect(publishedRelease).toMatchObject({
      id: failedRelease!.id,
      status: 'published',
      published_at: expect.any(String),
    });

    const attempts = await sql<Array<{ status: string }>>`
      select status
      from public.admission_publication_attempts
      where release_id = ${failedRelease!.id}
      order by started_at
    `;
    expect(attempts.map((attempt) => attempt.status)).toEqual(['failed', 'succeeded']);

    const [proofValue] = await sql<Array<{ current_value: { value: number }; release_id: string }>>`
      select current_value, release_id
      from public.admission_operational_proof_values
      where program_id = ${programId}
        and institution_id = 'tau'
        and cycle = '2099'
    `;
    expect(proofValue).toEqual({ current_value: { value: 701 }, release_id: failedRelease!.id });
    const [canonicalValue] = await sql<Array<{ threshold_value: number | null }>>`
      select threshold_value
      from public.admission_thresholds
      where program_id = ${programId}
        and institution_id = 'tau'
        and threshold_kind = 'sekhem'
    `;
    expect(canonicalValue?.threshold_value).toBe(700);
  });

  async function cleanup() {
    await sql`
      delete from public.admission_operational_proof_values
      where release_id in (
        select id
        from public.admission_releases
        where repository_commit = ${repositoryCommit}
      )
    `;
    await sql`
      delete from public.admission_releases
      where repository_commit = ${repositoryCommit}
    `;
  }
});
