import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createAdmissionsReleasePublisher,
  type AdmissionPublicationAttemptRecord,
  type AdmissionReleaseItemRecord,
  type AdmissionReleaseRecord,
  type AdmissionTargetTransitionRecord,
  type AdmissionsReleaseRepository,
  type AdmissionsReleaseWriter,
} from './admissionsReleasePublisher';

const manifest = {
  version: 1,
  changes: [
    {
      target: { institutionId: 'tau', programId: 'tau_cs', cycle: '2027' },
      ruleKind: 'admission_cutoff' as const,
      before: 706,
      after: 700,
      effectiveFrom: '2026-08-01',
      sourceProofs: [
        {
          sourceId: 'tau-computer-science',
          digest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          excerpt: 'Current published admission cutoff: 700.',
          url: 'https://go.tau.ac.il/he/exact/ba/computer',
        },
      ],
    },
    {
      target: { institutionId: 'tau', programId: 'tau_cs', cycle: '2027' },
      ruleKind: 'minimum_gate' as const,
      before: 650,
      after: 640,
      effectiveFrom: '2026-08-01',
      sourceProofs: [
        {
          sourceId: 'tau-computer-science',
          digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          excerpt: 'The minimum gate is now 640.',
          url: 'https://go.tau.ac.il/he/exact/ba/computer',
        },
      ],
    },
  ],
};

describe('admissions release publisher', () => {
  it('does not create a release for an empty reviewed manifest', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    const publisher = createAdmissionsReleasePublisher(repository);

    await expect(
      publisher.publish({
        manifest: { version: 1, changes: [] },
        repositoryCommit: 'abc123',
      }),
    ).resolves.toEqual({ status: 'no_changes' });

    expect(repository.releases).toEqual([]);
    expect(repository.transitions).toEqual([]);
  });

  it('does not initialize the database repository for an empty reviewed manifest', async () => {
    await expect(
      createAdmissionsReleasePublisher().publish({
        manifest: { version: 1, changes: [] },
        repositoryCommit: 'abc123',
      }),
    ).resolves.toEqual({ status: 'no_changes' });
  });

  it('publishes every field for one target as one transition', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    const publisher = createAdmissionsReleasePublisher(repository);

    const result = await publisher.publish({
      manifest,
      repositoryCommit: 'abc123',
      publishedAt: new Date('2026-08-02T10:00:00.000Z'),
    });

    expect(result.status).toBe('published');
    expect(repository.transitions).toHaveLength(1);
    expect(repository.transitions[0]).toMatchObject({
      institutionId: 'tau',
      programId: 'tau_cs',
      cycle: '2027',
    });
    expect(repository.transitions[0]?.beforeVersion).not.toBe(
      repository.transitions[0]?.afterVersion,
    );
    expect(repository.items).toHaveLength(2);
    expect(repository.releases[0]).toMatchObject({
      status: 'published',
      repositoryCommit: 'abc123',
    });
    expect(repository.attempts[0]).toMatchObject({ status: 'succeeded' });
  });

  it('creates independent transitions for separate admissions targets', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    const publisher = createAdmissionsReleasePublisher(repository);

    await publisher.publish({
      manifest: {
        ...manifest,
        changes: [
          manifest.changes[0],
          {
            ...manifest.changes[1],
            target: { institutionId: 'bgu', programId: 'bgu_cs', cycle: '2027' },
          },
        ],
      },
      repositoryCommit: 'abc123',
    });

    expect(repository.transitions).toHaveLength(2);
    expect(new Set(repository.transitions.map((transition) => transition.programId))).toEqual(
      new Set(['tau_cs', 'bgu_cs']),
    );
  });

  it('treats a retry of the same manifest digest as idempotent', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    const publisher = createAdmissionsReleasePublisher(repository);
    const input = { manifest, repositoryCommit: 'abc123' };

    const first = await publisher.publish(input);
    const retry = await publisher.publish(input);

    expect(first.status).toBe('published');
    if (first.status !== 'published') throw new Error('Expected a published release.');
    expect(retry).toEqual({ status: 'already_published', releaseId: first.releaseId });
    expect(repository.releases).toHaveLength(1);
    expect(repository.transitions).toHaveLength(1);
  });

  it('resolves a concurrent manifest insert to the release committed by the other publisher', async () => {
    const repository = new MemoryAdmissionsReleaseRepository({
      hideExistingLookups: 1,
      rejectDuplicateReleaseInsert: true,
    });
    const publisher = createAdmissionsReleasePublisher(repository);

    const first = await publisher.publish({ manifest, repositoryCommit: 'abc123' });
    const concurrentRetry = await publisher.publish({ manifest, repositoryCommit: 'abc123' });

    expect(first.status).toBe('published');
    if (first.status !== 'published') throw new Error('Expected a published release.');
    expect(concurrentRetry).toEqual({ status: 'already_published', releaseId: first.releaseId });
    expect(repository.releases).toHaveLength(1);
  });

  it('records a failed release while rolling back every target transition', async () => {
    const repository = new MemoryAdmissionsReleaseRepository({ failProgramId: 'bgu_cs' });
    const publisher = createAdmissionsReleasePublisher(repository);

    await expect(
      publisher.publish({
        manifest: {
          ...manifest,
          changes: [
            manifest.changes[0],
            {
              ...manifest.changes[1],
              target: { institutionId: 'bgu', programId: 'bgu_cs', cycle: '2027' },
            },
          ],
        },
        repositoryCommit: 'abc123',
      }),
    ).rejects.toThrow('simulated transition failure');

    expect(repository.releases).toEqual([
      expect.objectContaining({
        status: 'failed',
        repositoryCommit: 'abc123',
        publishedAt: null,
      }),
    ]);
    expect(repository.attempts).toEqual([
      expect.objectContaining({
        releaseId: repository.releases[0]?.id,
        status: 'failed',
        errorMessage: 'simulated transition failure',
        completedAt: expect.any(Date),
      }),
    ]);
    expect(repository.transitions).toEqual([]);
    expect(repository.items).toEqual([]);
  });

  it('preserves the prior published release when a later multi-target release fails', async () => {
    const repository = new MemoryAdmissionsReleaseRepository({ failProgramId: 'bgu_cs' });
    const publisher = createAdmissionsReleasePublisher(repository);
    const prior = await publisher.publish({
      manifest,
      repositoryCommit: 'prior123',
      publishedAt: new Date('2026-08-02T10:00:00.000Z'),
    });
    if (prior.status !== 'published') throw new Error('Expected a published prior release.');

    await expect(
      publisher.publish({
        manifest: {
          ...manifest,
          changes: [
            {
              ...manifest.changes[0],
              after: 690,
            },
            {
              ...manifest.changes[1],
              target: { institutionId: 'bgu', programId: 'bgu_cs', cycle: '2027' },
            },
          ],
        },
        repositoryCommit: 'failed456',
      }),
    ).rejects.toThrow('simulated transition failure');

    expect(repository.releases).toHaveLength(2);
    expect(repository.releases[0]).toMatchObject({
      id: prior.releaseId,
      status: 'published',
      repositoryCommit: 'prior123',
    });
    expect(repository.releases[1]).toMatchObject({
      status: 'failed',
      repositoryCommit: 'failed456',
      publishedAt: null,
    });
    expect(repository.attempts.at(-1)).toMatchObject({
      releaseId: repository.releases[1]?.id,
      status: 'failed',
      errorMessage: 'simulated transition failure',
    });
  });

  it('retries a failed manifest with the same release identity and a new attempt', async () => {
    let failNextBguTransition = true;
    const repository = new MemoryAdmissionsReleaseRepository({
      failTransition(programId) {
        if (programId !== 'bgu_cs' || !failNextBguTransition) return false;
        failNextBguTransition = false;
        return true;
      },
    });
    const publisher = createAdmissionsReleasePublisher(repository);
    const input = {
      manifest: {
        ...manifest,
        changes: [
          manifest.changes[0],
          {
            ...manifest.changes[1],
            target: { institutionId: 'bgu', programId: 'bgu_cs', cycle: '2027' },
          },
        ],
      },
      repositoryCommit: 'retry123',
    };

    await expect(publisher.publish(input)).rejects.toThrow('simulated transition failure');
    const failedReleaseId = repository.releases[0]?.id;

    await expect(publisher.publish(input)).resolves.toMatchObject({
      status: 'published',
      releaseId: failedReleaseId,
    });

    expect(repository.releases).toHaveLength(1);
    expect(repository.releases[0]).toMatchObject({
      id: failedReleaseId,
      status: 'published',
      repositoryCommit: 'retry123',
    });
    expect(repository.attempts).toHaveLength(2);
    expect(repository.attempts.map((attempt) => attempt.status)).toEqual(['failed', 'succeeded']);
    expect(repository.transitions).toHaveLength(2);
  });

  it('records a corrective rollback as a new reviewed release', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    const publisher = createAdmissionsReleasePublisher(repository);

    await publisher.publish({
      manifest,
      repositoryCommit: 'change123',
      publishedAt: new Date('2026-08-02T10:00:00.000Z'),
    });
    const correction = await publisher.publish({
      manifest: {
        ...manifest,
        changes: manifest.changes.map((change) => ({
          ...change,
          before: change.after,
          after: change.before,
          effectiveFrom: '2026-08-03',
        })),
      },
      repositoryCommit: 'revert456',
      publishedAt: new Date('2026-08-03T10:00:00.000Z'),
    });

    expect(correction.status).toBe('published');
    expect(repository.releases).toHaveLength(2);
    expect(repository.releases.map((release) => release.repositoryCommit)).toEqual([
      'change123',
      'revert456',
    ]);
    expect(repository.releases.every((release) => release.status === 'published')).toBe(true);
  });
});

class MemoryAdmissionsReleaseRepository
  implements AdmissionsReleaseRepository, AdmissionsReleaseWriter
{
  releases: AdmissionReleaseRecord[] = [];
  transitions: AdmissionTargetTransitionRecord[] = [];
  items: AdmissionReleaseItemRecord[] = [];
  attempts: AdmissionPublicationAttemptRecord[] = [];

  constructor(
    private readonly options: {
      failProgramId?: string;
      failTransition?: (programId: string) => boolean;
      hideExistingLookups?: number;
      rejectDuplicateReleaseInsert?: boolean;
    } = {},
  ) {}

  async transaction<T>(callback: (writer: AdmissionsReleaseWriter) => Promise<T>): Promise<T> {
    const snapshot = {
      releases: structuredClone(this.releases),
      transitions: structuredClone(this.transitions),
      items: structuredClone(this.items),
      attempts: structuredClone(this.attempts),
    };

    try {
      return await callback(this);
    } catch (error) {
      this.releases = snapshot.releases;
      this.transitions = snapshot.transitions;
      this.items = snapshot.items;
      this.attempts = snapshot.attempts;
      throw error;
    }
  }

  async findReleaseByManifestDigest(manifestDigest: string) {
    const remainingHiddenLookups = this.options.hideExistingLookups ?? 0;
    if (this.releases.length > 0 && remainingHiddenLookups > 0) {
      this.options.hideExistingLookups = remainingHiddenLookups - 1;
      return null;
    }
    return this.releases.find((release) => release.manifestDigest === manifestDigest) ?? null;
  }

  async createRelease(release: AdmissionReleaseRecord) {
    if (
      this.options.rejectDuplicateReleaseInsert &&
      this.releases.some((candidate) => candidate.manifestDigest === release.manifestDigest)
    ) {
      throw Object.assign(new Error('duplicate manifest digest'), { code: '23505' });
    }
    this.releases.push(release);
  }

  async createPublicationAttempt(attempt: AdmissionPublicationAttemptRecord) {
    this.attempts.push(attempt);
  }

  async createTargetTransition(transition: AdmissionTargetTransitionRecord) {
    if (
      transition.programId === this.options.failProgramId ||
      this.options.failTransition?.(transition.programId)
    ) {
      throw new Error('simulated transition failure');
    }
    this.transitions.push(transition);
  }

  async createReleaseItems(items: AdmissionReleaseItemRecord[]) {
    this.items.push(...items);
  }

  async markReleasePending(releaseId: string) {
    const release = this.releases.find((candidate) => candidate.id === releaseId);
    if (release) {
      release.status = 'pending';
      release.publishedAt = null;
    }
  }

  async markReleasePublished(releaseId: string, publishedAt: Date) {
    const release = this.releases.find((candidate) => candidate.id === releaseId);
    if (release) {
      release.status = 'published';
      release.publishedAt = publishedAt;
    }
  }

  async markReleaseFailed(releaseId: string) {
    const release = this.releases.find((candidate) => candidate.id === releaseId);
    if (release) {
      release.status = 'failed';
      release.publishedAt = null;
    }
  }

  async markPublicationAttemptSucceeded(attemptId: string, completedAt: Date) {
    const attempt = this.attempts.find((candidate) => candidate.id === attemptId);
    if (attempt) {
      attempt.status = 'succeeded';
      attempt.completedAt = completedAt;
    }
  }

  async markPublicationAttemptFailed(attemptId: string, errorMessage: string, completedAt: Date) {
    const attempt = this.attempts.find((candidate) => candidate.id === attemptId);
    if (attempt) {
      attempt.status = 'failed';
      attempt.errorMessage = errorMessage;
      attempt.completedAt = completedAt;
    }
  }
}
