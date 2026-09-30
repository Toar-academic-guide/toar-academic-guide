import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import { getDb } from '@/db/client';
import {
  admissionOperationalProofValues,
  admissionPublicationAttempts,
  admissionReleaseItems,
  admissionReleases,
  admissionTargetTransitions,
  admissionThresholds,
} from '@/db/schema';
import {
  canonicalizeReviewedAdmissionsManifest,
  parseReviewedAdmissionsManifest,
  type ReviewedAdmissionsManifest,
} from './reviewedManifest';

type ReleaseStatus = 'pending' | 'published' | 'failed';
type AttemptStatus = 'started' | 'succeeded' | 'failed';
export type AdmissionReleaseKind = 'canonical_bootstrap' | 'canonical_change' | 'operational_proof';

export type PublishedAdmissionCutoffChange = ReviewedAdmissionsManifest['changes'][number] & {
  ruleKind: 'admission_cutoff';
  before: number;
  after: number;
};

export interface AdmissionReleaseRecord {
  id: string;
  manifestDigest: string;
  repositoryCommit: string;
  releaseKind: AdmissionReleaseKind;
  proofScenario: string | null;
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
  applyCanonicalAdmissionCutoff(input: { change: PublishedAdmissionCutoffChange }): Promise<void>;
  applyOperationalProofAdmissionCutoff(input: {
    releaseId: string;
    change: PublishedAdmissionCutoffChange;
    updatedAt: Date;
  }): Promise<void>;
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
  proofFailureStage?: 'after_attempt_started';
  proofConfirmationId?: string;
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
      const changes = manifest.changes.map(assertSupportedAdmissionCutoffChange);
      assertProofFailureInjectionIsSafe(input, manifest);
      const releaseRepository = repository ?? createDrizzleAdmissionsReleaseRepository();
      const manifestDigest = digest(canonicalizeReviewedAdmissionsManifest(manifest));
      const publishedAt = input.publishedAt ?? new Date();
      const transitions = buildTargetTransitions(changes);
      const preparation = await preparePublicationAttempt({
        repository: releaseRepository,
        manifestDigest,
        repositoryCommit: input.repositoryCommit,
        releaseKind: manifest.releaseKind,
        proofScenario: manifest.proofScenario ?? null,
        startedAt: publishedAt,
      });

      if (preparation.status === 'already_published') {
        return preparation;
      }

      try {
        await releaseRepository.transaction(async (writer) => {
          for (const transition of transitions) {
            for (const change of transition.changes) {
              if (manifest.releaseKind === 'operational_proof') {
                await writer.applyOperationalProofAdmissionCutoff({
                  releaseId: preparation.releaseId,
                  change,
                  updatedAt: publishedAt,
                });
              } else {
                await writer.applyCanonicalAdmissionCutoff({ change });
              }
            }
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

          if (input.proofFailureStage === 'after_attempt_started') {
            throw new Error(
              'Controlled operational-proof failure after publication attempt started.',
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
  releaseKind: AdmissionReleaseKind;
  proofScenario: string | null;
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
    releaseKind: input.releaseKind,
    proofScenario: input.proofScenario,
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
          async applyCanonicalAdmissionCutoff({ change }) {
            const updated = await tx
              .update(admissionThresholds)
              .set({ thresholdValue: change.after })
              .where(
                and(
                  eq(admissionThresholds.institutionId, change.target.institutionId),
                  eq(admissionThresholds.programId, change.target.programId),
                  eq(admissionThresholds.thresholdKind, 'sekhem'),
                  eq(admissionThresholds.thresholdValue, change.before),
                ),
              )
              .returning({ id: admissionThresholds.id });
            if (updated.length !== 1) {
              throw new Error(
                `Canonical cutoff for ${change.target.institutionId}/${change.target.programId} did not match its expected before value.`,
              );
            }
          },
          async applyOperationalProofAdmissionCutoff({ releaseId, change, updatedAt }) {
            const [canonicalValue] = await tx
              .select({
                id: admissionThresholds.id,
                thresholdValue: admissionThresholds.thresholdValue,
              })
              .from(admissionThresholds)
              .where(
                and(
                  eq(admissionThresholds.institutionId, change.target.institutionId),
                  eq(admissionThresholds.programId, change.target.programId),
                  eq(admissionThresholds.thresholdKind, 'sekhem'),
                ),
              )
              .for('update')
              .limit(1);
            if (!canonicalValue) {
              throw new Error(
                `Operational proof target ${change.target.institutionId}/${change.target.programId} has no canonical cutoff.`,
              );
            }
            const [existing] = await tx
              .select()
              .from(admissionOperationalProofValues)
              .where(
                and(
                  eq(admissionOperationalProofValues.institutionId, change.target.institutionId),
                  eq(admissionOperationalProofValues.programId, change.target.programId),
                  eq(admissionOperationalProofValues.cycle, change.target.cycle),
                  eq(admissionOperationalProofValues.ruleKind, change.ruleKind),
                ),
              )
              .for('update')
              .limit(1);
            if (existing) {
              if (existing.currentValue.value !== change.before) {
                throw new Error(
                  `Operational proof cutoff for ${change.target.institutionId}/${change.target.programId} did not match its expected before value.`,
                );
              }
              await tx
                .update(admissionOperationalProofValues)
                .set({ releaseId, currentValue: { value: change.after }, updatedAt })
                .where(eq(admissionOperationalProofValues.id, existing.id));
              return;
            }
            if (canonicalValue.thresholdValue !== change.before) {
              throw new Error(
                `Operational proof target ${change.target.institutionId}/${change.target.programId} must start from the canonical before value.`,
              );
            }
            await tx.insert(admissionOperationalProofValues).values({
              id: randomUUID(),
              releaseId,
              institutionId: change.target.institutionId,
              programId: change.target.programId,
              cycle: change.target.cycle,
              ruleKind: change.ruleKind,
              currentValue: { value: change.after },
              updatedAt,
            });
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

function buildTargetTransitions(changes: PublishedAdmissionCutoffChange[]) {
  const byTarget = new Map<string, PublishedAdmissionCutoffChange[]>();

  for (const change of changes) {
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

function assertSupportedAdmissionCutoffChange(
  change: ReviewedAdmissionsManifest['changes'][number],
): PublishedAdmissionCutoffChange {
  if (
    change.ruleKind !== 'admission_cutoff' ||
    typeof change.before !== 'number' ||
    typeof change.after !== 'number'
  ) {
    throw new Error(
      `Unsupported admissions release rule ${change.ruleKind}; only numeric admission_cutoff rules can be published.`,
    );
  }
  return {
    ...change,
    ruleKind: 'admission_cutoff',
    before: change.before,
    after: change.after,
  };
}

function assertProofFailureInjectionIsSafe(
  input: PublishAdmissionsReleaseInput,
  manifest: ReviewedAdmissionsManifest,
): void {
  if (!input.proofFailureStage) return;
  if (
    manifest.releaseKind !== 'operational_proof' ||
    input.proofFailureStage !== 'after_attempt_started' ||
    input.proofConfirmationId !== manifest.proofScenario
  ) {
    throw new Error(
      'Controlled publication failure is allowed only for an operational proof with its matching confirmation ID.',
    );
  }
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
