import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import { getDb } from '@/db/client';
import {
  admissionPublicationAttempts,
  admissionReleaseItems,
  admissionReleases,
  admissionTargetTransitions,
} from '@/db/schema';
import {
  canonicalizeReviewedAdmissionsManifest,
  parseReviewedAdmissionsManifest,
  type ReviewedAdmissionsManifest,
} from './reviewedManifest';

type ReleaseStatus = 'pending' | 'published' | 'failed';
type AttemptStatus = 'started' | 'succeeded' | 'failed';

export interface AdmissionReleaseRecord {
  id: string;
  manifestDigest: string;
  repositoryCommit: string;
  status: ReleaseStatus;
  publishedAt: Date | null;
  createdAt: Date;
}

export interface AdmissionTargetTransitionRecord {
  id: string;
  releaseId: string;
  institutionId: string;
  programId: string;
  cycle: string;
  beforeVersion: string;
  afterVersion: string;
  createdAt: Date;
}

export interface AdmissionReleaseItemRecord {
  id: string;
  transitionId: string;
  ruleKind: 'admission_cutoff' | 'minimum_gate' | 'formula_coefficient';
  beforeValue: { value: number | string };
  afterValue: { value: number | string };
  effectiveFrom: string;
  sourceProofs: ReviewedAdmissionsManifest['changes'][number]['sourceProofs'];
  createdAt: Date;
}

export interface AdmissionPublicationAttemptRecord {
  id: string;
  releaseId: string;
  status: AttemptStatus;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface AdmissionsReleaseRepository {
  transaction<T>(callback: (writer: AdmissionsReleaseWriter) => Promise<T>): Promise<T>;
}

export interface AdmissionsReleaseWriter {
  findReleaseByManifestDigest(manifestDigest: string): Promise<AdmissionReleaseRecord | null>;
  createRelease(release: AdmissionReleaseRecord): Promise<void>;
  createPublicationAttempt(attempt: AdmissionPublicationAttemptRecord): Promise<void>;
  createTargetTransition(transition: AdmissionTargetTransitionRecord): Promise<void>;
  createReleaseItems(items: AdmissionReleaseItemRecord[]): Promise<void>;
  markReleasePending(releaseId: string): Promise<void>;
  markReleasePublished(releaseId: string, publishedAt: Date): Promise<void>;
  markReleaseFailed(releaseId: string): Promise<void>;
  markPublicationAttemptSucceeded(attemptId: string, completedAt: Date): Promise<void>;
  markPublicationAttemptFailed(
    attemptId: string,
    errorMessage: string,
    completedAt: Date,
  ): Promise<void>;
}

export interface PublishAdmissionsReleaseInput {
  manifest: unknown;
  repositoryCommit: string;
  publishedAt?: Date;
}

export type PublishAdmissionsReleaseResult =
  | { status: 'no_changes' }
  | { status: 'published'; releaseId: string; manifestDigest: string }
  | { status: 'already_published'; releaseId: string };

export function createAdmissionsReleasePublisher(repository?: AdmissionsReleaseRepository) {
  return {
    async publish(input: PublishAdmissionsReleaseInput): Promise<PublishAdmissionsReleaseResult> {
      const manifest = parseReviewedAdmissionsManifest(input.manifest);
      if (manifest.changes.length === 0) {
        return { status: 'no_changes' };
      }
      const releaseRepository = repository ?? createDrizzleAdmissionsReleaseRepository();
      const manifestDigest = digest(canonicalizeReviewedAdmissionsManifest(manifest));
      const publishedAt = input.publishedAt ?? new Date();
      const transitions = buildTargetTransitions(manifest);
      const preparation = await preparePublicationAttempt({
        repository: releaseRepository,
        manifestDigest,
        repositoryCommit: input.repositoryCommit,
        startedAt: publishedAt,
      });

      if (preparation.status === 'already_published') {
        return preparation;
      }

      try {
        await releaseRepository.transaction(async (writer) => {
          for (const transition of transitions) {
            const transitionId = randomUUID();
            await writer.createTargetTransition({
              id: transitionId,
              releaseId: preparation.releaseId,
              institutionId: transition.target.institutionId,
              programId: transition.target.programId,
              cycle: transition.target.cycle,
              beforeVersion: transition.beforeVersion,
              afterVersion: transition.afterVersion,
              createdAt: publishedAt,
            });
            await writer.createReleaseItems(
              transition.changes.map((change) => ({
                id: randomUUID(),
                transitionId,
                ruleKind: change.ruleKind,
                beforeValue: { value: change.before },
                afterValue: { value: change.after },
                effectiveFrom: change.effectiveFrom,
                sourceProofs: change.sourceProofs,
                createdAt: publishedAt,
              })),
            );
          }

          await writer.markReleasePublished(preparation.releaseId, publishedAt);
          await writer.markPublicationAttemptSucceeded(preparation.attemptId, publishedAt);
        });

        return {
          status: 'published',
          releaseId: preparation.releaseId,
          manifestDigest,
        };
      } catch (error) {
        try {
          await releaseRepository.transaction(async (writer) => {
            await writer.markReleaseFailed(preparation.releaseId);
            await writer.markPublicationAttemptFailed(
              preparation.attemptId,
              getErrorMessage(error),
              new Date(),
            );
          });
        } catch (recordingError) {
          throw new AggregateError(
            [error, recordingError],
            `Publication ${preparation.releaseId} failed and its failure record could not be persisted.`,
          );
        }

        throw error;
      }
    },
  };
}

interface PreparePublicationAttemptInput {
  repository: AdmissionsReleaseRepository;
  manifestDigest: string;
  repositoryCommit: string;
  startedAt: Date;
}

type PreparedPublication =
  | {
      status: 'ready';
      releaseId: string;
      attemptId: string;
    }
  | {
      status: 'already_published';
      releaseId: string;
    };

async function preparePublicationAttempt(
  input: PreparePublicationAttemptInput,
): Promise<PreparedPublication> {
  try {
    return await input.repository.transaction((writer) =>
      preparePublicationAttemptWithWriter(writer, input),
    );
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    return input.repository.transaction(async (writer) => {
      const existing = await writer.findReleaseByManifestDigest(input.manifestDigest);
      if (!existing) throw error;
      return prepareExistingPublicationAttempt(writer, existing, input);
    });
  }
}

async function preparePublicationAttemptWithWriter(
  writer: AdmissionsReleaseWriter,
  input: PreparePublicationAttemptInput,
): Promise<PreparedPublication> {
  const existing = await writer.findReleaseByManifestDigest(input.manifestDigest);
  if (existing) {
    return prepareExistingPublicationAttempt(writer, existing, input);
  }

  const releaseId = randomUUID();
  await writer.createRelease({
    id: releaseId,
    manifestDigest: input.manifestDigest,
    repositoryCommit: input.repositoryCommit,
    status: 'pending',
    publishedAt: null,
    createdAt: input.startedAt,
  });
  const attemptId = await createStartedPublicationAttempt(writer, releaseId, input.startedAt);
  return { status: 'ready', releaseId, attemptId };
}

async function prepareExistingPublicationAttempt(
  writer: AdmissionsReleaseWriter,
  existing: AdmissionReleaseRecord,
  input: PreparePublicationAttemptInput,
): Promise<PreparedPublication> {
  if (existing.status === 'published') {
    return { status: 'already_published', releaseId: existing.id };
  }
  if (existing.status === 'pending') {
    throw new Error(`Release ${existing.id} already has a publication attempt in progress.`);
  }
  if (existing.repositoryCommit !== input.repositoryCommit) {
    throw new Error(
      `Failed release ${existing.id} belongs to repository commit ${existing.repositoryCommit}; retry it with the same commit.`,
    );
  }

  await writer.markReleasePending(existing.id);
  const attemptId = await createStartedPublicationAttempt(writer, existing.id, input.startedAt);
  return { status: 'ready', releaseId: existing.id, attemptId };
}

async function createStartedPublicationAttempt(
  writer: AdmissionsReleaseWriter,
  releaseId: string,
  startedAt: Date,
): Promise<string> {
  const attemptId = randomUUID();
  await writer.createPublicationAttempt({
    id: attemptId,
    releaseId,
    status: 'started',
    errorMessage: null,
    startedAt,
    completedAt: null,
  });
  return attemptId;
}

export function createDrizzleAdmissionsReleaseRepository(
  db = getDb(),
): AdmissionsReleaseRepository {
  return {
    transaction: (callback) =>
      db.transaction(async (tx) => {
        const writer: AdmissionsReleaseWriter = {
          async findReleaseByManifestDigest(manifestDigest) {
            const [release] = await tx
              .select()
              .from(admissionReleases)
              .where(eq(admissionReleases.manifestDigest, manifestDigest))
              .for('update')
              .limit(1);
            return release ?? null;
          },
          async createRelease(release) {
            await tx.insert(admissionReleases).values(release);
          },
          async createPublicationAttempt(attempt) {
            await tx.insert(admissionPublicationAttempts).values(attempt);
          },
          async createTargetTransition(transition) {
            await tx.insert(admissionTargetTransitions).values(transition);
          },
          async createReleaseItems(items) {
            await tx.insert(admissionReleaseItems).values(items);
          },
          async markReleasePending(releaseId) {
            await tx
              .update(admissionReleases)
              .set({ status: 'pending', publishedAt: null })
              .where(eq(admissionReleases.id, releaseId));
          },
          async markReleasePublished(releaseId, publishedAt) {
            await tx
              .update(admissionReleases)
              .set({ status: 'published', publishedAt })
              .where(eq(admissionReleases.id, releaseId));
          },
          async markReleaseFailed(releaseId) {
            await tx
              .update(admissionReleases)
              .set({ status: 'failed', publishedAt: null })
              .where(eq(admissionReleases.id, releaseId));
          },
          async markPublicationAttemptSucceeded(attemptId, completedAt) {
            await tx
              .update(admissionPublicationAttempts)
              .set({ status: 'succeeded', completedAt })
              .where(eq(admissionPublicationAttempts.id, attemptId));
          },
          async markPublicationAttemptFailed(attemptId, errorMessage, completedAt) {
            await tx
              .update(admissionPublicationAttempts)
              .set({ status: 'failed', errorMessage, completedAt })
              .where(eq(admissionPublicationAttempts.id, attemptId));
          },
        };
        return callback(writer);
      }),
  };
}

function buildTargetTransitions(manifest: ReviewedAdmissionsManifest) {
  const byTarget = new Map<string, ReviewedAdmissionsManifest['changes']>();

  for (const change of manifest.changes) {
    const key = `${change.target.institutionId}:${change.target.programId}:${change.target.cycle}`;
    const changes = byTarget.get(key) ?? [];
    changes.push(change);
    byTarget.set(key, changes);
  }

  return [...byTarget.values()]
    .map((changes) => {
      const orderedChanges = [...changes].sort((left, right) =>
        left.ruleKind.localeCompare(right.ruleKind),
      );
      const target = orderedChanges[0]!.target;
      return {
        target,
        changes: orderedChanges,
        beforeVersion: digest(
          JSON.stringify(
            orderedChanges.map((change) => ({ ruleKind: change.ruleKind, value: change.before })),
          ),
        ),
        afterVersion: digest(
          JSON.stringify(
            orderedChanges.map((change) => ({ ruleKind: change.ruleKind, value: change.after })),
          ),
        ),
      };
    })
    .sort((left, right) =>
      `${left.target.institutionId}:${left.target.programId}:${left.target.cycle}`.localeCompare(
        `${right.target.institutionId}:${right.target.programId}:${right.target.cycle}`,
      ),
    );
}

function digest(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
