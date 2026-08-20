import { describe, expect, it } from 'vitest';

import { persistAdmissionsSourceProofs, type SourceFreshnessRepository } from './sourceFreshness';
import type { AdmissionsSourceProof } from './admissionsSourceAdapters';

const checkedAt = new Date('2026-06-26T03:00:00.000Z');

class InMemorySourceFreshnessRepository implements SourceFreshnessRepository {
  checks: Parameters<SourceFreshnessRepository['recordCheck']>[0][] = [];
  ensuredSources: Parameters<SourceFreshnessRepository['ensureIngestionSource']>[0][] = [];
  reviewHandoffs: Parameters<SourceFreshnessRepository['createReviewHandoff']>[0][] = [];
  states = new Map<string, Awaited<ReturnType<SourceFreshnessRepository['getCurrentState']>>>();

  async ensureIngestionSource(
    descriptor: Parameters<SourceFreshnessRepository['ensureIngestionSource']>[0],
  ) {
    this.ensuredSources.push(descriptor);
  }

  async getCurrentState(sourceId: string) {
    return this.states.get(sourceId) ?? null;
  }

  async recordCheck(record: Parameters<SourceFreshnessRepository['recordCheck']>[0]) {
    this.checks.push(record);
  }

  async upsertCurrentState(
    state: NonNullable<Awaited<ReturnType<SourceFreshnessRepository['getCurrentState']>>>,
  ) {
    this.states.set(state.sourceId, state);
  }

  async createReviewHandoff(
    input: Parameters<SourceFreshnessRepository['createReviewHandoff']>[0],
  ) {
    this.reviewHandoffs.push(input);
    return {
      payloadId: `payload-${this.reviewHandoffs.length}`,
      reviewItemId: `review-${this.reviewHandoffs.length}`,
    };
  }
}

describe('persistAdmissionsSourceProofs', () => {
  it('stores a first successful decision-capable check as fresh without review work', async () => {
    const repository = new InMemorySourceFreshnessRepository();

    const result = await persistAdmissionsSourceProofs({
      checkedAt,
      proofs: [decisionProof({ threshold: 700 })],
      repository,
    });

    expect(result).toMatchObject({ fresh: 1, reviewsCreated: 0, total: 1 });
    expect(repository.ensuredSources[0]).toMatchObject({
      id: 'tau-source',
      institutionId: 'tau',
      difficulty: 'easy',
    });
    expect(repository.states.get('tau-source')).toMatchObject({
      status: 'fresh',
      lastCheckedAt: checkedAt,
      lastSuccessfulCheckAt: checkedAt,
      lastExactCheckAt: checkedAt,
      proofLevel: 'exact_official',
      decisionProvenance: 'verified_derivation',
      latestReviewItemId: undefined,
    });
    expect(repository.reviewHandoffs).toHaveLength(0);
  });

  it('keeps unchanged fingerprints fresh while recording every check', async () => {
    const repository = new InMemorySourceFreshnessRepository();
    const proof = decisionProof({ threshold: 700 });

    await persistAdmissionsSourceProofs({ checkedAt, proofs: [proof], repository });
    await persistAdmissionsSourceProofs({
      checkedAt: new Date('2026-07-03T03:00:00.000Z'),
      proofs: [proof],
      repository,
    });

    expect(repository.checks).toHaveLength(2);
    expect(repository.states.get('tau-source')).toMatchObject({
      status: 'fresh',
      latestReviewItemId: undefined,
    });
  });

  it('creates one pending review handoff for a changed decision-capable fingerprint', async () => {
    const repository = new InMemorySourceFreshnessRepository();

    await persistAdmissionsSourceProofs({
      checkedAt,
      proofs: [decisionProof({ threshold: 700 })],
      repository,
    });
    await persistAdmissionsSourceProofs({
      checkedAt: new Date('2026-07-03T03:00:00.000Z'),
      proofs: [decisionProof({ threshold: 710 })],
      repository,
    });
    await persistAdmissionsSourceProofs({
      checkedAt: new Date('2026-07-10T03:00:00.000Z'),
      proofs: [decisionProof({ threshold: 710 })],
      repository,
    });

    expect(repository.reviewHandoffs).toHaveLength(1);
    expect(repository.reviewHandoffs[0]).toMatchObject({
      sourceId: 'tau-source',
      targetField: 'sourceFreshness',
    });
    expect(repository.states.get('tau-source')).toMatchObject({
      status: 'changed_needs_review',
      latestReviewItemId: 'review-1',
    });
  });

  it('tracks changed score-only output without creating acceptance review work', async () => {
    const repository = new InMemorySourceFreshnessRepository();

    await persistAdmissionsSourceProofs({
      checkedAt,
      proofs: [scoreOnlyProof({ score: 91 })],
      repository,
    });
    await persistAdmissionsSourceProofs({
      checkedAt: new Date('2026-07-03T03:00:00.000Z'),
      proofs: [scoreOnlyProof({ score: 93 })],
      repository,
    });

    expect(repository.states.get('technion-source')).toMatchObject({
      capability: 'score_only',
      status: 'changed_needs_review',
      latestReviewItemId: undefined,
    });
    expect(repository.checks.at(-1)).toMatchObject({
      reviewWorthy: false,
      status: 'changed_needs_review',
    });
    expect(repository.reviewHandoffs).toHaveLength(0);
  });

  it('records failed checks with a reason without producing review work', async () => {
    const repository = new InMemorySourceFreshnessRepository();

    const result = await persistAdmissionsSourceProofs({
      checkedAt,
      proofs: [
        decisionProof({
          status: 'failed',
          errorReason: 'Official endpoint timed out',
          threshold: 700,
        }),
      ],
      repository,
    });

    expect(result).toMatchObject({ failed: 1, reviewsCreated: 0, total: 1 });
    expect(repository.states.get('tau-source')).toMatchObject({
      status: 'failed',
      latestFailureReason: 'Official endpoint timed out',
      lastSuccessfulCheckAt: undefined,
    });
    expect(repository.reviewHandoffs).toHaveLength(0);
  });

  it('does not renew exact authority for a partial proof', async () => {
    const repository = new InMemorySourceFreshnessRepository();
    await persistAdmissionsSourceProofs({
      checkedAt,
      proofs: [decisionProof({ threshold: 700 })],
      repository,
    });

    await persistAdmissionsSourceProofs({
      checkedAt: new Date('2026-07-03T03:00:00.000Z'),
      proofs: [
        {
          ...decisionProof({ threshold: 700 }),
          capability: 'score_only',
          proofLevel: 'partial_official',
          status: 'partial',
          decisionProvenance: 'none',
        },
      ],
      repository,
    });

    expect(repository.states.get('tau-source')?.lastExactCheckAt).toEqual(checkedAt);
    expect(repository.checks.at(-1)).toMatchObject({ exactQualified: false });
  });

  it('revokes changed authority before a review handoff can fail', async () => {
    const repository = new InMemorySourceFreshnessRepository();
    await persistAdmissionsSourceProofs({
      checkedAt,
      proofs: [decisionProof({ threshold: 700 })],
      repository,
    });
    repository.createReviewHandoff = async () => {
      throw new Error('Review queue unavailable');
    };

    await expect(
      persistAdmissionsSourceProofs({
        checkedAt: new Date('2026-07-03T03:00:00.000Z'),
        proofs: [decisionProof({ threshold: 710 })],
        repository,
      }),
    ).rejects.toThrow('Review queue unavailable');

    expect(repository.states.get('tau-source')).toMatchObject({
      status: 'changed_needs_review',
      lastExactCheckAt: checkedAt,
    });
  });
});

function decisionProof(overrides: {
  errorReason?: string;
  status?: AdmissionsSourceProof['status'];
  threshold: number;
}): AdmissionsSourceProof {
  return {
    id: 'tau-source',
    institutionId: 'tau',
    institutionName: 'Tel Aviv University',
    officialUrl: 'https://go.tau.ac.il/graphql',
    adapterId: 'tau',
    capability: 'decision_capable',
    proofLevel: 'exact_official',
    status: overrides.status ?? 'succeeded',
    decisionProvenance: 'verified_derivation',
    reviewedSourceFingerprint:
      'sha256:7c91772f918b0bc07901b299351f45c6d6aef8bfd15e752df5de6588cd1c507c',
    sourceClass: 'api_static_json',
    reproducedFields: ['selectedScore', 'acceptanceThreshold'],
    normalizedPayload: {
      acceptanceThreshold: overrides.threshold,
      selectedScore: 715,
    },
    limitations: [],
    nextAction: 'Review changed threshold before publication',
    errorReason: overrides.errorReason,
  };
}

function scoreOnlyProof({ score }: { score: number }): AdmissionsSourceProof {
  return {
    id: 'technion-source',
    institutionId: 'technion',
    institutionName: 'Technion',
    officialUrl: 'https://admissions.technion.ac.il/calculator',
    adapterId: 'capability_matrix',
    capability: 'score_only',
    proofLevel: 'partial_official',
    status: 'partial',
    decisionProvenance: 'none',
    sourceClass: 'score_only_calculator',
    reproducedFields: ['sekhemScore'],
    normalizedPayload: {
      sekhemScore: score,
    },
    limitations: ['No official acceptance threshold returned'],
    nextAction: 'Pair calculator output with a reviewed threshold source',
  };
}
