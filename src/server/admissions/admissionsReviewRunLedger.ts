import 'server-only';

import { createHash } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { getDb } from '@/db/client';
import { admissionReviewRuns } from '@/db/schema';

import type { AdmissionsReviewRun } from './weeklyReviewRun';

export interface AdmissionsReviewRunRecord {
  runKey: string;
  sourceDigest: string;
  status: 'reviewable' | 'no_changes';
  candidateCount: number;
  exclusionCount: number;
  pullRequestNumber: number | null;
  pullRequestUrl: string | null;
  slackStatus: 'pending' | 'sent' | 'failed';
  slackError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdmissionsReviewRunLedgerRepository {
  find(runKey: string): Promise<AdmissionsReviewRunRecord | null>;
  upsertPrepared(record: AdmissionsReviewRunRecord): Promise<void>;
  setPullRequest(input: {
    runKey: string;
    pullRequestNumber: number;
    pullRequestUrl: string;
  }): Promise<void>;
  setSlackStatus(input: {
    runKey: string;
    slackStatus: 'sent' | 'failed';
    slackError: string | null;
  }): Promise<void>;
}

export function createAdmissionsReviewRunLedger(
  repository: AdmissionsReviewRunLedgerRepository = createDrizzleAdmissionsReviewRunLedgerRepository(),
) {
  return {
    getRun: repository.find.bind(repository),
    async recordPreparedRun(run: AdmissionsReviewRun): Promise<void> {
      const now = new Date();
      await repository.upsertPrepared({
        runKey: run.runKey,
        sourceDigest: reviewRunDigest(run),
        status: run.summary.status,
        candidateCount: run.summary.candidateCount,
        exclusionCount: run.summary.excludedCount,
        pullRequestNumber: null,
        pullRequestUrl: null,
        slackStatus: 'pending',
        slackError: null,
        createdAt: now,
        updatedAt: now,
      });
    },
    recordPullRequest: repository.setPullRequest.bind(repository),
    async recordSlackSent(input: { runKey: string }): Promise<void> {
      await repository.setSlackStatus({ ...input, slackStatus: 'sent', slackError: null });
    },
    async recordSlackFailure(input: { runKey: string; error: string }): Promise<void> {
      await repository.setSlackStatus({
        runKey: input.runKey,
        slackStatus: 'failed',
        slackError: safeError(input.error),
      });
    },
  };
}

export function createDrizzleAdmissionsReviewRunLedgerRepository(
  db = getDb(),
): AdmissionsReviewRunLedgerRepository {
  return {
    async find(runKey) {
      const [record] = await db
        .select()
        .from(admissionReviewRuns)
        .where(eq(admissionReviewRuns.runKey, runKey))
        .limit(1);
      if (!record) return null;
      if (record.status !== 'reviewable' && record.status !== 'no_changes') return null;
      const status: AdmissionsReviewRunRecord['status'] =
        record.status === 'reviewable' ? 'reviewable' : 'no_changes';
      return { ...record, status };
    },
    async upsertPrepared(record) {
      await db
        .insert(admissionReviewRuns)
        .values(record)
        .onConflictDoUpdate({
          target: admissionReviewRuns.runKey,
          set: {
            sourceDigest: record.sourceDigest,
            status: record.status,
            candidateCount: record.candidateCount,
            exclusionCount: record.exclusionCount,
            updatedAt: record.updatedAt,
          },
        });
    },
    async setPullRequest(input) {
      await db
        .update(admissionReviewRuns)
        .set({
          pullRequestNumber: input.pullRequestNumber,
          pullRequestUrl: input.pullRequestUrl,
          updatedAt: new Date(),
        })
        .where(eq(admissionReviewRuns.runKey, input.runKey));
    },
    async setSlackStatus(input) {
      await db
        .update(admissionReviewRuns)
        .set({
          slackStatus: input.slackStatus,
          slackError: input.slackError,
          updatedAt: new Date(),
        })
        .where(eq(admissionReviewRuns.runKey, input.runKey));
    },
  };
}

export function reviewRunDigest(run: AdmissionsReviewRun): string {
  const reviewSurface = JSON.stringify({
    runKey: run.runKey,
    checkedAt: run.checkedAt,
    manifest: run.manifest,
    excluded: run.excluded,
  });
  return `sha256:${createHash('sha256').update(reviewSurface).digest('hex')}`;
}

function safeError(value: string): string {
  return value
    .replace(/[\r\n<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}
