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
    expect(retry).toEqual({ status: 'already_published', releaseId: first.releaseId });
    expect(repository.releases).toHaveLength(1);
    expect(repository.transitions).toHaveLength(1);
  });

  it('rolls back the entire release when one target transition cannot be written', async () => {
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

    expect(repository.releases).toEqual([]);
    expect(repository.transitions).toEqual([]);
    expect(repository.items).toEqual([]);
  });
});

class MemoryAdmissionsReleaseRepository
  implements AdmissionsReleaseRepository, AdmissionsReleaseWriter
{
  releases: AdmissionReleaseRecord[] = [];
  transitions: AdmissionTargetTransitionRecord[] = [];
  items: AdmissionReleaseItemRecord[] = [];
  attempts: AdmissionPublicationAttemptRecord[] = [];

  constructor(private readonly options: { failProgramId?: string } = {}) {}

  async transaction<T>(callback: (writer: AdmissionsReleaseWriter) => Promise<T>): Promise<T> {
    const snapshot = {
      releases: [...this.releases],
      transitions: [...this.transitions],
      items: [...this.items],
      attempts: [...this.attempts],
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
    return this.releases.find((release) => release.manifestDigest === manifestDigest) ?? null;
  }

  async createRelease(release: AdmissionReleaseRecord) {
    this.releases.push(release);
  }

  async createPublicationAttempt(attempt: AdmissionPublicationAttemptRecord) {
    this.attempts.push(attempt);
  }

  async createTargetTransition(transition: AdmissionTargetTransitionRecord) {
    if (transition.programId === this.options.failProgramId) {
      throw new Error('simulated transition failure');
    }
    this.transitions.push(transition);
  }

  async createReleaseItems(items: AdmissionReleaseItemRecord[]) {
    this.items.push(...items);
  }

  async markReleasePublished(releaseId: string, publishedAt: Date) {
    const release = this.releases.find((candidate) => candidate.id === releaseId);
    if (release) {
      release.status = 'published';
      release.publishedAt = publishedAt;
    }
  }

  async markPublicationAttemptSucceeded(attemptId: string, completedAt: Date) {
    const attempt = this.attempts.find((candidate) => candidate.id === attemptId);
    if (attempt) {
      attempt.status = 'succeeded';
      attempt.completedAt = completedAt;
    }
  }
}
