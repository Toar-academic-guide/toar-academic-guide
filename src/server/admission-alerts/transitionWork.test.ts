import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  enqueueAdmissionAlertTransitionWork,
  type AdmissionAlertTransitionWorkRepository,
} from './transitionWork';

describe('admission alert transition work', () => {
  it('creates one durable work item per transition for a published release', async () => {
    const repository = new MemoryTransitionWorkRepository({
      releases: new Map([
        ['release-1', { status: 'published', transitionIds: ['transition-a', 'transition-b'] }],
      ]),
    });

    await expect(
      enqueueAdmissionAlertTransitionWork({ releaseId: 'release-1', repository }),
    ).resolves.toEqual({ status: 'enqueued', createdWorkCount: 2 });
    await expect(
      enqueueAdmissionAlertTransitionWork({ releaseId: 'release-1', repository }),
    ).resolves.toEqual({ status: 'enqueued', createdWorkCount: 0 });
  });

  it('refuses unpublished, proof, and unknown releases', async () => {
    const repository = new MemoryTransitionWorkRepository({
      releases: new Map([
        ['release-pending', { status: 'pending', transitionIds: ['transition-a'] }],
        [
          'release-proof',
          {
            status: 'published',
            releaseKind: 'operational_proof',
            transitionIds: ['transition-b'],
          },
        ],
      ]),
    });

    await expect(
      enqueueAdmissionAlertTransitionWork({ releaseId: 'release-pending', repository }),
    ).resolves.toEqual({ status: 'not_processable' });
    await expect(
      enqueueAdmissionAlertTransitionWork({ releaseId: 'missing-release', repository }),
    ).resolves.toEqual({ status: 'not_processable' });
    await expect(
      enqueueAdmissionAlertTransitionWork({ releaseId: 'release-proof', repository }),
    ).resolves.toEqual({ status: 'not_processable' });
  });
});

class MemoryTransitionWorkRepository implements AdmissionAlertTransitionWorkRepository {
  private readonly work = new Set<string>();

  constructor(
    private readonly options: {
      releases: Map<
        string,
        {
          status: 'pending' | 'published' | 'failed';
          releaseKind?: 'canonical_bootstrap' | 'canonical_change' | 'operational_proof';
          transitionIds: string[];
        }
      >;
    },
  ) {}

  async getPublishedCanonicalRelease(releaseId: string) {
    const release = this.options.releases.get(releaseId);
    return release?.status === 'published' &&
      (release.releaseKind ?? 'canonical_change') === 'canonical_change'
      ? { id: releaseId }
      : null;
  }

  async listTransitionIds(releaseId: string) {
    return this.options.releases.get(releaseId)?.transitionIds ?? [];
  }

  async createWork(transitionId: string) {
    if (this.work.has(transitionId)) return false;
    this.work.add(transitionId);
    return true;
  }
}
