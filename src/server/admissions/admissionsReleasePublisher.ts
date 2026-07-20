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
  markReleasePublished(releaseId: string, publishedAt: Date): Promise<void>;
  markPublicationAttemptSucceeded(attemptId: string, completedAt: Date): Promise<void>;
}

export interface PublishAdmissionsReleaseInput {
  manifest: unknown;
  repositoryCommit: string;
  publishedAt?: Date;
}

export type PublishAdmissionsReleaseResult =
  | { status: 'published'; releaseId: string; manifestDigest: string }
  | { status: 'already_published'; releaseId: string };

export function createAdmissionsReleasePublisher(
  repository = createDrizzleAdmissionsReleaseRepository(),
) {
  return {
    async publish(input: PublishAdmissionsReleaseInput): Promise<PublishAdmissionsReleaseResult> {
      const manifest = parseReviewedAdmissionsManifest(input.manifest);
      const manifestDigest = digest(canonicalizeReviewedAdmissionsManifest(manifest));
      const publishedAt = input.publishedAt ?? new Date();
      const transitions = buildTargetTransitions(manifest);

      return repository.transaction(async (writer) => {
        const existing = await writer.findReleaseByManifestDigest(manifestDigest);
        if (existing?.status === 'published') {
          return { status: 'already_published', releaseId: existing.id };
        }

        if (existing) {
          throw new Error(
            `Release ${existing.id} is not publishable from status ${existing.status}.`,
          );
        }

        const releaseId = randomUUID();
        const attemptId = randomUUID();
        await writer.createRelease({
          id: releaseId,
          manifestDigest,
          repositoryCommit: input.repositoryCommit,
          status: 'pending',
          publishedAt: null,
          createdAt: publishedAt,
        });
        await writer.createPublicationAttempt({
          id: attemptId,
          releaseId,
          status: 'started',
          errorMessage: null,
          startedAt: publishedAt,
          completedAt: null,
        });

        for (const transition of transitions) {
          const transitionId = randomUUID();
          await writer.createTargetTransition({
            id: transitionId,
            releaseId,
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

        await writer.markReleasePublished(releaseId, publishedAt);
        await writer.markPublicationAttemptSucceeded(attemptId, publishedAt);
        return { status: 'published', releaseId, manifestDigest };
      });
    },
  };
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
          async markReleasePublished(releaseId, publishedAt) {
            await tx
              .update(admissionReleases)
              .set({ status: 'published', publishedAt })
              .where(eq(admissionReleases.id, releaseId));
          },
          async markPublicationAttemptSucceeded(attemptId, completedAt) {
            await tx
              .update(admissionPublicationAttempts)
              .set({ status: 'succeeded', completedAt })
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
