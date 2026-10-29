import { describe, expect, it, vi } from 'vitest';

import reviewedManifest from './__fixtures__/reviewedManifest-2026-10-25.json';
import technionWinterManifest from './__fixtures__/technionWinterManifest.json';

vi.mock('server-only', () => ({}));

import {
  createAdmissionsReleasePublisher,
  createDrizzleAdmissionsReleaseRepository,
  type AdmissionPublicationAttemptRecord,
  type AdmissionReleaseItemRecord,
  type AdmissionReleaseRecord,
  type AdmissionTargetTransitionRecord,
  type AdmissionsReleaseRepository,
  type AdmissionsReleaseWriter,
  type PublishedAdmissionCutoffChange,
} from './admissionsReleasePublisher';

const manifest = {
  version: 2,
  releaseKind: 'canonical_change' as const,
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
          proofType: 'exact_official' as const,
        },
      ],
    },
  ],
};

const bguChange = {
  ...manifest.changes[0],
  target: { institutionId: 'bgu', programId: 'bgu_cs', cycle: '2027' },
  sourceProofs: [
    {
      ...manifest.changes[0]!.sourceProofs[0],
      sourceId: 'bgu-computer-science',
      digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      excerpt: 'Current published admission cutoff: 700.',
      url: 'https://in.bgu.ac.il/welcome/Pages/default.aspx',
    },
  ],
};

describe('admissions release publisher', () => {
  it.each([
    ['fixture', technionWinterManifest],
    [
      'repository',
      {
        ...reviewedManifest,
        changes: reviewedManifest.changes.filter((change) =>
          technionWinterManifest.changes.some(
            (winter) =>
              winter.target.programId === change.target?.programId &&
              winter.target.institutionId === change.target.institutionId &&
              winter.target.cycle === change.target.cycle &&
              winter.ruleKind === change.ruleKind,
          ),
        ),
      },
    ],
  ])(
    'publishes the reviewed winter Technion cutoffs and legacy aliases once with their ledger (%s)',
    async (_source, reviewedManifest) => {
      const repository = new MemoryAdmissionsReleaseRepository();
      const expected = [
        ['technion_ee', 94, 91.5],
        ['technion_me', 92, 87],
        ['ee', 94, 91.5],
        ['me', 92, 87],
      ] as const;
      expect(reviewedManifest.releaseKind).toBe('canonical_change');
      expect(
        reviewedManifest.changes.map(({ target, before, after }) => [
          target.programId,
          before,
          after,
        ]),
      ).toEqual(expected);
      for (const [id, before] of expected)
        repository.canonicalCutoffs.set(`technion:${id}`, before);
      const publisher = createAdmissionsReleasePublisher(repository);
      const input = { manifest: reviewedManifest, repositoryCommit: 'technion-winter-reviewed' };

      await expect(publisher.publish(input)).resolves.toMatchObject({ status: 'published' });
      await expect(publisher.publish(input)).resolves.toMatchObject({
        status: 'already_published',
      });

      expect(repository.releases).toHaveLength(1);
      expect(repository.transitions).toHaveLength(4);
      expect(repository.items).toHaveLength(4);
      for (const [programId, before, after] of expected) {
        expect(repository.canonicalCutoffs.get(`technion:${programId}`)).toBe(after);
        const transition = repository.transitions.find((item) => item.programId === programId)!;
        expect(transition).toMatchObject({ institutionId: 'technion', cycle: '2027' });
        expect(repository.items.find((item) => item.transitionId === transition.id)).toMatchObject({
          beforeValue: { value: before },
          afterValue: { value: after },
          effectiveFrom: '2026-10-25',
          sourceProofs: [expect.objectContaining({ proofType: 'exact_official' })],
        });
      }
      expect(repository.canonicalCutoffs.get('tau:tau_cs')).toBe(706);
    },
  );

  it('skips and reports a cutoff already at after while publishing the remaining change', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    repository.canonicalCutoffs.set('bgu:bgu_cs', 700);
    const writes = vi.spyOn(repository.canonicalCutoffs, 'set');
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const result = await createAdmissionsReleasePublisher(repository).publish({
        manifest: { ...manifest, changes: [bguChange, manifest.changes[0]] },
        repositoryCommit: 'carry-forward-mixed',
      });

      expect(result).toMatchObject({
        status: 'published',
        alreadyApplied: [{ target: bguChange.target, ruleKind: 'admission_cutoff' }],
      });
      expect(repository.canonicalCutoffs.get('tau:tau_cs')).toBe(700);
      expect(repository.canonicalCutoffs.get('bgu:bgu_cs')).toBe(700);
      expect(writes).not.toHaveBeenCalledWith('bgu:bgu_cs', 700);
      expect(repository.transitions).toEqual([
        expect.objectContaining({ institutionId: 'tau', programId: 'tau_cs' }),
      ]);
      expect(repository.items).toHaveLength(1);
      expect(repository.items[0]).toMatchObject({
        transitionId: repository.transitions[0].id,
        beforeValue: { value: 706 },
        afterValue: { value: 700 },
      });
      expect(repository.releases[0].status).toBe('published');
      expect(repository.attempts[0].status).toBe('succeeded');
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'admissions_release_change_already_applied',
          releaseId: repository.releases[0].id,
          institutionId: 'bgu',
          programId: 'bgu_cs',
          ruleKind: 'admission_cutoff',
        }),
      );
    } finally {
      log.mockRestore();
    }
  });

  it('applies a cutoff at before and reports no already-applied targets', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    const result = await createAdmissionsReleasePublisher(repository).publish({
      manifest,
      repositoryCommit: 'at-before',
    });

    expect(result).toMatchObject({ status: 'published', alreadyApplied: [] });
    expect(repository.canonicalCutoffs.get('tau:tau_cs')).toBe(700);
    expect(repository.transitions).toHaveLength(1);
    expect(repository.items).toHaveLength(1);
    expect(repository.items[0]).toMatchObject({
      beforeValue: { value: 706 },
      afterValue: { value: 700 },
    });
  });

  it.each(['neither before nor after', 'missing row'])(
    'rolls back valid writes and skipped targets when a later cutoff is %s',
    async (scenario) => {
      const repository = new MemoryAdmissionsReleaseRepository();
      const validChange = {
        ...bguChange,
        target: { ...bguChange.target, programId: 'bgu_chem' },
      };
      repository.canonicalCutoffs.set('bgu:bgu_chem', 706);
      repository.canonicalCutoffs.set('bgu:bgu_cs', 700);
      if (scenario === 'missing row') repository.canonicalCutoffs.delete('tau:tau_cs');
      else repository.canonicalCutoffs.set('tau:tau_cs', 705);
      const originalCutoffs = structuredClone(repository.canonicalCutoffs);
      const log = vi.spyOn(console, 'info').mockImplementation(() => {});
      try {
        await expect(
          createAdmissionsReleasePublisher(repository).publish({
            manifest: { ...manifest, changes: [validChange, bguChange, manifest.changes[0]] },
            repositoryCommit: 'carry-forward-conflict',
          }),
        ).rejects.toThrow('canonical cutoff tau:tau_cs did not match its expected before value');

        expect(repository.canonicalCutoffs).toEqual(originalCutoffs);
        expect(repository.canonicalCutoffs.get('bgu:bgu_chem')).toBe(706);
        expect(repository.transitions).toEqual([]);
        expect(repository.items).toEqual([]);
        expect(repository.releases).toEqual([
          expect.objectContaining({
            status: 'failed',
            publishedAt: null,
          }),
        ]);
        expect(repository.attempts).toEqual([
          expect.objectContaining({
            status: 'failed',
            errorMessage: 'canonical cutoff tau:tau_cs did not match its expected before value',
          }),
        ]);
        expect(log).not.toHaveBeenCalled();
      } finally {
        log.mockRestore();
      }
    },
  );

  it('publishes Technion civil alongside four already-published winter changes and aliases', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    for (const [programId, value] of [
      ['technion_ee', 91.5],
      ['ee', 91.5],
      ['technion_me', 87],
      ['me', 87],
    ] as const)
      repository.canonicalCutoffs.set(`technion:${programId}`, value);
    repository.canonicalCutoffs.set('technion:technion_civil', 88);
    const civilChange = {
      ...technionWinterManifest.changes[0],
      target: { institutionId: 'technion', programId: 'technion_civil', cycle: '2027' },
      before: 88,
      after: 87,
      sourceProofs: [
        {
          ...technionWinterManifest.changes[0].sourceProofs[0],
          sourceId: 'technion-technion_civil-live',
          excerpt: 'Fixture: Civil Engineering cutoff 87.',
        },
      ],
    };
    const result = await createAdmissionsReleasePublisher(repository).publish({
      manifest: {
        ...technionWinterManifest,
        changes: [...technionWinterManifest.changes, civilChange],
      },
      repositoryCommit: 'technion-w43-carried-forward',
    });

    expect(result.status).toBe('published');
    if (result.status !== 'published') throw new Error('Expected a published release.');
    expect(result.alreadyApplied).toEqual(
      ['ee', 'me', 'technion_ee', 'technion_me'].map((programId) => ({
        target: { institutionId: 'technion', programId, cycle: '2027' },
        ruleKind: 'admission_cutoff',
      })),
    );
    expect(repository.canonicalCutoffs.get('technion:technion_civil')).toBe(87);
    expect(repository.transitions).toEqual([
      expect.objectContaining({
        institutionId: 'technion',
        programId: 'technion_civil',
        cycle: '2027',
      }),
    ]);
    expect(repository.items).toEqual([
      expect.objectContaining({
        transitionId: repository.transitions[0].id,
        beforeValue: { value: 88 },
        afterValue: { value: 87 },
      }),
    ]);
    expect(repository.releases[0].status).toBe('published');
    expect(repository.attempts[0].status).toBe('succeeded');
  });

  it('publishes an entirely already-applied manifest without claiming any transitions or items', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    repository.canonicalCutoffs.set('tau:tau_cs', 700);
    const writes = vi.spyOn(repository.canonicalCutoffs, 'set');

    await expect(
      createAdmissionsReleasePublisher(repository).publish({
        manifest,
        repositoryCommit: 'all-already-applied',
      }),
    ).resolves.toMatchObject({
      status: 'published',
      alreadyApplied: [{ target: manifest.changes[0].target, ruleKind: 'admission_cutoff' }],
    });

    expect(writes).not.toHaveBeenCalled();
    expect(repository.transitions).toEqual([]);
    expect(repository.items).toEqual([]);
    expect(repository.releases[0].status).toBe('published');
    expect(repository.attempts[0].status).toBe('succeeded');
  });

  it('does not create a release for an empty reviewed manifest', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    const publisher = createAdmissionsReleasePublisher(repository);

    await expect(
      publisher.publish({
        manifest: { version: 2, releaseKind: 'canonical_change', changes: [] },
        repositoryCommit: 'abc123',
      }),
    ).resolves.toEqual({ status: 'no_changes' });

    expect(repository.releases).toEqual([]);
    expect(repository.transitions).toEqual([]);
  });

  it('does not initialize the database repository for an empty reviewed manifest', async () => {
    await expect(
      createAdmissionsReleasePublisher().publish({
        manifest: { version: 2, releaseKind: 'canonical_change', changes: [] },
        repositoryCommit: 'abc123',
      }),
    ).resolves.toEqual({ status: 'no_changes' });
  });

  it('publishes one supported cutoff as one atomic transition', async () => {
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
    expect(repository.items).toHaveLength(1);
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
            ...bguChange,
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
              ...bguChange,
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
              ...bguChange,
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
            ...bguChange,
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

  it('does not overlap a retry with an existing pending publication attempt', async () => {
    const repository = new MemoryAdmissionsReleaseRepository({ failProgramId: 'bgu_cs' });
    const publisher = createAdmissionsReleasePublisher(repository);
    const input = {
      manifest: {
        ...manifest,
        changes: [
          manifest.changes[0],
          {
            ...bguChange,
          },
        ],
      },
      repositoryCommit: 'pending123',
    };

    await expect(publisher.publish(input)).rejects.toThrow('simulated transition failure');
    repository.releases[0]!.status = 'pending';

    await expect(publisher.publish(input)).rejects.toThrow(
      'already has a publication attempt in progress',
    );
    expect(repository.attempts).toHaveLength(1);
  });

  it('requires a failed release retry to use the original repository commit', async () => {
    const repository = new MemoryAdmissionsReleaseRepository({ failProgramId: 'bgu_cs' });
    const publisher = createAdmissionsReleasePublisher(repository);
    const failedManifest = {
      ...manifest,
      changes: [
        manifest.changes[0],
        {
          ...bguChange,
        },
      ],
    };

    await expect(
      publisher.publish({ manifest: failedManifest, repositoryCommit: 'original123' }),
    ).rejects.toThrow('simulated transition failure');

    await expect(
      publisher.publish({ manifest: failedManifest, repositoryCommit: 'different456' }),
    ).rejects.toThrow('retry it with the same commit');
    expect(repository.releases).toHaveLength(1);
    expect(repository.attempts).toHaveLength(1);
  });

  it('preserves both errors when durable failure recording also fails', async () => {
    const repository = new MemoryAdmissionsReleaseRepository({
      failProgramId: 'bgu_cs',
      failFailureRecording: true,
    });
    const publisher = createAdmissionsReleasePublisher(repository);

    await expect(
      publisher.publish({
        manifest: {
          ...manifest,
          changes: [
            manifest.changes[0],
            {
              ...bguChange,
            },
          ],
        },
        repositoryCommit: 'recording123',
      }),
    ).rejects.toThrow('failed and its failure record could not be persisted');

    expect(repository.releases[0]).toMatchObject({ status: 'pending' });
    expect(repository.attempts[0]).toMatchObject({ status: 'started' });
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

  it('atomically rejects a canonical cutoff when production no longer matches before', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    repository.canonicalCutoffs.set('tau:tau_cs', 705);

    await expect(
      createAdmissionsReleasePublisher(repository).publish({
        manifest,
        repositoryCommit: 'stale-before',
      }),
    ).rejects.toThrow('expected before value');

    expect(repository.canonicalCutoffs.get('tau:tau_cs')).toBe(705);
    expect(repository.transitions).toEqual([]);
    expect(repository.releases).toEqual([expect.objectContaining({ status: 'failed' })]);
  });

  it('allows an unchanged exact-official canonical bootstrap to establish a release ledger', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    const bootstrap = {
      ...manifest,
      releaseKind: 'canonical_bootstrap' as const,
      changes: manifest.changes.map((change) => ({ ...change, after: change.before })),
    };

    await expect(
      createAdmissionsReleasePublisher(repository).publish({
        manifest: bootstrap,
        repositoryCommit: 'bootstrap123',
      }),
    ).resolves.toMatchObject({ status: 'published' });

    expect(repository.canonicalCutoffs.get('tau:tau_cs')).toBe(706);
    expect(repository.releases[0]).toMatchObject({
      releaseKind: 'canonical_bootstrap',
      proofScenario: null,
    });
  });

  it('fails closed for rule kinds that have no publisher mapping', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    await expect(
      createAdmissionsReleasePublisher(repository).publish({
        manifest: {
          ...manifest,
          changes: [{ ...manifest.changes[0], ruleKind: 'minimum_gate' }],
        },
        repositoryCommit: 'unsupported-rule',
      }),
    ).rejects.toThrow('Unsupported admissions release rule');
    expect(repository.releases).toEqual([]);
  });

  it('keeps operational proof values isolated through failure, retry, idempotency, and correction', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    const publisher = createAdmissionsReleasePublisher(repository);
    const proof = operationalProofManifest();

    await expect(
      publisher.publish({
        manifest: proof,
        repositoryCommit: 'proof-retry123',
        proofFailureStage: 'after_attempt_started',
        proofConfirmationId: 'proof-plan001-20260820',
      }),
    ).rejects.toThrow('Controlled operational-proof failure');
    const failedReleaseId = repository.releases[0]?.id;
    expect(repository.releases[0]).toMatchObject({
      status: 'failed',
      releaseKind: 'operational_proof',
      proofScenario: 'proof-plan001-20260820',
    });
    expect(repository.transitions).toEqual([]);
    expect(repository.operationalProofCutoffs.size).toBe(0);
    expect(repository.canonicalCutoffs).toEqual(
      new Map([
        ['tau:tau_cs', 706],
        ['bgu:bgu_cs', 706],
      ]),
    );

    const retry = await publisher.publish({ manifest: proof, repositoryCommit: 'proof-retry123' });
    expect(retry).toMatchObject({ status: 'published', releaseId: failedReleaseId });
    expect(repository.attempts.map((attempt) => attempt.status)).toEqual(['failed', 'succeeded']);
    expect(repository.operationalProofCutoffs).toEqual(
      new Map([
        ['tau:tau_cs:2099', 700],
        ['bgu:bgu_cs:2099', 700],
      ]),
    );
    await expect(
      publisher.publish({ manifest: proof, repositoryCommit: 'proof-retry123' }),
    ).resolves.toEqual({
      status: 'already_published',
      releaseId: failedReleaseId,
    });

    await publisher.publish({
      manifest: operationalProofManifest({
        before: 700,
        after: 706,
        proofScenario: 'proof-corrective',
      }),
      repositoryCommit: 'proof-corrective123',
    });
    expect(repository.operationalProofCutoffs.get('tau:tau_cs:2099')).toBe(706);
    expect(repository.operationalProofCutoffs.get('bgu:bgu_cs:2099')).toBe(706);
    expect(repository.canonicalCutoffs.get('tau:tau_cs')).toBe(706);
    expect(repository.canonicalCutoffs.get('bgu:bgu_cs')).toBe(706);
    expect(repository.releases).toHaveLength(2);
  });

  it('rejects fault injection outside the matching operational proof before creating a release', async () => {
    const repository = new MemoryAdmissionsReleaseRepository();
    await expect(
      createAdmissionsReleasePublisher(repository).publish({
        manifest,
        repositoryCommit: 'canonical-fault',
        proofFailureStage: 'after_attempt_started',
        proofConfirmationId: 'proof-plan001-20260820',
      }),
    ).rejects.toThrow('Controlled publication failure is allowed only');
    expect(repository.releases).toEqual([]);
  });
});

describe('Drizzle canonical cutoff writer', () => {
  it.each([
    {
      scenario: 'guarded update matches before',
      updated: [{ id: 'tau-cutoff' }],
      current: [],
      expected: 'applied',
    },
    {
      scenario: 'current row already equals after',
      updated: [],
      current: [{ thresholdValue: 700 }],
      expected: 'already_applied',
    },
    {
      scenario: 'current row still equals before',
      updated: [],
      current: [{ thresholdValue: 706 }],
      expected: 'error',
    },
    {
      scenario: 'current row equals neither value',
      updated: [],
      current: [{ thresholdValue: 705 }],
      expected: 'error',
    },
    { scenario: 'current row is missing', updated: [], current: [], expected: 'error' },
  ])('uses transactional cutoff state when $scenario', async ({ updated, current, expected }) => {
    const updateQuery = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn(async () => updated),
    };
    const selectQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      for: vi.fn(async () => current),
    };
    const tx = {
      update: vi.fn(() => updateQuery),
      select: vi.fn(() => selectQuery),
    };
    const db = {
      transaction: async <T>(callback: (writer: typeof tx) => Promise<T>) => callback(tx),
    } as unknown as Parameters<typeof createDrizzleAdmissionsReleaseRepository>[0];
    const repository = createDrizzleAdmissionsReleaseRepository(db);
    const result = repository.transaction((writer) =>
      writer.applyCanonicalAdmissionCutoff({
        change: manifest.changes[0],
        allowAlreadyApplied: true,
      }),
    );

    if (expected === 'error') await expect(result).rejects.toThrow('expected before value');
    else await expect(result).resolves.toBe(expected);
    if (updated.length === 0) expect(selectQuery.for).toHaveBeenCalledWith('update');
    else expect(tx.select).not.toHaveBeenCalled();
  });
});

function operationalProofManifest(
  input: {
    before?: number;
    after?: number;
    proofScenario?: string;
  } = {},
) {
  const before = input.before ?? 706;
  const after = input.after ?? 700;
  const proofScenario = input.proofScenario ?? 'proof-plan001-20260820';
  return {
    version: 2,
    releaseKind: 'operational_proof' as const,
    proofScenario,
    changes: [manifest.changes[0], bguChange].map((change) => ({
      ...change,
      target: { ...change.target, cycle: '2099' },
      before,
      after,
      sourceProofs: [
        {
          ...change.sourceProofs[0],
          proofType: 'controlled_fixture' as const,
        },
      ],
    })),
  };
}

class MemoryAdmissionsReleaseRepository
  implements AdmissionsReleaseRepository, AdmissionsReleaseWriter
{
  releases: AdmissionReleaseRecord[] = [];
  transitions: AdmissionTargetTransitionRecord[] = [];
  items: AdmissionReleaseItemRecord[] = [];
  attempts: AdmissionPublicationAttemptRecord[] = [];
  canonicalCutoffs = new Map<string, number>([
    ['tau:tau_cs', 706],
    ['bgu:bgu_cs', 706],
  ]);
  operationalProofCutoffs = new Map<string, number>();

  constructor(
    private readonly options: {
      failProgramId?: string;
      failTransition?: (programId: string) => boolean;
      failFailureRecording?: boolean;
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
      canonicalCutoffs: structuredClone(this.canonicalCutoffs),
      operationalProofCutoffs: structuredClone(this.operationalProofCutoffs),
    };

    try {
      return await callback(this);
    } catch (error) {
      this.releases = snapshot.releases;
      this.transitions = snapshot.transitions;
      this.items = snapshot.items;
      this.attempts = snapshot.attempts;
      this.canonicalCutoffs = snapshot.canonicalCutoffs;
      this.operationalProofCutoffs = snapshot.operationalProofCutoffs;
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

  async applyCanonicalAdmissionCutoff({
    change,
    allowAlreadyApplied = false,
  }: {
    change: PublishedAdmissionCutoffChange;
    allowAlreadyApplied?: boolean;
  }): Promise<'applied' | 'already_applied'> {
    const key = `${change.target.institutionId}:${change.target.programId}`;
    if (this.canonicalCutoffs.get(key) !== change.before) {
      if (allowAlreadyApplied && this.canonicalCutoffs.get(key) === change.after) {
        return 'already_applied';
      }
      throw new Error(`canonical cutoff ${key} did not match its expected before value`);
    }
    this.canonicalCutoffs.set(key, change.after);
    return 'applied';
  }

  async applyOperationalProofAdmissionCutoff({
    change,
  }: {
    releaseId: string;
    change: PublishedAdmissionCutoffChange;
    updatedAt: Date;
  }) {
    const key = `${change.target.institutionId}:${change.target.programId}:${change.target.cycle}`;
    const existing = this.operationalProofCutoffs.get(key);
    if (existing === undefined) {
      const canonical = this.canonicalCutoffs.get(
        `${change.target.institutionId}:${change.target.programId}`,
      );
      if (canonical !== change.before) {
        throw new Error(`operational proof cutoff ${key} must start from canonical before value`);
      }
    } else if (existing !== change.before) {
      throw new Error(`operational proof cutoff ${key} did not match its expected before value`);
    }
    this.operationalProofCutoffs.set(key, change.after);
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
    if (this.options.failFailureRecording) {
      throw new Error('simulated failure-recording error');
    }
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
