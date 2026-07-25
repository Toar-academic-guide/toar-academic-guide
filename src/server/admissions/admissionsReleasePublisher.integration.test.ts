import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '@/db/schema';

vi.mock('server-only', () => ({}));

import {
  createAdmissionsReleasePublisher,
  createDrizzleAdmissionsReleaseRepository,
} from './admissionsReleasePublisher';

const publicationDbIntegrationEnabled = process.env.PUBLICATION_DB_INTEGRATION === '1';
const describeWithPostgres = publicationDbIntegrationEnabled ? describe : describe.skip;
const databaseUrl = process.env.DATABASE_URL;
if (publicationDbIntegrationEnabled && !databaseUrl) {
  throw new Error('DATABASE_URL is required when PUBLICATION_DB_INTEGRATION=1.');
}
const programId = 'ci_publication_retry_program';
const repositoryCommit = 'abcdef1234567';
const manifest = {
  version: 1,
  changes: [
    {
      target: { institutionId: 'tau', programId, cycle: '2099' },
      ruleKind: 'admission_cutoff' as const,
      before: 700,
      after: 690,
      effectiveFrom: '2099-01-01',
      sourceProofs: [
        {
          sourceId: 'ci-publication-retry',
          digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          excerpt: 'Disposable PostgreSQL publication retry proof.',
          url: 'https://example.com/ci-publication-retry',
        },
      ],
    },
  ],
};

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

  it('persists failure and retries the same release identity after the database issue is fixed', async () => {
    const input = { manifest, repositoryCommit };

    await expect(publisher.publish(input)).rejects.toThrow();

    const [failedRelease] = await sql<
      Array<{ id: string; status: string; published_at: Date | null }>
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

    await sql`
      insert into public.programs (
        id,
        name,
        institution_name,
        institution_id,
        type,
        category,
        admission_type,
        riasec_r,
        riasec_i,
        riasec_a,
        riasec_s,
        riasec_e,
        riasec_c
      )
      values (
        ${programId},
        'CI publication retry program',
        'Tel Aviv University',
        'tau',
        'academic',
        'ci',
        'requirements',
        0,
        0,
        0,
        0,
        0,
        0
      )
    `;

    await expect(publisher.publish(input)).resolves.toMatchObject({
      status: 'published',
      releaseId: failedRelease!.id,
    });

    const [publishedRelease] = await sql<
      Array<{ id: string; status: string; published_at: Date | null }>
    >`
      select id, status, published_at
      from public.admission_releases
      where repository_commit = ${repositoryCommit}
    `;
    expect(publishedRelease).toMatchObject({
      id: failedRelease!.id,
      status: 'published',
      published_at: expect.any(Date),
    });

    const attempts = await sql<Array<{ status: string }>>`
      select status
      from public.admission_publication_attempts
      where release_id = ${failedRelease!.id}
      order by started_at
    `;
    expect(attempts.map((attempt) => attempt.status)).toEqual(['failed', 'succeeded']);
  });

  async function cleanup() {
    await sql`
      delete from public.admission_releases
      where repository_commit = ${repositoryCommit}
    `;
    await sql`
      delete from public.programs
      where id = ${programId}
    `;
  }
});
