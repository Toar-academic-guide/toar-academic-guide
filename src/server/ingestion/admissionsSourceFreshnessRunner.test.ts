import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  parseAdmissionsSourceFreshnessArgs,
  runAdmissionsSourceFreshness,
} from './admissionsSourceFreshnessRunner';
import type { AdmissionsLiveProofReport } from './admissionsLiveProofRunner';
import type { AdmissionsSourceProof } from './admissionsSourceAdapters';
import type { SourceFreshnessRepository } from './sourceFreshness';

class InMemorySourceFreshnessRepository implements SourceFreshnessRepository {
  checks: Parameters<SourceFreshnessRepository['recordCheck']>[0][] = [];
  states = new Map<
    string,
    NonNullable<Awaited<ReturnType<SourceFreshnessRepository['getCurrentState']>>>
  >();

  async ensureIngestionSource() {}

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

  async createReviewHandoff() {
    return {
      payloadId: 'payload-1',
      reviewItemId: 'review-1',
    };
  }
}

describe('parseAdmissionsSourceFreshnessArgs', () => {
  it('defaults scheduled runs to the full capability matrix', () => {
    expect(parseAdmissionsSourceFreshnessArgs([])).toEqual({
      dryRun: false,
      includeCapabilityMatrix: true,
      targetIds: undefined,
    });
  });

  it('supports manual target and dry-run arguments', () => {
    expect(parseAdmissionsSourceFreshnessArgs(['--dry-run', '--target', 'haifa-cs-live'])).toEqual({
      dryRun: true,
      includeCapabilityMatrix: true,
      targetIds: ['haifa-cs-live'],
    });
  });
});

describe('runAdmissionsSourceFreshness', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails configuration before source checks when DATABASE_URL is missing', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const proofRunner = vi.fn<() => Promise<AdmissionsLiveProofReport>>();

    await expect(
      runAdmissionsSourceFreshness({
        proofRunner,
      }),
    ).rejects.toThrow(/Missing DATABASE_URL/);
    expect(proofRunner).not.toHaveBeenCalled();
  });

  it('persists mixed source-level success and failure without aborting the batch', async () => {
    const repository = new InMemorySourceFreshnessRepository();

    const result = await runAdmissionsSourceFreshness({
      checkedAt: new Date('2026-06-26T03:00:00.000Z'),
      proofRunner: async () =>
        reportForProofs([decisionProof('succeeded'), decisionProof('failed')]),
      repository,
    });

    expect(result.report.summary).toMatchObject({ total: 2, failed: 1 });
    expect(result.persistence).toMatchObject({ total: 2, failed: 1, fresh: 1 });
    expect(repository.checks).toHaveLength(2);
  });

  it('persists a completed target before the full report is returned', async () => {
    const repository = new InMemorySourceFreshnessRepository();
    const proof = decisionProof('succeeded');

    const result = await runAdmissionsSourceFreshness({
      checkedAt: new Date('2026-06-26T03:00:00.000Z'),
      proofRunner: async (options) => {
        await options.onResult?.({ proof, freshness: null });
        expect(repository.checks).toHaveLength(1);
        return reportForProofs([proof]);
      },
      repository,
    });

    expect(result.persistence).toMatchObject({ total: 1, fresh: 1 });
    expect(repository.checks).toHaveLength(1);
  });

  it('can dry-run a manual target without requiring database credentials', async () => {
    vi.stubEnv('DATABASE_URL', '');
    const proofRunner = vi.fn(async () => reportForProofs([decisionProof('succeeded')]));

    const result = await runAdmissionsSourceFreshness({
      dryRun: true,
      proofRunner,
      targetIds: ['tau-digital-sciences-live'],
    });

    expect(result.persistence).toBeNull();
    expect(proofRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        includeCapabilityMatrix: true,
        targetIds: ['tau-digital-sciences-live'],
      }),
    );
  });
});

function reportForProofs(proofs: AdmissionsSourceProof[]): AdmissionsLiveProofReport {
  return {
    summary: {
      total: proofs.length,
      exactReproduced: proofs.filter((proof) => proof.status === 'succeeded').length,
      partial: 0,
      blocked: 0,
      failed: proofs.filter((proof) => proof.status === 'failed').length,
    },
    results: proofs.map((proof) => ({
      proof,
      freshness: null,
    })),
  };
}

function decisionProof(status: AdmissionsSourceProof['status']): AdmissionsSourceProof {
  return {
    id: `tau-source-${status}`,
    institutionId: 'tau',
    institutionName: 'Tel Aviv University',
    officialUrl: 'https://go.tau.ac.il/graphql',
    adapterId: 'tau',
    capability: 'decision_capable',
    proofLevel: 'exact_official',
    status,
    sourceClass: 'api_static_json',
    reproducedFields: ['selectedScore', 'acceptanceThreshold'],
    normalizedPayload: {
      acceptanceThreshold: 700,
      selectedScore: 715,
    },
    limitations: [],
    nextAction: 'Review changed threshold before publication',
    errorReason: status === 'failed' ? 'Official endpoint timed out' : undefined,
  };
}
