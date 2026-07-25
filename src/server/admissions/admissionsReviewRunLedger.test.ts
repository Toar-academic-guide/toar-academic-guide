import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createAdmissionsReviewRunLedger,
  type AdmissionsReviewRunLedgerRepository,
  type AdmissionsReviewRunRecord,
} from './admissionsReviewRunLedger';
import { buildAdmissionsReviewRun } from './weeklyReviewRun';
import { FORMULA_BACKED_VERIFICATION_LEDGER } from '@/data/admissions/formulaBackedVerificationLedger';

const exactTauLedger = FORMULA_BACKED_VERIFICATION_LEDGER.map((entry) =>
  entry.pairId === 'tau_datascience__tau' ? { ...entry, state: 'exact' as const } : entry,
);

function run() {
  return buildAdmissionsReviewRun({
    runKey: '2026-W30',
    checkedAt: new Date('2026-07-19T03:00:00.000Z'),
    cycle: '2027',
    baseline: [
      {
        target: { institutionId: 'tau', programId: 'tau_datascience', cycle: '2027' },
        ruleKind: 'admission_cutoff' as const,
        value: 700,
      },
    ],
    proofs: [
      {
        id: 'tau-digital-sciences-live',
        institutionId: 'tau',
        institutionName: 'Tel Aviv University',
        officialUrl: 'https://go.tau.ac.il/graphql',
        adapterId: 'tau' as const,
        capability: 'decision_capable' as const,
        proofLevel: 'exact_official' as const,
        status: 'succeeded' as const,
        sourceClass: 'api_static_json' as const,
        reproducedFields: ['acceptanceThreshold'],
        normalizedPayload: { programId: 'tau_datascience', acceptanceThreshold: 695 },
        limitations: [],
        nextAction: 'Review changed threshold before publication',
      },
    ],
    verificationLedger: exactTauLedger,
  });
}

describe('admissions review run ledger', () => {
  it('upserts one stable weekly run and retains retryable Slack failure independently from its PR state', async () => {
    const repository = new MemoryAdmissionsReviewRunRepository();
    const ledger = createAdmissionsReviewRunLedger(repository);

    await ledger.recordPreparedRun(run());
    await ledger.recordPreparedRun(run());
    await ledger.recordPullRequest({
      runKey: '2026-W30',
      pullRequestNumber: 95,
      pullRequestUrl: 'https://github.com/Toar-academic-guide/toar-academic-guide/pull/95',
    });
    await ledger.recordSlackFailure({ runKey: '2026-W30', error: 'Slack 429' });

    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]).toMatchObject({
      status: 'reviewable',
      candidateCount: 1,
      pullRequestNumber: 95,
      slackStatus: 'failed',
      slackError: 'Slack 429',
    });

    await ledger.recordSlackSent({ runKey: '2026-W30' });
    expect(repository.records[0]).toMatchObject({ slackStatus: 'sent', slackError: null });
  });
});

class MemoryAdmissionsReviewRunRepository implements AdmissionsReviewRunLedgerRepository {
  records: AdmissionsReviewRunRecord[] = [];

  async find(runKey: string): Promise<AdmissionsReviewRunRecord | null> {
    return this.records.find((item) => item.runKey === runKey) ?? null;
  }

  async upsertPrepared(record: AdmissionsReviewRunRecord) {
    const existing = this.records.find((item) => item.runKey === record.runKey);
    if (existing) {
      Object.assign(existing, record, {
        pullRequestNumber: existing.pullRequestNumber,
        pullRequestUrl: existing.pullRequestUrl,
        slackStatus: existing.slackStatus,
        slackError: existing.slackError,
      });
      return;
    }
    this.records.push({ ...record });
  }

  async setPullRequest(input: {
    runKey: string;
    pullRequestNumber: number;
    pullRequestUrl: string;
  }) {
    const record = this.requireRecord(input.runKey);
    record.pullRequestNumber = input.pullRequestNumber;
    record.pullRequestUrl = input.pullRequestUrl;
  }

  async setSlackStatus(input: {
    runKey: string;
    slackStatus: 'sent' | 'failed';
    slackError: string | null;
  }) {
    const record = this.requireRecord(input.runKey);
    record.slackStatus = input.slackStatus;
    record.slackError = input.slackError;
  }

  private requireRecord(runKey: string) {
    const record = this.records.find((item) => item.runKey === runKey);
    if (!record) throw new Error(`Missing ${runKey}`);
    return record;
  }
}
